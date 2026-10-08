'use client'

import type { ReactNode } from 'react'
import { Button } from './Button'

interface StateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
  secondaryAction?: { label: string; onClick: () => void }
  className?: string
}

function StateBlock({ icon, title, description, action, secondaryAction, className = '' }: StateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-14 px-6 gap-2 ${className}`}>
      {icon && (
        <span
          className="mb-1 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--surface-container-highest)] text-[var(--text-secondary)]"
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      <h2 className="text-title-medium font-semibold text-[var(--text-primary)]">{title}</h2>
      {description && <p className="text-body-medium max-w-sm text-[var(--text-secondary)]">{description}</p>}
      {(action || secondaryAction) && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {action && <Button variant="filled" size="sm" onClick={action.onClick}>{action.label}</Button>}
          {secondaryAction && <Button variant="tonal" size="sm" onClick={secondaryAction.onClick}>{secondaryAction.label}</Button>}
        </div>
      )}
    </div>
  )
}

/** Standard empty state: icon + copy + optional CTA. */
export function EmptyState(props: StateProps) {
  return <StateBlock {...props} />
}

/** Standard error state: explains the failure and always offers a retry. */
export function ErrorState({ title = 'Algo deu errado', description = 'Não foi possível carregar o conteúdo.', ...rest }: StateProps) {
  return <StateBlock title={title} description={description} {...rest} />
}
