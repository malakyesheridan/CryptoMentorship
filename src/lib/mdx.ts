import { createHash } from 'crypto'

import { unstable_cache } from 'next/cache'
import { z } from 'zod'

// Safe HTML schema for MDX content
const sanitizeSchema = {
  tagNames: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'div', 'span', 'br', 'hr',
    'ul', 'ol', 'li',
    'blockquote', 'pre', 'code',
    'strong', 'em', 'b', 'i', 'u', 's',
    'a', 'img',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
  ],
  attributes: {
    '*': ['className', 'id'],
    'a': ['href', 'title', 'target', 'rel'],
    'img': ['src', 'alt', 'title', 'width', 'height'],
    'table': ['border', 'cellpadding', 'cellspacing'],
    'th': ['colspan', 'rowspan'],
    'td': ['colspan', 'rowspan'],
  },
  protocols: {
    'href': ['http:', 'https:', 'mailto:', 'tel:'],
    'src': ['http:', 'https:', 'data:'],
  },
  clobberPrefix: 'user-content-',
  clobber: ['name', 'id'],
}

const SerializedSource = z.object({
  compiledSource: z.string().min(1),
  scope: z.record(z.string(), z.unknown()).optional(),
  frontmatter: z.record(z.string(), z.unknown()).optional(),
})

export type SerializedMDXSource = z.infer<typeof SerializedSource>
export type HeadingMeta = { id: string; text: string; level: number }
export type RenderedMDX = {
  source: SerializedMDXSource
  hash: string
  headings: HeadingMeta[]
}

const serializeInternal = async (
  content: string,
  scope: Record<string, unknown>,
) => {
  const [{ serialize }, remarkGfm, rehypeSlug, rehypeAutolinkHeadings, rehypeSanitize] = await Promise.all([
    import('next-mdx-remote/serialize'),
    import('remark-gfm').then((m) => m.default || m),
    import('rehype-slug').then((m) => m.default || m),
    import('rehype-autolink-headings').then((m) => m.default || m),
    import('rehype-sanitize').then((m) => m.default || m),
  ])

  const serialized = await serialize(content, {
    scope,
    mdxOptions: {
      remarkPlugins: [remarkGfm],
      rehypePlugins: [
        rehypeSlug,
        [
          rehypeAutolinkHeadings,
          {
            behavior: 'wrap',
            properties: { className: ['anchor'] },
          },
        ],
        [rehypeSanitize, sanitizeSchema],
      ],
    },
  })

  return {
    source: serialized,
    headings: [] as HeadingMeta[],
  }
}

export async function renderMDX(
  slug: string,
  content: string,
  scope: Record<string, unknown> = {},
): Promise<RenderedMDX> {
  const hash = createHash('sha1')
    .update(content)
    .update(JSON.stringify(scope))
    .digest('hex')

  const cacheKey = ['mdx', slug, hash]

  const cached = await unstable_cache(
    () => serializeInternal(content, scope),
    cacheKey,
    { tags: [`mdx:${slug}`, `mdx:${hash}`], revalidate: 3600 },
  )()

  const source = SerializedSource.parse(cached.source)

  return {
    source,
    hash,
    headings: cached.headings,
  }
}
