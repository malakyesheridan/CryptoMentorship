import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth-server'
import { formatDate } from '@/lib/dates'
import { MediaGrid } from '@/components/admin/MediaGrid'
import { MediaUpload } from '@/components/admin/MediaUpload'
import { requireRole } from '@/lib/auth-server'
import { Upload, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

export const dynamic = 'force-dynamic'

interface MediaPageProps {
  searchParams: {
    q?: string
    mime?: string
  }
}

export default async function MediaPage({ searchParams }: MediaPageProps) {
  await requireRole(['admin', 'editor'])
  
  const session = await getSession()
  const userId = session?.user?.id

  // Build where clause for filtering
  const where: any = {}
  
  if (searchParams.q) {
    where.filename = { contains: searchParams.q, mode: 'insensitive' }
  }
  
  if (searchParams.mime) {
    where.mime = { startsWith: searchParams.mime }
  }

  const media = await prisma.media.findMany({
    where,
    include: {
      uploader: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="font-playfair text-4xl font-bold">Media Library</h1>
        <MediaUpload />
      </div>

      {/* Filters */}
      <div className="card p-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" />
              <Input
                placeholder="Search by filename..."
                defaultValue={searchParams.q || ''}
                className="pl-10"
              />
            </div>
          </div>
          <select className="px-3 py-2 border border-[var(--border-subtle)] rounded-lg">
            <option value="">All types</option>
            <option value="image/">Images</option>
            <option value="video/">Videos</option>
            <option value="application/">Documents</option>
          </select>
        </div>
      </div>

      {/* Media Grid */}
      <MediaGrid media={media} />

      {media.length === 0 && (
        <div className="text-center py-12">
          <Upload className="w-16 h-16 text-[var(--text-muted)] mx-auto mb-4" />
          <h3 className="font-playfair text-xl font-bold mb-2">No Media Found</h3>
          <p className="text-[var(--text-muted)] mb-6">
            Upload your first image to get started.
          </p>
          <MediaUpload />
        </div>
      )}
    </div>
  )
}
