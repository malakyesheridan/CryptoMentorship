import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { getPaginationLinks } from '@/lib/pagination'

interface PaginationControlsProps {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  baseUrl: string
  searchParams: Record<string, string | undefined>
}

export function PaginationControls({ pagination, baseUrl, searchParams }: PaginationControlsProps) {
  const links = getPaginationLinks(
    baseUrl,
    pagination.page,
    pagination.totalPages,
    new URLSearchParams(searchParams as any)
  )

  if (pagination.totalPages <= 1) {
    return null
  }

  return (
    <div className="flex items-center justify-between mt-8">
      <div className="text-sm text-[var(--text-muted)]">
        Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
        {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
        {pagination.total} results
      </div>
      
      <div className="flex items-center space-x-2">
        {links.first && (
          <Button variant="outline" size="sm" asChild>
            <Link href={links.first}>
              <ChevronsLeft className="w-4 h-4" />
            </Link>
          </Button>
        )}
        
        {links.prev && (
          <Button variant="outline" size="sm" asChild>
            <Link href={links.prev}>
              <ChevronLeft className="w-4 h-4" />
            </Link>
          </Button>
        )}
        
        <span className="px-3 py-1 text-sm text-[var(--text-strong)]">
          Page {pagination.page} of {pagination.totalPages}
        </span>
        
        {links.next && (
          <Button variant="outline" size="sm" asChild>
            <Link href={links.next}>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </Button>
        )}
        
        {links.last && (
          <Button variant="outline" size="sm" asChild>
            <Link href={links.last}>
              <ChevronsRight className="w-4 h-4" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  )
}
