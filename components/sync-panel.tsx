'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Copy, Check, RefreshCcw, Upload } from 'lucide-react'

type SyncState = 'idle' | 'uploading' | 'success' | 'error'

interface SyncPanelProps {
  frameCount: number
  onSync: () => Promise<{ code: string } | { error: string }>
  disabled: boolean
}

export function SyncPanel({ frameCount, onSync, disabled }: SyncPanelProps) {
  const [state, setState] = useState<SyncState>('idle')
  const [code, setCode] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleSync = async () => {
    if (disabled || state === 'uploading') return
    setState('uploading')
    setCode(null)
    setErrorMsg(null)
    setProgress(0)

    // Animate progress bar while waiting
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 8, 88))
    }, 400)

    try {
      const result = await onSync()
      clearInterval(interval)
      setProgress(100)

      if ('error' in result) {
        setErrorMsg(result.error)
        setState('error')
      } else {
        setCode(result.code)
        setState('success')
      }
    } catch (e) {
      clearInterval(interval)
      setErrorMsg(e instanceof Error ? e.message : 'Unknown error')
      setState('error')
    }
  }

  const copyCode = () => {
    if (!code) return
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const reset = () => {
    setState('idle')
    setCode(null)
    setErrorMsg(null)
    setProgress(0)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Main sync button */}
      <button
        onClick={handleSync}
        disabled={disabled || state === 'uploading'}
        className={cn(
          'relative flex items-center justify-center gap-2.5 h-11 w-full rounded-lg font-semibold text-sm transition-all overflow-hidden',
          'border border-teal/30 text-teal',
          disabled || state === 'uploading'
            ? 'opacity-50 cursor-not-allowed bg-teal-dim'
            : 'bg-teal-dim hover:bg-teal/20 hover:border-teal/60 hover:shadow-[0_0_16px_var(--teal-glow)] active:scale-[0.98]',
        )}
      >
        {state === 'uploading' ? (
          <>
            <RefreshCcw size={15} className="animate-spin" />
            Uploading {frameCount} frame{frameCount !== 1 ? 's' : ''}...
          </>
        ) : (
          <>
            <Upload size={15} />
            Sync to Roblox (Generate Code)
          </>
        )}
      </button>

      {/* Progress bar */}
      {state === 'uploading' && (
        <div className="h-1 rounded-full bg-surface-raised overflow-hidden">
          <div
            className="h-full bg-teal rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Success state */}
      {state === 'success' && code && (
        <div className="flex flex-col gap-3 rounded-xl border border-teal/30 bg-teal-dim p-4 teal-glow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-teal uppercase tracking-widest">
              Sync Code
            </span>
            <span className="text-xs text-muted-foreground">Expires in 15 min</span>
          </div>

          {/* Big code display */}
          <div className="flex items-center gap-3">
            <div className="flex-1 text-center py-3 rounded-lg bg-background border border-teal/20">
              <span className="text-3xl font-mono font-bold text-teal tracking-[0.25em]">
                {code}
              </span>
            </div>
            <button
              onClick={copyCode}
              title="Copy code"
              className="flex items-center justify-center w-10 h-10 rounded-lg border border-teal/30 bg-background text-teal hover:bg-teal-dim hover:border-teal/60 transition-all shrink-0"
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
            </button>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Enter this code in your Roblox Studio MoFX plugin to import{' '}
            <span className="text-foreground font-medium">{frameCount}</span> frame
            {frameCount !== 1 ? 's' : ''}.
          </p>

          <button
            onClick={reset}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors text-left"
          >
            Generate a new code
          </button>
        </div>
      )}

      {/* Error state */}
      {state === 'error' && errorMsg && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 p-4 flex flex-col gap-2">
          <p className="text-xs font-semibold text-danger uppercase tracking-wider">
            Sync Failed
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">{errorMsg}</p>
          <button
            onClick={reset}
            className="text-xs text-danger hover:text-foreground transition-colors text-left"
          >
            Try again
          </button>
        </div>
      )}

      {/* Idle helper text */}
      {state === 'idle' && (
        <p className="text-xs text-muted-foreground leading-relaxed">
          Uploads all {frameCount} frame{frameCount !== 1 ? 's' : ''} to Roblox Open Cloud
          as Decal assets and returns a short sync code for your Studio plugin.
        </p>
      )}
    </div>
  )
}
