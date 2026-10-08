'use client'

import type { ReactNode } from 'react'

/** M3 search bar: leading icon, filled container, optional trailing actions. */
export function SearchBar({
  value,
  onChange,
  placeholder = 'Buscar',
  leadingIcon,
  trailing,
  className = '',
  inputRef,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  leadingIcon?: ReactNode
  trailing?: ReactNode
  className?: string
  inputRef?: React.RefObject<HTMLInputElement | null>
}) {
  return (
    <div
      className={`flex items-center gap-2 h-12 px-4 rounded-full bg-surface-container-highest ${className}`}
      role="search"
    >
      <span className="text-[var(--text-secondary)] flex-shrink-0" aria-hidden="true">
        {leadingIcon ?? (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
          </svg>
        )}
      </span>
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="flex-1 bg-transparent outline-none text-body-large placeholder:text-[var(--text-disabled)]"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Limpar busca"
          className="p-1 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] state-layer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
      {trailing}
    </div>
  )
}

/** M3 list control toolbar: optional search + right-aligned controls (sort, view, actions). */
export function ControlToolbar({
  search,
  sort,
  view,
  actions,
  className = '',
}: {
  search?: ReactNode
  sort?: ReactNode
  view?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`} role="toolbar" aria-label="Controles da lista">
      {search && <div className="flex-1 min-w-[220px]">{search}</div>}
      <div className="flex items-center gap-2 ml-auto">
        {sort}
        {view}
        {actions}
      </div>
    </div>
  )
}
