// src/components/ui/ClassificationMenu.tsx
'use client'

import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import type { LibrarySort, LibraryView } from '@/lib/library/types'

export type SortOption = 'recent' | 'added' | 'alphabetical' | 'creator' | 'custom'
export type ViewOption = 'compact' | 'list' | 'grid' | 'expand'

export interface ClassificationMenuProps {
  sort: LibrarySort
  view: LibraryView
  onSortChange: (sort: Exclude<SortOption, 'custom'>) => void
  onViewChange: (view: Exclude<ViewOption, 'expand'>) => void
}

const SORT_ITEMS: readonly { id: SortOption; label: string; disabled: boolean }[] = [
  { id: 'recent', label: 'Recentes', disabled: false },
  { id: 'added', label: 'Adicionados recentemente', disabled: false },
  { id: 'alphabetical', label: 'Ordem alfabética', disabled: false },
  { id: 'creator', label: 'Criador', disabled: false },
  { id: 'custom', label: 'Ordem personalizada', disabled: true },
]

const VIEW_ITEMS: readonly { id: ViewOption; title: string; icon: ReactNode; disabled: boolean }[] = [
  { id: 'compact', title: 'Compact', icon: (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>), disabled: false },
  { id: 'list', title: 'Lista detalhada', icon: (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" /></svg>), disabled: false },
  { id: 'grid', title: 'Grade compacta', icon: (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" /></svg>), disabled: false },
  { id: 'expand', title: 'Grade expandida', icon: (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4h9v4H4zM4 10h16v10H4zM20 4h-5v4h5z" /></svg>), disabled: true },
]

export function ClassificationMenu({ sort, view, onSortChange, onViewChange }: ClassificationMenuProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    const el = detailsRef.current
    if (!el) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && el?.open) {
        el.removeAttribute('open')
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  function close() {
    detailsRef.current?.removeAttribute('open')
  }

  const summaryIcon = view === 'compact'
    ? (<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>)
    : view === 'list'
    ? (<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" /></svg>)
    : (<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" /></svg>)

  return (
    <details ref={detailsRef} className="group relative" aria-label="Classificação e visualização">
      <summary
        className={
          'h-10 w-10 inline-flex items-center justify-center rounded-full cursor-pointer select-none ' +
          'list-none [&::-webkit-details-marker]:hidden ' +
          'text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors ' +
          'state-layer hover:bg-[var(--surface-container-highest)]'
        }
        title="Classificar por & Ver como"
        aria-label="Abrir classificação e visualização"
      >
        {summaryIcon}
        <svg
          className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 flex-shrink-0 transition-transform duration-200 group-open:rotate-180 text-[var(--text-secondary)]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      <div
        className="absolute top-full right-0 mt-1 rounded-xl shadow-elevation-2 py-1 z-[70] border border-outline-variant overflow-hidden"
        style={{ backgroundColor: '#121212', transformOrigin: 'top right', width: '220px' }}
        role="menu"
      >
        <div className="px-3 pt-2 pb-1 text-label-small uppercase tracking-widest" style={{ color: 'var(--text-disabled)' }}>Classificar por</div>
        <div className="flex flex-col">
          {SORT_ITEMS.map((item) => {
            const active = item.id === sort
            return (
              <button
                type="button"
                key={item.id}
                disabled={item.id === 'custom' || false}
                onClick={() => {
                  if (!item.disabled) {
                    onSortChange(item.id as Exclude<SortOption, 'custom'>)
                    close()
                  }
                }}
                className={
                  `w-full min-h-[36px] inline-flex items-center gap-2 px-3 text-left ` +
                  `transition-colors duration-200 rounded-md ` +
                  (active
                    ? 'bg-state-hover text-[#4ade80] font-semibold'
                    : item.disabled
                    ? 'text-[var(--text-disabled)] cursor-not-allowed opacity-60'
                    : 'text-[var(--text-secondary)] hover:bg-state-hover hover:text-[var(--text-primary)]')
                }
              >
                <span className="flex-1 truncate text-label-large">{item.label}</span>
                {active && (
                  <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{ color: '#4ade80' }} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
        <div className="h-px my-1 mx-2" aria-hidden="true" style={{ backgroundColor: 'var(--outline-variant)' }} />
        <div className="px-3 pt-1 pb-1 text-label-small uppercase tracking-widest" style={{ color: 'var(--text-disabled)' }}>Ver como</div>
        <div className="grid grid-cols-4 gap-1 px-2 pb-1">
          {VIEW_ITEMS.filter((item) => !item.disabled).map((option) => {
            const active = option.id === view
            return (
              <button
                type="button"
                key={option.id}
                onClick={() => {
                  onViewChange(option.id as Exclude<ViewOption, 'expand'>)
                  close()
                }}
                className={
                  `min-h-[34px] inline-flex items-center justify-center rounded-md transition-colors duration-200 ` +
                  (active
                    ? 'bg-state-hover text-[#4ade80] font-semibold'
                    : 'text-[var(--text-secondary)] hover:bg-state-hover hover:text-[var(--text-primary)]')
                }
                aria-label={option.title}
              >
                {option.icon}
              </button>
            )
          })}
          {VIEW_ITEMS.filter((item) => item.disabled).map((option) => (
            <button
              key={option.id}
              type="button"
              disabled
              aria-label={option.title + ' (em breve)'}
              className="min-h-[34px] inline-flex items-center justify-center rounded-md text-[var(--text-disabled)] cursor-not-allowed"
            >
              {option.icon}
            </button>
          ))}
        </div>
      </div>
    </details>
  )
}