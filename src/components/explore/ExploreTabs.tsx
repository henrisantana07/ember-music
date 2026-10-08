'use client'

interface TabCounts {
  total: number
  tracks: number
  artists: number
  albums: number
  youtube: number
}

interface ExploreTabsProps {
  activeTab: string
  onTabChange: (tab: string) => void
  counts: TabCounts
}

const TABS = ['tudo', 'faixas', 'artistas', 'albuns', 'youtube'] as const

const TAB_LABELS: Record<string, (count: number) => string> = {
  tudo: () => 'Tudo',
  faixas: (c) => `Faixas (${c})`,
  artistas: (c) => `Artistas (${c})`,
  albuns: (c) => `Álbuns (${c})`,
  youtube: (c) => `YouTube (${c})`,
}

const TAB_COUNT_KEYS: Record<string, keyof TabCounts> = {
  tudo: 'total',
  faixas: 'tracks',
  artistas: 'artists',
  albuns: 'albums',
  youtube: 'youtube',
}

export function ExploreTabs({ activeTab, onTabChange, counts }: ExploreTabsProps) {
  return (
    <div role="tablist" aria-label="Categorias de resultado" className="flex gap-0 border-b border-outline-variant overflow-x-auto hide-scrollbar">
      {TABS.map((tab) => {
        const isActive = activeTab === tab
        const countKey = TAB_COUNT_KEYS[tab]
        const count = counts[countKey]
        return (
          <button
            key={tab}
            role="tab"
            id={`explore-tab-${tab}`}
            aria-selected={isActive}
            aria-controls={`explore-panel-${tab}`}
            onClick={() => onTabChange(tab)}
            className={`relative px-5 min-h-[48px] text-body-large font-semibold whitespace-nowrap transition-colors state-layer ${
              isActive ? '' : 'hover:text-on-surface'
            }`}
            style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}
          >
            {TAB_LABELS[tab](count)}
            {isActive && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-[3px] rounded-full" style={{ backgroundColor: 'var(--accent-solid)' }} />
            )}
          </button>
        )
      })}
    </div>
  )
}
