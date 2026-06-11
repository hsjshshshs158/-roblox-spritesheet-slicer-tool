import { Jimp } from 'jimp'
import { NextRequest, NextResponse } from 'next/server'

const ROBLOX_ASSETS_URL = 'https://apis.roblox.com/assets/v1/assets'
const ROBLOX_CDN_URL = 'https://assetdelivery.roblox.com/v1/asset/?id='

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

interface SliceBody {
  assetId: string
  rows: number
  columns: number
}

function validateBody(body: unknown): body is SliceBody {
  if (!body || typeof body !== 'object') return false
  const b = body as Record<string, unknown>
  return (
    typeof b.assetId === 'string' &&
    b.assetId.trim().length > 0 &&
    typeof b.rows === 'number' &&
    b.rows >= 1 &&
    typeof b.columns === 'number' &&
    b.columns >= 1
  )
}

// ---------------------------------------------------------------------------
// Step 1 — Download spritesheet from Roblox CDN
// ---------------------------------------------------------------------------

async function downloadSpritesheet(assetId: string): Promise<Buffer> {
  const res = await fetch(`${ROBLOX_CDN_URL}${encodeURIComponent(assetId)}`, {
    headers: { 'User-Agent': 'MoFX-Slicer/1.0' },
  })

  if (!res.ok) {
    throw new Error(
      `Failed to download asset ${assetId}: ${res.status} ${res.statusText}`,
    )
  }

  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

// ---------------------------------------------------------------------------
// Step 2 — Slice the image into frame buffers using Jimp
// ---------------------------------------------------------------------------

async function sliceImage(
  imageBuffer: Buffer,
  rows: number,
  columns: number,
): Promise<Buffer[]> {
  const source = await Jimp.fromBuffer(imageBuffer)
  const totalWidth = source.width
  const totalHeight = source.height

  const frameWidth = Math.floor(totalWidth / columns)
  const frameHeight = Math.floor(totalHeight / rows)

  if (frameWidth < 1 || frameHeight < 1) {
    throw new Error(
      `Calculated frame size is too small (${frameWidth}x${frameHeight}). ` +
        `Check that rows/columns don't exceed the image dimensions.`,
    )
  }

  const frames: Buffer[] = []

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const x = col * frameWidth
      const y = row * frameHeight

      // Clone so the source is never mutated between iterations
      const frame = source.clone().crop({ x, y, w: frameWidth, h: frameHeight })
      const pngBuffer = await frame.getBuffer('image/png')
      frames.push(Buffer.from(pngBuffer))
    }
  }

  return frames
}

// ---------------------------------------------------------------------------
// Step 3 — Upload a single frame buffer to Roblox Open Cloud
// ---------------------------------------------------------------------------

async function uploadFrameToRoblox(
  buffer: Buffer,
  frameIndex: number,
): Promise<string> {
  const apiKey = process.env.ROBLOX_API_KEY
  const creatorId = process.env.ROBLOX_CREATOR_ID

  if (!apiKey || !creatorId) {
    throw new Error('Missing ROBLOX_API_KEY or ROBLOX_CREATOR_ID env vars')
  }

  const formData = new FormData()

  // Roblox Open Cloud requires the metadata as a plain JSON string
  // in a field named exactly "request".
  const requestMetadata = {
    assetType: 'Decal',
    displayName: 'MoFX_Frame',
    description: 'Automatic sliced frame via MoFX Slicer',
    creationContext: {
      creator: { userId: creatorId },
    },
  }
  formData.append('request', JSON.stringify(requestMetadata))

  // The binary file must be in a field named exactly "fileContent".
  formData.append(
    'fileContent',
    new Blob([buffer], { type: 'image/png' }),
    `frame_${String(frameIndex).padStart(3, '0')}.png`,
  )

  const res = await fetch(ROBLOX_ASSETS_URL, {
    method: 'POST',
    headers: { 'x-api-key': apiKey },
    body: formData,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(
      `Roblox API error on frame ${frameIndex}: ${res.status} — ${text}`,
    )
  }

  const json = await res.json()

  // Roblox returns an operation path like "operations/xxxx".
  // The resolved assetId lives at json.response.assetId once the operation
  // completes. We return whichever identifier is available so the plugin
  // can display or poll it.
  const assetId: string =
    json?.response?.assetId ??
    json?.assetId ??
    json?.path ??
    json?.operationId ??
    String(json)

  // Prefix with rbxassetid:// if it looks like a bare numeric ID
  if (/^\d+$/.test(assetId)) {
    return `rbxassetid://${assetId}`
  }

  return assetId
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    // Parse and validate JSON body
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { success: false, error: 'Request body must be valid JSON.' },
        { status: 400 },
      )
    }

    if (!validateBody(body)) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Invalid request body. Expected: { assetId: string, rows: number, columns: number }',
        },
        { status: 400 },
      )
    }

    const { assetId, rows, columns } = body

    // Step 1 — Download
    const imageBuffer = await downloadSpritesheet(assetId)

    // Step 2 — Slice
    const frameBuffers = await sliceImage(imageBuffer, rows, columns)

    // Step 3 — Upload frames to Roblox sequentially to respect rate limits
    const frames: string[] = []
    for (let i = 0; i < frameBuffers.length; i++) {
      const id = await uploadFrameToRoblox(frameBuffers[i], i)
      frames.push(id)
    }

    return NextResponse.json({ success: true, frames })
  } catch (err) {
    console.error('[api/slice] Error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
