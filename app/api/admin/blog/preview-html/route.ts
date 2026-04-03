import { NextRequest, NextResponse } from 'next/server'
import { requireRoleAPI } from '@/lib/auth-server'
import { handleError } from '@/lib/errors'
import { wrapInBrandedHTML } from '@/lib/blog-html-template'
import { z } from 'zod'

const PreviewSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().optional(),
  body: z.string().min(1),
  category: z.string(),
  author: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    await requireRoleAPI(['admin', 'editor'])

    const json = await request.json()
    const data = PreviewSchema.parse(json)

    const html = wrapInBrandedHTML({
      title: data.title,
      subtitle: data.subtitle || null,
      body: data.body,
      publishedAt: new Date(),
      author: data.author || 'Stewart & Co',
      category: data.category,
    })

    return NextResponse.json({ html })
  } catch (error) {
    return handleError(error)
  }
}
