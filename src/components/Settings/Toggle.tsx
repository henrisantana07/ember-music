'use client'

export function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative inline-flex items-center p-3 shrink-0 rounded-full transition-colors duration-200 state-layer"
      style={{
        backgroundColor: checked ? undefined : 'var(--bg-elevated)',
        background: checked ? 'linear-gradient(135deg, var(--accent-from), var(--accent-to))' : undefined,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <span className="relative block h-8 w-[52px] rounded-full">
        <span
          className="absolute left-1 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full transition-transform duration-200 shadow-elevation-1"
          style={{
            backgroundColor: checked ? 'var(--bg-base)' : 'var(--text-disabled)',
            transform: checked ? 'translateX(20px)' : 'translateX(0)',
          }}
        />
      </span>
    </button>
  )
}
