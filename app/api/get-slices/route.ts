import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

/**
 * GET /api/get-slices?code=XXXXX
 *
 * Called by the Roblox Studio MoFX plugin to retrieve the array of
 * Roblox Asset IDs stored against a temporary sync code.
 *
 * Success response:
 *   { "success": true, "name": "Synced_Preset", "frames": ["id1", "id2", ...] }
 *
 * Failure response:
 *   { "success": false, "error": "Invalid or expired sync code" }
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')?.trim()

  if (!code || !/^\d{4,6}$/.test(code)) {
    return NextResponse.json(
      { success: false, error: 'Invalid or expired sync code' },
      { status: 400 },
    )
  }

  try {
    const raw = await redis.get<string>(`sync:${code}`)

    if (!raw) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired sync code' },
        { status: 404 },
      )
    }

    // raw may come back as an already-parsed object from the Upstash client
    const payload =
      typeof raw === 'string' ? (JSON.parse(raw) as { name: string; frames: string[] }) : raw as { name: string; frames: string[] }

    return NextResponse.json(
      {
        success: true,
        name: payload.name ?? 'Synced_Preset',
        frames: payload.frames ?? [],
      },
      { status: 200 },
    )
  } catch (err) {
    console.error('[get-slices] Error:', err)
    return NextResponse.json(
      { success: false, error: 'Server error — please try again' },
      { status: 500 },
    )
  }
}
