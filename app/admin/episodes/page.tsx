import { prisma } from '@/lib/prisma'
import { formatDate } from '@/lib/dates'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Play, 
  Eye, 
  EyeOff,
  Calendar
} from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function EpisodesPage() {
  const episodes = await prisma.episode.findMany({
    orderBy: { publishedAt: 'desc' }
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-two-tone text-3xl mb-2">
            <span>Episode</span> <span className="gold">Manager</span>
          </h1>
          <p className="text-slate-600">Manage Macro Minute episodes</p>
        </div>
        <Button asChild className="btn-gold">
          <Link href="/admin/episodes/new">
            <Plus className="w-4 h-4 mr-2" />
            New Episode
          </Link>
        </Button>
      </div>

      {/* Episodes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {episodes.map((episode) => (
          <Card key={episode.id} className="card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge className="badge-preview">
                  <Play className="w-3 h-3 mr-1" />
                  Episode
                </Badge>
                {episode.locked ? (
                  <Badge className="badge-locked">
                    <EyeOff className="w-3 h-3 mr-1" />
                    Locked
                  </Badge>
                ) : (
                  <Badge className="badge-preview">
                    <Eye className="w-3 h-3 mr-1" />
                    Public
                  </Badge>
                )}
              </div>
              <CardTitle className="text-lg line-clamp-2">{episode.title}</CardTitle>
            </CardHeader>
            <CardContent>
              {episode.excerpt && (
                <p className="text-sm text-slate-600 mb-4 line-clamp-3">
                  {episode.excerpt}
                </p>
              )}
              
              <div className="flex items-center gap-1 text-sm text-slate-500 mb-4">
                <Calendar className="w-4 h-4" />
                {formatDate(episode.publishedAt, 'MMM d, yyyy')}
              </div>
              
              <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/admin/episodes/${episode.id}/edit`}>
                    <Edit className="w-4 h-4" />
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/macro/${episode.slug}`}>
                    <Play className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {episodes.length === 0 && (
        <Card className="card">
          <CardContent className="text-center py-12">
            <p className="text-slate-500 mb-4">No episodes created yet.</p>
            <Button asChild className="btn-gold">
              <Link href="/admin/episodes/new">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Episode
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
