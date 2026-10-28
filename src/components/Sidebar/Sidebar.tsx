'use client'

import { useEffect, useState } from 'react'
import { SidebarItem, SidebarProfileMenuItem, SidebarSectionBase, SidebarData } from '@/components/Sidebar/types'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

// Import the JSON - o caminho pode variar conforme a estrutura do seu projeto
import rawData from '@/data/sidebar.json'

// Transform raw JSON typed data (we'll do a simple cast for now)
const data: SidebarData = rawData as unknown as SidebarData

export function Sidebar() {
  const router = useRouter()
  const [mode, setMode] = useState<'expanded' | 'collapsed'>('expanded')

  // Renderizar o profile menu do header
  const renderProfileMenu = () => {
    return (
      <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
        {data.header.profileMenu.items.map((item) => (
          <a
            key={item.label}
            href={item.href}
            className={item.danger
              ? "text-[var(--error)] hover:underline"
              : "hover:text-[var(--accent-from)] transition-colors"}
            >
              {item.icon && <Image src={`/icons/${item.icon}.svg`} alt={item.label} width={16} height={16} />}
              {item.label}
            </a>
        ))}
      </div>
    )
  }

  // Renderizar itens de navegação principal
  const renderMainNav = () => {
    return (
      <nav className="flex-1 space-y-1">
        {data.sections.filter((s) => s.type === 'navigation')[0]?.items.map((item) => (
          <button
            key={item.label}
            onClick={() => router.push(item.href)}
            className={`flex items-center gap-2 py-2 px-3 rounded-lg text-sm hover:bg-[var(--bg-elevated)] transition-colors ${
              item.active ? 'bg-[var(--accent-solid)] text-[var(--text-on-accent)]' : ''
            }`}
            aria-current={item.label === 'Biblioteca' ? 'page' : undefined}
          >
            {item.icon && (
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 3v4M3 5h4M6 17v4m4-9v4m10 7h4m-4-9h4m-5 9h4m9 5a2 2 0 012 2v4a2 2 0 01-2 2h-4a2 2 0 01-2-2v-4a2 2 0 012-2zm0 7a2 2 0 012 2v4a2 2 0 01-2 2h-4a2 2 0 01-2-2v-4a2 2 0 012-2z"
                />
              </svg>
            )}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    )
  }

  // Renderizar section de filtros
  const renderFiltersSection = () => {
    const filtersSection = data.sections.find(
      (s) => s.type === 'filters'
    ) as SidebarFiltersSection | undefined
    if (!filtersSection) return null

    return (
      <section className="p-4 border-b border-[var(--border)]">
        <h2 className="text-sm font-medium uppercase tracking-wider mb-4 text-[var(--text-disabled)]">
          Filtros
        </h2>

        <div className="space-y-3">
          {/* Tipo de conteúdo - seleção um por vez */}
          <div>
            <label className="block text-xs font-medium mb-1 text-[var(--text-disabled)]">
              Tipo
            </label>
            <div className="flex flex-wrap gap-2">
              {filtersSection.content.tipo_de_conteudo.opcoes.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setActiveFilter(opt.id)}
                  className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs transition-colors ${
                    activeFilter === opt.id
                      ? 'bg-[var(--accent-solid)] text-[var(--text-on-accent)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'}
                  }>
                    <span className="w-1 h-1 rounded-full" />
                    <span>{opt.rotulo}</span>
                    {opt.observacao && (
                      <span className="text-[0.65em] ml-1 text-[var(--text-disabled)]">
                        {opt.observacao}
                      </span>
                    )}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Subfiltros combináveis */}
          {filtersSection.content.subfiltros_combinaveis.opcoes.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setActiveFilter(opt.id)}
              className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs transition-colors ${
                activeFilter === opt.id
                  ? 'bg-[var(--accent-solid)] text-[var(--text-on-accent)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'}
              }>
                <span className="w-1 h-1 rounded-full" />
                <span>{opt.rotulo}</span>
              </button>
            )
          ))}
        </div>
      </section>
    )
  }

  // Renderizar section de ordenação
  const renderOrdenacaoSection = () => {
    const sortSection = data.sections.find(
      (s) => s.type === 'ordenacao'
    ) as SidebarOrdenacaoSection | undefined
    if (!sortSection) return null

    return (
      <section className="p-4 border-b border-[var(--border)]">
        <h2 className="text-sm font-medium uppercase tracking-wider mb-4 text-[var(--text-disabled)]">
          Ordenar
        </h2>

        <div className="space-y-3">
          {/* Controle de dispositivo */}
          <p className="text-xs text-[var(--text-disabled)] mb-2">
            {sortSection.content.controle.desktop}{' '}
            {/(?=[^\s]*\s)/.test(sortSection.content.controle.desktop) && (
              <span>•</span>
            )}{' '}
            {sortSection.content.controle['mobile_e_tablet']}
          </p>

          {/* Opções gerais */}
          {sortSection.content.opcoes_gerais.map((opt) => (
            <div
              key={opt.id}
              onClick={() => setActiveSort(opt.id)}
              className={`cursor-pointer px-3 py-1 rounded-full text-xs transition-colors ${
                activeSort === opt.id
                  ? 'bg-[var(--accent-solid)] text-[var(--text-on-accent)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'}
              }>
                <span>{opt.rotulo}</span>
                {opt.descricao && (
                  <span className="text-[0.65em] ml-1 text-[var(--text-disabled)]">
                    {opt.descricao}
                  </span>
                )}
              </div>
            ))}

          {/* Opções condicionais */}
          {sortSection.content.opcoes_condicionais.map((opt) => (
            <div
              key={opt.id}
              style={{ display: activeSort === opt.aparece_quando ? 'block' : 'none' }}
              className="mt-2 px-3 py-1 rounded-full text-xs transition-colors"
            >
              <span className="font-medium">{opt.rotulo}</span>
              <span className="text-[0.65em] ml-1 text-[var(--text-disabled)]">
                {opt.efeito}
              </span>
            </div>
          ))}
        </div>
      </section>
    )
  }

  // Renderizar section de modos de visualização
  const renderViewModesSection = () => {
    const viewSection = data.sections.find(
      (s) => s.type === 'view-modes'
    ) as SidebarViewModesSection | undefined
    if (!viewSection) return null

    return (
      <section className="p-4 border-b border-[var(--border)]">
        <h2 className="text-sm font-medium uppercase tracking-wider mb-4 text-[var(--text-disabled)]">
          Modos de visualização
        </h2>

        <div className="grid grid-cols-3 gap-2">
          {viewSection.content.opcoes.map((opt) => (
            <div
              key={opt.id}
              className={`p-2 rounded-lg text-center transition-colors cursor-pointer ${
                /* Lógica simplificada: aqui você compararia o modo salvo com o opt.id */
              }`}
            >
              <span className="text-lg">{opt.rotulo}</span>
              <p className="text-xs line-clamp-1">{opt.descricao}</p>
            </div>
          ))}
        </div>

        <p className="text-xs mt-2 text-[var(--text-disabled)]">
          {viewSection.content.biblioteca_expandida}
        </p>
        <p className="text-xs mt-1 text-[var(--text-disabled)]">
          {viewSection.content.configuracao}
        </p>
      </section>
    )
  }

  // Renderizar section de criar
  const renderCreateSection = () => {
    const createSection = data.sections.find(
      (s) => s.type === 'create'
    ) as SidebarCreateSection | undefined
    if (!createSection) return null

    return (
      <section className="p-4 border-b border-[var(--border)]">
        <h2 className="text-sm font-medium uppercase tracking-wider mb-4 text-[var(--text-disabled)]">
          Criar
        </h2>

        <div className="space-y-3">
          {createSection.content.opcoes.map((opt) => (
            <button
              key={opt.id}
              className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-[var(--bg-elevated)]"
              style={{ background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))', color: 'var(--bg-base)' }}
            >
              {opt.rotulo}
            </button>
          ))}
        </div>
      </section>
    )
  }

  // Renderizar section de fixar itens
  const renderFixedItemsSection = () => {
    const fixedSection = data.sections.find(
      (s) => s.type === 'fixed-items'
    ) as SidebarFixedItemsSection | undefined
    if (!fixedSection) return null

    return (
      <section className="p-4 border-b border-[var(--border)]">
        <h2 className="text-sm font-medium uppercase tracking-wider mb-4 text-[var(--text-disabled)]">
          Fixar no topo
        </h2>

        <p className="text-xs mb-2 text-[var(--text-disabled)]">
          Limite atual: {fixedSection.content.limite_atual}
          {fixedSection.content.limite_anterior !== fixedSection.content.limite_atual && (
            <span className="ml-1 text-[var(--text-disabled)]">
              (antes {fixedSection.content.limite_anterior})
            </span>
          )}
          <span className="ml-2 text-[var(--text-disabled)]">
            desde {new Date(fixedSection.content.desde).toLocaleDateString('pt-BR')}
          </span>
        </p>

        <p className="text-xs text-[var(--text-disabled)] mb-2">
          {fixedSection.content.finalidade}
        </p>
        <p className="text-xs text-[var(--text-disabled)]">
          {fixedSection.content.mobile}
        </p>

        <p className="text-xs text-[var(--text-disabled)]">
          Tipos aceitos:{' '}
          {fixedSection.content.tipos_aceitos.map((t, i) => (
            <span key={i} className="mr-1">
              {t}
              {i < fixedSection.content.tipos_aceitos.length - 1 && ', '}
            </span>
          ))}
        </p>
      </section>
    )
  }

  // Renderizar section de layout da coluna
  const renderLayoutColumnSection = () => {
    const layoutSection = data.sections.find(
      (s) => s.type === 'layout-column'
    ) as SidebarLayoutColumnSection | undefined
    if (!layoutSection) return null

    return (
      <section className="p-4 border-b border-[var(--border)]">
        <h2 className="text-sm font-medium uppercase tracking-wider mb-4 text-[var(--text-disabled)]">
          Layout da coluna
        </h2>

        <ul className="space-y-2 text-sm">
          <li>
            <span className="font-medium">Redimensionar:</span> {layoutSection.content.redimensionar}
          </li>
          <li>
            <span className="font-medium">Expandir:</span> {layoutSection.content.expandir}
          </li>
          <li>
            <span className="font-medium">Recolher:</span> {layoutSection.content.recolher}
          </li>
        </ul>
      </section>
    )
  }

  // Renderizar section de novidades 2026
  const renderNovidadesSection = () => {
    const novidades = data.novidades_2026
    if (!novidades || novidades.length === 0) return null

    return (
      <section className="p-4 border-b border-[var(--border)]">
        <h2 className="text-sm font-medium uppercase tracking-wider mb-4 text-[var(--text-disabled)]">
          Novidades 2026
        </h2>

        <ul className="space-y-1 text-xs">
          {novidades.map((n) => (
            <li key={n.data}>
              <span className="font-medium">{n.data}</span>: {n.detalhe}
            </li>
          ))}
        </ul>
      </section>
    )
  }

  // Renderizar section de músicas curtidas
  const renderMusicasCurtidasSection = () => {
    const curtidas = data.musicas_curtidas
    if (!curtidas) return null

    return (
      <section className="p-4 border-b border-[var(--border)]">
        <h2 className="text-sm font-medium uppercase tracking-wider mb-4 text-[var(--text-disabled)]">
          Músicas Curtidas
        </h2>

        <p className="text-xs text-[var(--text-disabled)] mb-3">
          {curtidas.criar_playlist_a_partir_do_filtro.rotulo}
        </p>
        <p className="text-xs text-[var(--text-disabled)]">
          {curtidas.criar_playlist_a_partir_do_filtro.comportamento}
        </p>
        <p className="text-xs text-[var(--text-disabled)]">
          Plataforma: {curtidas.criar_playlist_a_partir_do_filtro.plataforma}
        </p>
      </section>
    )
  }

  // Efeito para inicializar dados (se precisar buscar do server, etc.)
  useEffect(() => {
    // Aqui poderíamos fazer fetch do sidebar.json se fosse dinâmico
    // Ou inicializar estados a partir dos dados já presentes no JSON
    setMode(data.modo === 'mobile' ? 'mobile' : 'expanded')
  }, [data.modo])

  return (
    <aside
      className={`w-64 h-screen bg-[var(--bg-surface)] flex flex-col transition-all duration-300 ${
        mode === 'collapsed' ? 'w-16' : 'w-64'
      }`}
    >
      {/* Header */}
      <header className="flex flex-col border-b border-[var(--border)]">
        <div className="p-4 border-b border-[var(--border)]">
          <h1 className="text-xl font-bold tracking-tighter">
            {data.header.titulo}
          </h1>
          <small className="text-sm text-[var(--text-disabled)]">
            {data.header.subtitulo}
          </small>
        </div>
        <renderProfileMenu />
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Seções principais */}
        {data.sections.map((section) => {
          // Navigation
          if (section.type === 'navigation') return renderMainNav()

          // Filters
          if (section.type === 'filters') return renderFiltersSection()

          // Ordenação
          if (section.type === 'ordenacao') return renderOrdenacaoSection()

          // View modes
          if (section.type === 'view-modes') return renderViewModesSection()

          // Create
          if (section.type === 'create') return renderCreateSection()

          // Fixed items
          if (section.type === 'fixed-items') return renderFixedItemsSection()

          // Layout column
          if (section.type === 'layout-column') return renderLayoutColumnSection()

          // Novidades 2026
          if (section.type === 'novidades') return renderNovidadesSection()

          // Músicas curtidas
          if (section.type === 'musicas_curtidas') return renderMusicasCurtidasSection()

          return null
        })}

        {/* Mobile behavior */}
        {mode !== 'collapsed' && renderMobileBehavior()}
      </main>

      {/* Footer/Collapse button */}
      <footer className="p-2 border-t border-[var(--border)]">
        {mode === 'expanded' && (
          <button
            onClick={() => setMode('collapsed')}
            className="w-full px-3 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="Colapsar sidebar"
          >
            ☰
          </button>
        )}
      </footer>
    </aside>
  )
}