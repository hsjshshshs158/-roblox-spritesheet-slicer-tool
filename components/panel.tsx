'use client'

import { cn } from '@/lib/utils'

interface PanelProps {
  title?: string
  subtitle?: string
  children: React.ReactNode
  className?: string
  headerRight?: React.ReactNode
}

export function Panel({
  title,
  subtitle,
  children,
  className,
  headerRight,
}: PanelProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-surface flex flex-col overflow-hidden',
        className,
      )}
    >
      {(title || headerRight) && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
          <div>
            {title && (
              <h2 className="text-sm font-semibold text-foreground tracking-wide">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
          {headerRight && <div className="shrink-0">{headerRight}</div>}
        </div>
      )}
      <div className="flex-1 p-4">{children}</div>
    </div>
  )
}
