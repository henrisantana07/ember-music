'use client'

import { Button } from './Button'
import { MenuPanel, MenuItem, useMenu } from './Menu'

export interface SortOption<T extends string> {
  value: T
  label: string
}

interface SortMenuProps<T extends string> {
  options: SortOption<T>[]
  value: T
  onChange: (value: T) => void
  /** Prefix shown on the trigger, e.g. "Ordenar". */
  label?: string
  className?: string
}

/** M3 outlined button + menu with the active sort spelled out ("Ordenar: A-Z"). */
export function SortMenu<T extends string>({ options, value, onChange, label = 'Ordenar', className = '' }: SortMenuProps<T>) {
  const menu = useMenu()
  const current = options.find((o) => o.value === value)

  return (
    <div className={`relative inline-block ${className}`}>
      <Button
        variant="outlined"
        size="sm"
        aria-label={`${label}: ${current?.label ?? ''}. Alterar ordenação`}
        {...menu.triggerProps}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3" />
        </svg>
        {label}: {current?.label ?? '—'}
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </Button>

      {menu.open && (
        <MenuPanel {...menu.panelProps} align="right">
          {options.map((option) => (
            <MenuItem
              key={option.value}
              selected={option.value === value}
              onClick={() => {
                onChange(option.value)
                menu.close()
              }}
            >
              {option.label}
            </MenuItem>
          ))}
        </MenuPanel>
      )}
    </div>
  )
}
