'use client'

interface TabCounts {
  total: number
  tracks: number
  artists: number
  albums: number
}

interface ExploreTabsProps {
  activeTab: string
  onTabChange: (tab: string) => void
  counts: TabCounts
}

const TABS = ['tudo', 'faixas', 'artistas', 'albuns'] as const

const TAB_LABELS: Record<string, (count: number) => string> = {
  tudo: () => 'Tudo',
  faixas: (c) => `Faixas (${c})`,
  artistas: (c) => `Artistas (${c})`,
  albuns: (c) => `Álbuns (${c})`,
}

const TAB_COUNT_KEYS: Record<string, keyof TabCounts> = {
  tudo: 'total',
  faixas: 'tracks',
  artistas: 'artists',
  albuns: 'albums',
}

export function ExploreTabs({ activeTab, onTabChange, counts }: ExploreTabsProps) {
  return (
    <div className="flex gap-0 border-b border-white/10 overflow-x-auto hide-scrollbar">
      {TABS.map((tab) => {
        const isActive = activeTab === tab
        const countKey = TAB_COUNT_KEYS[tab]
        const count = counts[countKey]
        return (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`relative px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${
              isActive ? '' : 'hover:text-white/80'
            }`}
            style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}
          >
            {TAB_LABELS[tab](count)}
            {isActive && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full" style={{ backgroundColor: 'var(--accent-solid)' }} />
            )}
          </button>
        )
      })}
    </div>
  )
}
