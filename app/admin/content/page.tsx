import { prisma } from '@/lib/prisma'
import { formatDate } from '@/lib/dates'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  Calendar,
  Tag
} from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function ContentPage() {
  const content = await prisma.content.findMany({
    orderBy: { publishedAt: 'desc' }
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-two-tone text-3xl mb-2">
            <span>Content</span> <span className="gold">Manager</span>
          </h1>
          <p className="text-slate-600">Manage research, signals, and resources</p>
        </div>
        <Button asChild className="btn-gold">
          <Link href="/admin/content/new">
            <Plus className="w-4 h-4 mr-2" />
            New Content
          </Link>
        </Button>
      </div>

      {/* Content Table */}
      <Card className="card">
        <CardHeader>
          <CardTitle>All Content ({content.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[color:var(--border-subtle)]">
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Title</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Kind</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Published</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {content.map((item) => (
                  <tr key={item.id} className="border-b border-[color:var(--border-subtle)] hover:bg-slate-50">
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-medium text-slate-800">{item.title}</p>
                        <p className="text-sm text-slate-500 line-clamp-1">{item.excerpt}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <Badge variant="outline" className="capitalize">
                        {item.kind}
                      </Badge>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        {item.locked ? (
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
                        {item.minTier && (
                          <Badge variant="secondary" className="text-xs">
                            {item.minTier}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1 text-sm text-slate-500">
                        <Calendar className="w-4 h-4" />
                        {formatDate(item.publishedAt, 'MMM d, yyyy')}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/admin/content/${item.id}/edit`}>
                            <Edit className="w-4 h-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {content.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-500">No content created yet.</p>
              <Button asChild className="btn-gold mt-4">
                <Link href="/admin/content/new">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Content
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
