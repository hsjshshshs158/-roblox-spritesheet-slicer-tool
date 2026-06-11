import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

const ROBLOX_ASSETS_URL = 'https://apis.roblox.com/assets/v1/assets'
const TTL_SECONDS = 15 * 60 // 15 minutes

/** Upload a single frame buffer to Roblox Open Cloud as a Decal asset.
 *  Returns the operation name / asset ID string on success. */
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
  // in a field named exactly "request" (not a Blob, not application/json).
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
    headers: {
      'x-api-key': apiKey,
    },
    body: formData,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(
      `Roblox API error on frame ${frameIndex}: ${res.status} — ${text}`,
    )
  }

  const json = await res.json()
  // The API returns an operation object; the assetId is nested under response
  // or at the top level depending on the asset type.
  // We store the full operation path so the plugin can resolve it if needed.
  const assetId: string =
    json?.response?.assetId ??
    json?.assetId ??
    json?.operationId ??
    json?.path ??
    String(json)

  return assetId
}

/** Generate a random numeric code of the given digit length. */
function generateSyncCode(digits = 5): string {
  const min = Math.pow(10, digits - 1)
  const max = Math.pow(10, digits) - 1
  return String(Math.floor(Math.random() * (max - min + 1)) + min)
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const frames = formData.getAll('frames') as File[]

    if (!frames || frames.length === 0) {
      return NextResponse.json(
        { error: 'No frames received. Include at least one file under the "frames" field.' },
        { status: 400 },
      )
    }

    // Upload all frames to Roblox in sequence to avoid rate-limiting
    const assetIds: string[] = []
    for (let i = 0; i < frames.length; i++) {
      const file = frames[i]
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const assetId = await uploadFrameToRoblox(buffer, i)
      assetIds.push(assetId)
    }

    // Generate a unique sync code and store in Redis with a TTL
    let code: string
    let attempts = 0
    do {
      code = generateSyncCode(5)
      const exists = await redis.exists(`sync:${code}`)
      if (!exists) break
      attempts++
    } while (attempts < 10)

    await redis.set(
      `sync:${code}`,
      JSON.stringify({ name: 'Synced_Preset', frames: assetIds }),
      { ex: TTL_SECONDS },
    )

    return NextResponse.json({ success: true, code, frameCount: assetIds.length })
  } catch (err) {
    console.error('[sync] Error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
