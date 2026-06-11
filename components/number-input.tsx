'use client'

import { cn } from '@/lib/utils'

interface NumberInputProps {
  label: string
  value: number
  min?: number
  max?: number
  onChange: (v: number) => void
  className?: string
}

export function NumberInput({
  label,
  value,
  min = 1,
  max = 64,
  onChange,
  className,
}: NumberInputProps) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n))

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
        {label}
      </label>
      <div className="flex items-center gap-0 h-9 rounded-lg border border-border bg-input overflow-hidden">
        <button
          type="button"
          onClick={() => onChange(clamp(value - 1))}
          className="w-9 h-full flex items-center justify-center text-muted-foreground hover:text-teal hover:bg-teal-dim transition-colors shrink-0"
        >
          <span className="text-base leading-none select-none">−</span>
        </button>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(clamp(parseInt(e.target.value) || min))}
          className="flex-1 h-full bg-transparent text-center text-sm font-mono text-foreground focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          type="button"
          onClick={() => onChange(clamp(value + 1))}
          className="w-9 h-full flex items-center justify-center text-muted-foreground hover:text-teal hover:bg-teal-dim transition-colors shrink-0"
        >
          <span className="text-base leading-none select-none">+</span>
        </button>
      </div>
    </div>
  )
}
