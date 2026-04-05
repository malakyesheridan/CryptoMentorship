import { NextResponse } from 'next/server'
import { requireRoleAPI } from '@/lib/auth-server'
import { handleError } from '@/lib/errors'
import { z } from 'zod'

const OGFetchSchema = z.object({ url: z.string().url() })

function getMetaContent(html: string, property: string): string | null {
  const propRegex = new RegExp(
    `<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`,
    'i'
  )
  const propMatch = html.match(propRegex)
  if (propMatch) return propMatch[1]

  const nameRegex = new RegExp(
    `<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']*)["']`,
    'i'
  )
  const nameMatch = html.match(nameRegex)
  if (nameMatch) return nameMatch[1]

  const reverseRegex = new RegExp(
    `<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${property}["']`,
    'i'
  )
  const reverseMatch = html.match(reverseRegex)
  return reverseMatch?.[1] || null
}

export async function POST(req: Request) {
  try {
    await requireRoleAPI(['admin', 'editor'])

    const body = await req.json()
    const parsed = OGFetchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    const { url } = parsed.data

    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Stewart-Co-Bot/1.0' },
        signal: AbortSignal.timeout(5000),
      })
      const html = await response.text()

      const titleTagMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)

      const ogData = {
        title:
          getMetaContent(html, 'og:title') ||
          getMetaContent(html, 'twitter:title') ||
          titleTagMatch?.[1]?.trim() ||
          '',
        description:
          getMetaContent(html, 'og:description') ||
          getMetaContent(html, 'twitter:description') ||
          '',
        image:
          getMetaContent(html, 'og:image') ||
          getMetaContent(html, 'twitter:image') ||
          '',
        siteName:
          getMetaContent(html, 'og:site_name') || new URL(url).hostname,
        url,
      }

      return NextResponse.json({ data: ogData })
    } catch {
      // Return minimal data on failure
      return NextResponse.json({
        data: {
          title: new URL(url).hostname,
          description: '',
          image: '',
          siteName: new URL(url).hostname,
          url,
        },
      })
    }
  } catch (error) {
    return handleError(error)
  }
}
