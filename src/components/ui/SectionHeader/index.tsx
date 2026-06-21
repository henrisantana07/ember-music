'use client'

interface SectionHeaderProps {
  title: string
  subtitle?: string
  action?: { label: string; href?: string; onClick?: () => void }
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="flex items-end justify-between mb-4 gap-4">
      <div className="min-w-0">
        <h2 className="text-lg md:text-xl font-bold truncate">{title}</h2>
        {subtitle && (
          <p className="text-sm mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="flex-shrink-0 text-sm font-semibold transition-colors hover:underline whitespace-nowrap"
          style={{ color: 'var(--text-secondary)', minHeight: 'var(--min-touch)' }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
