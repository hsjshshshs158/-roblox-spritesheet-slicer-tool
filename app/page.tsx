'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Panel } from '@/components/panel'
import { DropZone } from '@/components/drop-zone'
import { NumberInput } from '@/components/number-input'
import { FpsSlider } from '@/components/fps-slider'
import { SpritesheetCanvas } from '@/components/spritesheet-canvas'
import { SyncPanel } from '@/components/sync-panel'
import { sliceToBlobs, downloadAsZip } from '@/lib/slice-utils'
import { Play, Pause, SkipBack, Download, Grid2x2, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Home() {
  // Image state
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string>('')

  // Grid config
  const [cols, setCols] = useState(4)
  const [rows, setRows] = useState(4)

  // Playback
  const [fps, setFps] = useState(12)
  const [playing, setPlaying] = useState(false)
  const [currentFrame, setCurrentFrame] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const frameCount = cols * rows

  // Handle file upload
  const handleFile = useCallback((file: File) => {
    const url = URL.createObjectURL(file)
    setImageSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return url
    })
    setFileName(file.name)
    setCurrentFrame(0)
    setPlaying(false)
  }, [])

  // Playback loop
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (playing) {
      intervalRef.current = setInterval(() => {
        setCurrentFrame((f) => (f + 1) % frameCount)
      }, 1000 / fps)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [playing, fps, frameCount])

  // Clamp frame when grid changes
  useEffect(() => {
    setCurrentFrame((f) => Math.min(f, frameCount - 1))
  }, [frameCount])

  const togglePlay = () => setPlaying((p) => !p)
  const resetFrame = () => {
    setCurrentFrame(0)
    setPlaying(false)
  }

  // Download ZIP
  const [downloading, setDownloading] = useState(false)
  const handleDownload = async () => {
    if (!imageSrc || downloading) return
    setDownloading(true)
    try {
      const blobs = await sliceToBlobs(imageSrc, cols, rows)
      await downloadAsZip(
        blobs,
        fileName.replace(/\.[^.]+$/, '') || 'spritesheet',
      )
    } finally {
      setDownloading(false)
    }
  }

  // Sync to Roblox
  const handleSync = async () => {
    if (!imageSrc) throw new Error('No spritesheet loaded')
    const blobs = await sliceToBlobs(imageSrc, cols, rows)

    const formData = new FormData()
    blobs.forEach((blob, i) => {
      formData.append(
        'frames',
        blob,
        `frame_${String(i).padStart(3, '0')}.png`,
      )
    })

    const res = await fetch('/api/sync', { method: 'POST', body: formData })
    const data = await res.json()

    if (!res.ok || data.error) {
      throw new Error(data.error ?? `Server error ${res.status}`)
    }
    return { code: String(data.code) }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-dim border border-teal/30">
            <Grid2x2 size={16} className="text-teal" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground tracking-wide">
              MoFX Spritesheet Slicer
            </h1>
            <p className="text-[11px] text-muted-foreground">
              Roblox Open Cloud Sync Tool
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
          <Layers size={13} />
          <span>
            {frameCount} frame{frameCount !== 1 ? 's' : ''} &middot; {cols}
            &times;{rows} grid
          </span>
        </div>
      </header>

      {/* Three-column layout */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[280px_1fr_300px] gap-4 p-4 w-full max-w-[1440px] mx-auto">
        {/* ── LEFT COLUMN — Upload & Config ── */}
        <div className="flex flex-col gap-4">
          {/* Upload */}
          <Panel title="Spritesheet" subtitle="Upload source image">
            <DropZone
              onFile={handleFile}
              hasFile={!!imageSrc}
              fileName={fileName}
            />
          </Panel>

          {/* Grid Config */}
          <Panel title="Slice Grid" subtitle="Define the frame layout">
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <NumberInput
                  label="Columns"
                  value={cols}
                  min={1}
                  max={32}
                  onChange={setCols}
                />
                <NumberInput
                  label="Rows"
                  value={rows}
                  min={1}
                  max={32}
                  onChange={setRows}
                />
              </div>
              <div className="rounded-lg bg-surface-raised border border-border px-3 py-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Total frames
                </span>
                <span className="text-sm font-mono font-semibold text-teal">
                  {frameCount}
                </span>
              </div>
            </div>
          </Panel>

          {/* Playback Controls */}
          <Panel
            title="Animation Preview"
            subtitle="Preview frame playback"
            headerRight={
              <span className="text-xs font-mono text-muted-foreground tabular-nums">
                {currentFrame + 1}&nbsp;/&nbsp;{frameCount}
              </span>
            }
          >
            <div className="flex flex-col gap-4">
              <FpsSlider value={fps} onChange={setFps} />

              {/* Play / Pause / Reset */}
              <div className="flex items-center gap-2">
                <button
                  onClick={resetFrame}
                  title="Reset to first frame"
                  className="flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-surface-raised text-muted-foreground hover:text-foreground hover:border-teal/30 transition-colors"
                >
                  <SkipBack size={14} />
                </button>
                <button
                  onClick={togglePlay}
                  disabled={!imageSrc}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 h-9 rounded-lg font-semibold text-sm transition-all',
                    imageSrc
                      ? playing
                        ? 'bg-teal/20 border border-teal/40 text-teal hover:bg-teal/30'
                        : 'bg-teal-dim border border-teal/30 text-teal hover:bg-teal/20 hover:border-teal/60'
                      : 'bg-surface-raised border border-border text-muted-foreground cursor-not-allowed opacity-50',
                  )}
                >
                  {playing ? <Pause size={14} /> : <Play size={14} />}
                  {playing ? 'Pause' : 'Play'}
                </button>
              </div>

              {/* Frame scrubber */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                  <span>Frame scrubber</span>
                  <span>{currentFrame}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, frameCount - 1)}
                  value={currentFrame}
                  onChange={(e) => {
                    setCurrentFrame(Number(e.target.value))
                    setPlaying(false)
                  }}
                  className="
                    w-full h-1.5 rounded-full appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:w-3
                    [&::-webkit-slider-thumb]:h-3
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:bg-teal
                    [&::-webkit-slider-thumb]:cursor-pointer
                    [&::-moz-range-thumb]:w-3
                    [&::-moz-range-thumb]:h-3
                    [&::-moz-range-thumb]:rounded-full
                    [&::-moz-range-thumb]:bg-teal
                    [&::-moz-range-thumb]:border-0
                  "
                  style={{
                    background:
                      frameCount > 1
                        ? `linear-gradient(to right, var(--teal) 0%, var(--teal) ${(currentFrame / (frameCount - 1)) * 100}%, oklch(0.22 0.018 240) ${(currentFrame / (frameCount - 1)) * 100}%, oklch(0.22 0.018 240) 100%)`
                        : 'var(--teal)',
                  }}
                />
              </div>
            </div>
          </Panel>
        </div>

        {/* ── MIDDLE COLUMN — Visual Editor ── */}
        <Panel
          title="Visual Editor"
          subtitle="Spritesheet grid preview with active frame highlight"
          className="min-h-[480px] lg:min-h-0"
          headerRight={
            imageSrc ? (
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-teal">
                <span className="w-2 h-2 rounded-full bg-teal animate-pulse" />
                Live
              </div>
            ) : undefined
          }
        >
          <div className="h-full min-h-[400px] flex items-center justify-center">
            <SpritesheetCanvas
              imageSrc={imageSrc}
              cols={cols}
              rows={rows}
              currentFrame={currentFrame}
            />
          </div>
        </Panel>

        {/* ── RIGHT COLUMN — Export & Sync ── */}
        <div className="flex flex-col gap-4">
          {/* Download ZIP */}
          <Panel title="Export Frames" subtitle="Download as individual PNG files">
            <div className="flex flex-col gap-3">
              <button
                onClick={handleDownload}
                disabled={!imageSrc || downloading}
                className={cn(
                  'flex items-center justify-center gap-2.5 h-10 w-full rounded-lg font-semibold text-sm transition-all border',
                  imageSrc && !downloading
                    ? 'border-border bg-surface-raised text-foreground hover:border-teal/30 hover:text-teal hover:bg-teal-dim active:scale-[0.98]'
                    : 'border-border bg-surface-raised text-muted-foreground opacity-50 cursor-not-allowed',
                )}
              >
                <Download size={14} />
                {downloading ? 'Packing ZIP...' : 'Download Sliced Frames'}
              </button>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Packs all {frameCount} frame{frameCount !== 1 ? 's' : ''} as
                individual PNGs into a single .zip — entirely client-side.
              </p>
            </div>
          </Panel>

          {/* Roblox Sync */}
          <Panel
            title="Sync to Roblox"
            subtitle="Upload frames via Open Cloud API"
          >
            <SyncPanel
              frameCount={frameCount}
              onSync={handleSync}
              disabled={!imageSrc}
            />
          </Panel>

          {/* Studio plugin steps */}
          <Panel title="Studio Plugin Usage">
            <ol className="flex flex-col gap-2.5 text-xs text-muted-foreground leading-relaxed list-none">
              {[
                'Upload your spritesheet and configure the slice grid.',
                'Click "Sync to Roblox" to upload frames and get a code.',
                'Open the MoFX plugin in Roblox Studio.',
                'Enter the sync code to import all frames as Decals.',
                'The code expires after 15 minutes.',
              ].map((step, i) => (
                <li key={i} className="flex gap-2.5 items-start">
                  <span className="flex-none flex items-center justify-center w-4 h-4 rounded bg-teal-dim text-teal text-[10px] font-bold font-mono mt-0.5">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </Panel>

          {/* API reference */}
          <Panel title="Plugin API Endpoint">
            <div className="flex flex-col gap-2">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your Studio plugin calls:
              </p>
              <code className="block rounded-lg bg-background border border-border px-3 py-2.5 text-[11px] font-mono text-teal break-all leading-relaxed">
                GET /api/get-slices?code=XXXX
              </code>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Returns a JSON array of Roblox Asset IDs for each synced frame.
              </p>
            </div>
          </Panel>
        </div>
      </main>
    </div>
  )
}
