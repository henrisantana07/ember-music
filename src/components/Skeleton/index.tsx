interface SkeletonProps {
  className?: string
  width?: string | number
  height?: string | number
  borderRadius?: string
  variant?: 'text' | 'circular' | 'rectangular'
}

export function Skeleton({
  className = '',
  width,
  height,
  borderRadius = '8px',
  variant = 'rectangular',
}: SkeletonProps) {
  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    borderRadius: variant === 'circular' ? '50%' : borderRadius,
    animation: 'shimmer 1.5s infinite',
    background: 'linear-gradient(90deg, var(--bg-elevated) 25%, color-mix(in srgb, var(--text-primary) 5%, transparent) 50%, var(--bg-elevated) 75%)',
    backgroundSize: '200% 100%',
  }

  return <div className={className} style={style} />
}

export function TrackCardSkeleton() {
  return (
    <div className="p-3">
      <Skeleton className="w-full aspect-square rounded-md mb-3" />
      <Skeleton height={14} width="80%" className="mb-1" />
      <Skeleton height={12} width="50%" />
    </div>
  )
}

/** Cabeçalho de detalhe (álbum/playlist/artista): capa + metadados + ações. */
export function DetailHeaderSkeleton({ circular = false }: { circular?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-4 py-6 md:flex-row md:items-end md:gap-6" role="status" aria-label="Carregando detalhes">
      <Skeleton
        variant={circular ? 'circular' : 'rectangular'}
        className="w-[160px] h-[160px] md:w-[200px] md:h-[200px] flex-shrink-0"
        borderRadius="var(--shape-large)"
      />
      <div className="flex min-w-0 flex-1 flex-col items-center gap-3 md:items-start">
        <Skeleton height={12} width={90} className="rounded-full" />
        <Skeleton height={32} width="70%" className="rounded-md max-w-[420px]" />
        <Skeleton height={14} width={180} />
        <div className="flex items-center gap-2 mt-2">
          <Skeleton height={40} width={120} borderRadius="999px" />
          <Skeleton height={40} width={40} borderRadius="999px" />
          <Skeleton height={40} width={40} borderRadius="999px" />
        </div>
      </div>
    </div>
  )
}

/** Lista de faixas em carregamento: mesma silhueta das linhas reais. */
export function TrackListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-1" role="status" aria-label="Carregando faixas">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2">
          <Skeleton width={20} height={14} />
          <Skeleton width={48} height={48} borderRadius="var(--shape-small)" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton height={13} width="55%" />
            <Skeleton height={11} width="35%" />
          </div>
          <Skeleton width={48} height={12} />
        </div>
      ))}
    </div>
  )
}

/** Fileira de artistas com círculos, usada em resultados e páginas de artista. */
export function ArtistRowSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex gap-4 overflow-hidden" role="status" aria-label="Carregando artistas">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex w-32 flex-shrink-0 flex-col items-center gap-2">
          <Skeleton variant="circular" className="h-[120px] w-[120px]" />
          <Skeleton height={13} width="80%" />
        </div>
      ))}
    </div>
  )
}

/** Seção da Início: título + fileira de cards. */
export function SectionSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <section className="mb-12" role="status" aria-label="Carregando seção">
      <Skeleton height={20} width={190} className="mb-4 rounded-md" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: cards }).map((_, i) => <TrackCardSkeleton key={i} />)}
      </div>
    </section>
  )
}

/** Página inteira da Início no primeiro carregamento. */
export function HomeSkeleton() {
  return (
    <div className="space-y-8" role="status" aria-label="Carregando início">
      <div className="mb-6 space-y-2">
        <Skeleton height={32} width="60%" className="rounded-md" />
        <Skeleton height={14} width={220} />
      </div>
      <SectionSkeleton />
      <SectionSkeleton />
      <SectionSkeleton />
    </div>
  )
}

/** Linhas compactas da biblioteca na sidebar. */
export function LibraryRailSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-1 px-1" role="status" aria-label="Carregando biblioteca">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 py-1">
          <Skeleton width={36} height={36} borderRadius="var(--shape-small)" />
          <div className="flex-1 space-y-1.5">
            <Skeleton height={11} width="70%" />
            <Skeleton height={9} width="45%" />
          </div>
        </div>
      ))}
    </div>
  )
}
