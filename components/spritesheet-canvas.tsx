'use client'

import { useEffect, useRef } from 'react'

interface SpritesheetCanvasProps {
  imageSrc: string | null
  cols: number
  rows: number
  currentFrame: number
}

export function SpritesheetCanvas({
  imageSrc,
  cols,
  rows,
  currentFrame,
}: SpritesheetCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    if (!imageSrc) {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      return
    }

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imgRef.current = img
      draw()
    }
    img.src = imageSrc
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageSrc])

  useEffect(() => {
    if (imgRef.current) draw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cols, rows, currentFrame])

  function draw() {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img) return

    const MAX = 600
    const scale = Math.min(MAX / img.naturalWidth, MAX / img.naturalHeight, 1)
    canvas.width = img.naturalWidth * scale
    canvas.height = img.naturalHeight * scale

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    const fw = canvas.width / cols
    const fh = canvas.height / rows

    const activeCol = currentFrame % cols
    const activeRow = Math.floor(currentFrame / cols)

    // Draw active frame highlight
    ctx.save()
    ctx.fillStyle = 'rgba(0, 200, 180, 0.18)'
    ctx.strokeStyle = 'rgba(0, 220, 190, 0.9)'
    ctx.lineWidth = 1.5
    ctx.fillRect(activeCol * fw, activeRow * fh, fw, fh)
    ctx.strokeRect(activeCol * fw, activeRow * fh, fw, fh)
    ctx.restore()

    // Draw full grid
    ctx.save()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)'
    ctx.lineWidth = 0.8

    for (let c = 0; c <= cols; c++) {
      ctx.beginPath()
      ctx.moveTo(c * fw, 0)
      ctx.lineTo(c * fw, canvas.height)
      ctx.stroke()
    }
    for (let r = 0; r <= rows; r++) {
      ctx.beginPath()
      ctx.moveTo(0, r * fh)
      ctx.lineTo(canvas.width, r * fh)
      ctx.stroke()
    }
    ctx.restore()

    // Draw frame numbers
    ctx.save()
    ctx.font = `bold ${Math.max(10, Math.min(14, fw * 0.18))}px monospace`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c
        const x = c * fw
        const y = r * fh
        ctx.fillStyle = 'rgba(0,0,0,0.5)'
        ctx.fillText(String(idx), x + 3, y + 2)
        ctx.fillStyle =
          idx === currentFrame
            ? 'rgba(0, 240, 200, 1)'
            : 'rgba(255,255,255,0.5)'
        ctx.fillText(String(idx), x + 2, y + 1)
      }
    }
    ctx.restore()
  }

  return (
    <div className="flex items-center justify-center w-full h-full bg-[repeating-conic-gradient(oklch(0.17_0.018_240)_0%_25%,oklch(0.14_0.015_240)_0%_50%)] bg-[length:20px_20px] rounded-lg overflow-hidden">
      {imageSrc ? (
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-full object-contain"
          style={{ imageRendering: 'pixelated' }}
        />
      ) : (
        <div className="flex flex-col items-center gap-3 text-center p-8">
          <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-border flex items-center justify-center">
            <span className="text-2xl font-mono text-muted-foreground select-none">?</span>
          </div>
          <p className="text-sm text-muted-foreground max-w-[200px] text-balance">
            Upload a spritesheet to see the grid preview
          </p>
        </div>
      )}
    </div>
  )
}
