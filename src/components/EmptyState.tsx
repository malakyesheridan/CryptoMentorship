import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description: string
  action?: {
    label: string
    href: string
    adminOnly?: boolean
  }
  userRole?: string
}

export function EmptyState({ icon, title, description, action, userRole }: EmptyStateProps) {
  const canShowAction = !action?.adminOnly || userRole === 'admin' || userRole === 'editor'

  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 text-[var(--text-muted)] mx-auto mb-4">
        {icon}
      </div>
      <h3 className="font-playfair text-xl font-bold mb-2">{title}</h3>
      <p className="text-[var(--text-muted)] mb-6 max-w-md mx-auto">{description}</p>
      
      {action && canShowAction && (
        <Button asChild className="btn-gold">
          <Link href={action.href}>
            {action.label}
          </Link>
        </Button>
      )}
    </div>
  )
}
