'use client'

import { useCallback, useRef } from 'react'

export function Slider({
  value,
  onChange,
  min = 0,
  max = 12,
  step = 1,
  disabled,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
}) {
  const trackRef = useRef<HTMLDivElement>(null)

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled) return
      const rect = trackRef.current?.getBoundingClientRect()
      if (!rect) return
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      const steps = Math.round((pct * (max - min)) / step)
      onChange(min + steps * step)
    },
    [disabled, min, max, step, onChange],
  )

  const pct = ((value - min) / (max - min)) * 100

  return (
    <div
      ref={trackRef}
      onClick={handleClick}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      onKeyDown={(e) => {
        if (disabled) return
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
          onChange(Math.min(max, value + step))
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
          onChange(Math.max(min, value - step))
        }
      }}
      className="relative h-6 flex items-center cursor-pointer group"
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <div className="relative w-full h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, var(--accent-from), var(--accent-to))',
          }}
        />
      </div>
      <div
        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full shadow-md transition-transform group-hover:scale-110"
        style={{
          left: `calc(${pct}% - 8px)`,
          backgroundColor: 'var(--accent-to)',
          boxShadow: '0 0 4px rgba(0,0,0,0.3)',
        }}
      />
    </div>
  )
}
