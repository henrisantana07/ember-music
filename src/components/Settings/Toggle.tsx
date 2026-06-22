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
      className="relative inline-flex h-6 w-11 items-center rounded-full shrink-0 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2"
      style={{
        backgroundColor: checked ? undefined : 'var(--bg-elevated)',
        background: checked ? 'linear-gradient(135deg, var(--accent-from), var(--accent-to))' : undefined,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <span
        className="inline-block h-4 w-4 rounded-full transition-transform duration-200"
        style={{
          backgroundColor: 'var(--text-primary)',
          transform: checked ? 'translateX(22px)' : 'translateX(4px)',
        }}
      />
    </button>
  )
}
