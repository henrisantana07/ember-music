'use client'

import { useState } from 'react'

interface AccordionItem {
  id: string
  title: string
  content: React.ReactNode
}

interface AccordionProps {
  items: AccordionItem[]
  allowMultiple?: boolean
}

export function Accordion({ items, allowMultiple = false }: AccordionProps) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        if (!allowMultiple) next.clear()
        next.add(id)
      }
      return next
    })
  }

  if (items.length === 0) return null

  return (
    <div className="space-y-2" role="region" aria-label="Perguntas frequentes">
      {items.map((item) => {
        const isOpen = openIds.has(item.id)
        return (
          <div
            key={item.id}
            className="rounded-xl overflow-hidden transition-colors"
            style={{ backgroundColor: 'var(--bg-surface)' }}
          >
            <button
              onClick={() => toggle(item.id)}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-white/5"
              style={{ minHeight: 'var(--min-touch)' }}
              aria-expanded={isOpen}
              aria-controls={`accordion-content-${item.id}`}
            >
              <span className="font-semibold text-sm md:text-base pr-4">{item.title}</span>
              <svg
                className="w-4 h-4 flex-shrink-0 transition-transform duration-200"
                style={{
                  transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  color: 'var(--text-secondary)',
                }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div
              id={`accordion-content-${item.id}`}
              role="region"
              className="overflow-hidden transition-all duration-200"
              style={{
                maxHeight: isOpen ? '300px' : '0px',
                opacity: isOpen ? 1 : 0,
              }}
            >
              <div className="px-4 pb-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                {item.content}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
