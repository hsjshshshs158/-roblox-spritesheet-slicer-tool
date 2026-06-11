'use client'

interface FpsSliderProps {
  value: number
  onChange: (v: number) => void
}

export function FpsSlider({ value, onChange }: FpsSliderProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
          FPS
        </label>
        <span className="text-xs font-mono font-semibold text-teal tabular-nums">
          {value}
        </span>
      </div>
      <div className="relative flex items-center h-5">
        <input
          type="range"
          min={1}
          max={60}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="
            w-full h-1.5 rounded-full appearance-none cursor-pointer
            bg-surface-raised
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-3.5
            [&::-webkit-slider-thumb]:h-3.5
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-teal
            [&::-webkit-slider-thumb]:shadow-[0_0_8px_var(--teal-glow)]
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb:active]:scale-125
            [&::-moz-range-thumb]:w-3.5
            [&::-moz-range-thumb]:h-3.5
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-teal
            [&::-moz-range-thumb]:border-0
            [&::-moz-range-thumb]:cursor-pointer
          "
          style={{
            background: `linear-gradient(to right, var(--teal) 0%, var(--teal) ${((value - 1) / 59) * 100}%, oklch(0.22 0.018 240) ${((value - 1) / 59) * 100}%, oklch(0.22 0.018 240) 100%)`,
          }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
        <span>1</span>
        <span>30</span>
        <span>60</span>
      </div>
    </div>
  )
}
