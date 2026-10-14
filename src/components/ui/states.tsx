'use client'

import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { fadeVariants } from '@/lib/motion'
import { Button } from './Button'
import { Lottie } from './LottieLazy'

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
    <motion.div
      className={`flex flex-col items-center justify-center text-center py-14 px-6 gap-2 ${className}`}
      variants={fadeVariants}
      initial="hidden"
      animate="visible"
    >
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
        <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
          {action && <Button variant="filled" size="lg" onClick={action.onClick}>{action.label}</Button>}
          {secondaryAction && <Button variant="tonal" size="lg" onClick={secondaryAction.onClick}>{secondaryAction.label}</Button>}
        </div>
      )}
    </motion.div>
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

/**
 * Standard loading block: an animated spinner where the skeleton row used to
 * be, so waiting reads as one thing rather than as a page of stand-ins.
 *
 * It announces itself to assistive tech as a status region — the spinner is
 * decorative and hidden from it, so the copy is what carries the meaning.
 */
export function LoadingState({ title = 'Carregando…', className = '' }: { title?: string; className?: string }) {
  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center gap-3 py-14 ${className}`}
    >
      <Lottie name="spinner" loop className="h-10 w-10" />
      <p className="text-body-medium text-[var(--text-secondary)]">{title}</p>
    </div>
  )
}
