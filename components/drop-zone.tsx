'use client'

import { useCallback, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { UploadCloud, ImageIcon } from 'lucide-react'

interface DropZoneProps {
  onFile: (file: File) => void
  hasFile: boolean
  fileName?: string
}

export function DropZone({ onFile, hasFile, fileName }: DropZoneProps) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) return
      onFile(file)
    },
    [onFile],
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={cn(
        'relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed cursor-pointer transition-all min-h-[140px] px-4 py-6 select-none',
        dragging
          ? 'border-teal bg-teal-dim scale-[1.01]'
          : hasFile
          ? 'border-teal/40 bg-teal-dim/50'
          : 'border-border hover:border-teal/40 hover:bg-teal-dim/30',
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />

      {hasFile ? (
        <>
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-teal/20 text-teal">
            <ImageIcon size={20} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-teal text-balance">
              {fileName}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Click or drag to replace
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-surface-raised text-muted-foreground">
            <UploadCloud size={20} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground text-balance">
              Drop a spritesheet here
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              PNG, JPG, or WebP — click to browse
            </p>
          </div>
        </>
      )}
    </div>
  )
}
