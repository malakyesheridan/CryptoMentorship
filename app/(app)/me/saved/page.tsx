import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Bookmark, Calendar, Tag } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/dates'
import { EmptyState } from '@/components/EmptyState'

// Revalidate every 2 minutes - bookmarks can change but don't need to be real-time
export const revalidate = 120

export default async function SavedPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return (
      <div className="container-main section-padding">
        <div className="text-center">
          <h1 className="heading-hero text-4xl mb-4">Sign in required</h1>
          <p className="subhead">Please sign in to view your saved content.</p>
        </div>
      </div>
    )
  }

  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: session.user.id },
    take: 100, // Limit to 100 most recent bookmarks
    include: {
      content: {
        select: {
          id: true,
          title: true,
          excerpt: true,
          kind: true,
          publishedAt: true,
          locked: true,
          tags: true,
        }
      },
      episode: {
        select: {
          id: true,
          title: true,
          excerpt: true,
          publishedAt: true,
          locked: true,
        }
      }
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="container-main section-padding">
      {/* Header */}
      <div className="mb-8">
        <h1 className="heading-hero text-4xl mb-2">Saved Content</h1>
        <p className="subhead">Your bookmarked research, episodes, and resources</p>
      </div>

      {bookmarks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bookmarks.map((bookmark) => {
            const entity = bookmark.content || bookmark.episode
            const entityType = bookmark.content ? 'content' : 'episode'
            
            if (!entity) return null
            
            return (
              <Card key={bookmark.id} className="group hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg leading-tight group-hover:text-gold-600 transition-colors">
                      <Link href={entityType === 'content' ? `/content/${entity.id}` : `/crypto-compass/${entity.id}`}>
                        {entity.title}
                      </Link>
                    </CardTitle>
                    <Bookmark className="h-5 w-5 text-gold-500 fill-current" />
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  {entity.excerpt && (
                    <p className="subhead text-sm mb-4 line-clamp-3">
                      {entity.excerpt}
                    </p>
                  )}

                  {/* Tags for content */}
                  {bookmark.content?.tags && bookmark.content.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {bookmark.content.tags.split(',').slice(0, 3).map((tag) => (
                        <Badge key={tag.trim()} variant="outline" className="text-xs">
                          <Tag className="h-3 w-3 mr-1" />
                          {tag.trim()}
                        </Badge>
                      ))}
                      {bookmark.content.tags.split(',').length > 3 && (
                        <span className="text-xs text-slate-500 px-2 py-1">
                          +{bookmark.content.tags.split(',').length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {entityType === 'content' ? bookmark.content?.kind : 'Episode'}
                      </Badge>
                      {entity.locked && (
                        <Badge variant="locked" className="text-xs">LOCKED</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <Calendar className="h-3 w-3" />
                      {formatDate(bookmark.createdAt, 'MMM d')}
                    </div>
                  </div>

                  {/* Note if present */}
                  {bookmark.note && (
                    <div className="mt-3 p-2 bg-slate-50 rounded text-sm text-slate-600">
                      <strong>Note:</strong> {bookmark.note}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon={<Bookmark className="w-16 h-16 text-slate-400 mx-auto mb-4" />}
          title="No saved content yet"
          description="Bookmark articles, episodes, and resources to save them for later reading."
          action={{
            label: "Browse Research",
            href: "/research"
          }}
        />
      )}
    </div>
  )
}
