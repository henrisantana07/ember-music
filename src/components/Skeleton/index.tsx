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
    background: 'linear-gradient(90deg, var(--bg-elevated) 25%, rgba(255,255,255,0.05) 50%, var(--bg-elevated) 75%)',
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
