/**
 * Branded HTML wrapper for blog posts.
 * Produces a standalone HTML document with inline styles matching
 * Stewart & Co design tokens — suitable for website embed and newsletter.
 */

import { formatDate } from '@/lib/dates'

const CATEGORY_LABELS: Record<string, string> = {
  'market-update': 'Market Update',
  'system-spotlight': 'System Spotlight',
  'industry-analysis': 'Industry Analysis',
  'webinar-recap': 'Webinar Recap',
  guide: 'Guide',
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Convert Markdown body to basic HTML.
 * Handles headings, bold, italic, blockquotes, lists, links, code, and paragraphs.
 * For full MDX rendering use the MDXRenderer component — this is a lightweight
 * converter for email / standalone HTML output.
 */
function markdownToHtml(md: string): string {
  const lines = md.split('\n')
  const html: string[] = []
  let inList: 'ul' | 'ol' | null = null
  let inBlockquote = false

  function processInline(text: string): string {
    return text
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Inline code
      .replace(/`(.+?)`/g, '<code style="background:#1a1815;padding:2px 6px;border-radius:4px;font-size:14px;">$1</code>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#c9a227;text-decoration:underline;">$1</a>')
  }

  function closeList() {
    if (inList) {
      html.push(inList === 'ul' ? '</ul>' : '</ol>')
      inList = null
    }
  }

  function closeBlockquote() {
    if (inBlockquote) {
      html.push('</blockquote>')
      inBlockquote = false
    }
  }

  for (const line of lines) {
    const trimmed = line.trim()

    // Empty line
    if (!trimmed) {
      closeList()
      closeBlockquote()
      continue
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      closeList()
      if (!inBlockquote) {
        html.push('<blockquote style="border-left:4px solid #c9a227;padding-left:16px;margin:20px 0;color:#8a7d6b;font-style:italic;">')
        inBlockquote = true
      }
      html.push(`<p style="margin:8px 0;">${processInline(escapeHtml(trimmed.slice(2)))}</p>`)
      continue
    }

    closeBlockquote()

    // Headings
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/)
    if (headingMatch) {
      closeList()
      const level = headingMatch[1].length
      const sizes: Record<number, string> = {
        1: 'font-size:32px;',
        2: 'font-size:26px;margin-top:32px;',
        3: 'font-size:22px;margin-top:24px;',
        4: 'font-size:18px;margin-top:20px;',
      }
      html.push(`<h${level} style="font-family:Georgia,serif;font-weight:700;${sizes[level] || ''}color:#f5f0e8;margin-bottom:12px;">${processInline(escapeHtml(headingMatch[2]))}</h${level}>`)
      continue
    }

    // Unordered list
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (inList !== 'ul') {
        closeList()
        html.push('<ul style="margin:16px 0;padding-left:24px;color:#f5f0e8;">')
        inList = 'ul'
      }
      html.push(`<li style="margin-bottom:8px;">${processInline(escapeHtml(trimmed.slice(2)))}</li>`)
      continue
    }

    // Ordered list
    const olMatch = trimmed.match(/^\d+\.\s+(.+)$/)
    if (olMatch) {
      if (inList !== 'ol') {
        closeList()
        html.push('<ol style="margin:16px 0;padding-left:24px;color:#f5f0e8;">')
        inList = 'ol'
      }
      html.push(`<li style="margin-bottom:8px;">${processInline(escapeHtml(olMatch[1]))}</li>`)
      continue
    }

    // Horizontal rule
    if (trimmed === '---' || trimmed === '***') {
      closeList()
      html.push('<hr style="border:none;border-top:1px solid #2a2520;margin:24px 0;" />')
      continue
    }

    // Paragraph
    closeList()
    html.push(`<p style="color:#f5f0e8;line-height:1.7;margin-bottom:16px;font-size:16px;">${processInline(escapeHtml(trimmed))}</p>`)
  }

  closeList()
  closeBlockquote()

  return html.join('\n')
}

export function wrapInBrandedHTML(opts: {
  title: string
  subtitle: string | null
  body: string
  publishedAt: Date | string | null
  author: string
  category: string
}): string {
  const { title, subtitle, body, publishedAt, author, category } = opts
  const dateStr = publishedAt ? formatDate(new Date(publishedAt), 'long') : ''
  const categoryLabel = CATEGORY_LABELS[category] || category
  const htmlContent = markdownToHtml(body)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} — Stewart &amp; Co</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    @media (max-width: 680px) {
      .container { padding: 24px 16px !important; }
      h1 { font-size: 26px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;">
  <div class="container" style="max-width:680px;margin:0 auto;padding:48px 32px;">
    <!-- Header -->
    <div style="text-align:center;margin-bottom:40px;padding-bottom:24px;border-bottom:1px solid #2a2520;">
      <div style="font-family:Georgia,serif;font-size:14px;letter-spacing:3px;color:#c9a227;text-transform:uppercase;margin-bottom:8px;">STEWART &amp; CO</div>
    </div>

    <!-- Category badge -->
    <div style="margin-bottom:24px;">
      <span style="display:inline-block;padding:4px 12px;border:1px solid #c9a227;border-radius:9999px;font-size:12px;color:#c9a227;letter-spacing:0.5px;text-transform:uppercase;">${escapeHtml(categoryLabel)}</span>
    </div>

    <!-- Title -->
    <h1 style="font-family:Georgia,serif;font-size:36px;font-weight:700;color:#f5f0e8;margin:0 0 12px 0;line-height:1.2;">${escapeHtml(title)}</h1>

    ${subtitle ? `<p style="font-size:18px;color:#8a7d6b;margin:0 0 24px 0;line-height:1.5;font-style:italic;">${escapeHtml(subtitle)}</p>` : ''}

    <!-- Meta -->
    <div style="font-size:14px;color:#8a7d6b;margin-bottom:32px;padding-bottom:24px;border-bottom:1px solid #2a2520;">
      ${author ? `By <span style="color:#f5f0e8;">${escapeHtml(author)}</span>` : ''}
      ${dateStr ? `<span style="margin:0 8px;">&middot;</span>${dateStr}` : ''}
    </div>

    <!-- Body -->
    <div style="font-size:16px;line-height:1.7;">
      ${htmlContent}
    </div>

    <!-- Footer -->
    <div style="margin-top:48px;padding-top:24px;border-top:1px solid #2a2520;text-align:center;">
      <div style="font-family:Georgia,serif;font-size:12px;letter-spacing:2px;color:#8a7d6b;text-transform:uppercase;margin-bottom:12px;">STEWART &amp; CO</div>
      <a href="https://www.stewartandco.io" style="display:inline-block;padding:12px 32px;background-color:#c9a227;color:#0a0a0a;text-decoration:none;font-weight:600;font-size:14px;border-radius:6px;">Visit the Platform</a>
      <p style="font-size:12px;color:#8a7d6b;margin-top:16px;">This content is proprietary to Stewart &amp; Co. Do not redistribute.</p>
    </div>
  </div>
</body>
</html>`
}
