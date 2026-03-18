'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type AdminBackLinkProps = {
  href: string
  label?: string
  className?: string
}

export function AdminBackLink({ href, label = 'Back', className }: AdminBackLinkProps) {
  return (
    <Button
      asChild
      variant="ghost"
      size="sm"
      className={cn('gap-2 text-[var(--text-strong)] hover:text-[var(--text-strong)]', className)}
    >
      <Link href={href}>
        <ArrowLeft className="h-4 w-4" />
        <span>{label}</span>
      </Link>
    </Button>
  )
}
