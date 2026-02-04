import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ContentForm } from '@/components/admin/ContentForm'
import { AdminBackLink } from '@/components/admin/AdminBackLink'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'

export default async function EditContentPage({
  params
}: {
  params: { id: string }
}) {
  const content = await prisma.content.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      title: true,
      slug: true,
      kind: true,
      excerpt: true,
      body: true,
      coverUrl: true,
      locked: true,
      minTier: true,
      tags: true,
    }
  })

  if (!content) {
    notFound()
  }

  const tags = content.tags ? JSON.parse(content.tags) : []

  // Convert null values to undefined for the form (Prisma returns null, form expects undefined)
  const initialData = {
    id: content.id,
    title: content.title,
    slug: content.slug,
    kind: content.kind,
    excerpt: content.excerpt ?? undefined,
    body: content.body ?? undefined,
    coverUrl: content.coverUrl ?? undefined,
    locked: content.locked,
    minTier: content.minTier ?? undefined,
    tags,
  }

  return (
    <div className="space-y-8">
      <AdminBackLink href="/admin" label="Back to Dashboard" />

      {/* Header */}
      <div>
        <h1 className="heading-two-tone text-3xl mb-2">
          <span>Edit</span> <span className="gold">Content</span>
        </h1>
        <p className="text-slate-600">Update research, signals, or resources</p>
      </div>

      {/* Form */}
      <Card className="card">
        <CardHeader>
          <CardTitle>Content Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ContentForm initialData={initialData} />
        </CardContent>
      </Card>
    </div>
  )
}

