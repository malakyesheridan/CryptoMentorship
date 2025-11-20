import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EpisodeForm } from '@/components/admin/EpisodeForm'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'

export default async function EditEpisodePage({
  params
}: {
  params: { id: string }
}) {
  const episode = await prisma.episode.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      videoUrl: true,
      body: true,
      coverUrl: true,
      locked: true,
    }
  })

  if (!episode) {
    notFound()
  }

  // Convert null values to undefined for the form (Prisma returns null, form expects undefined)
  const initialData = {
    id: episode.id,
    title: episode.title,
    slug: episode.slug,
    excerpt: episode.excerpt ?? undefined,
    videoUrl: episode.videoUrl ?? undefined,
    body: episode.body ?? undefined,
    coverUrl: episode.coverUrl ?? undefined,
    locked: episode.locked,
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="heading-two-tone text-3xl mb-2">
          <span>Edit</span> <span className="gold">Episode</span>
        </h1>
        <p className="text-slate-600">Update Crypto Compass episode</p>
      </div>

      {/* Form */}
      <Card className="card">
        <CardHeader>
          <CardTitle>Episode Details</CardTitle>
        </CardHeader>
        <CardContent>
          <EpisodeForm initialData={initialData} />
        </CardContent>
      </Card>
    </div>
  )
}

