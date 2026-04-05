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

/**
 * Preprocess custom MDX components (<LinkCard>, <VideoEmbed>) into
 * inline-styled HTML for PDF export and newsletter distribution.
 * Run this on the raw markdown body BEFORE passing to wrapInBrandedHTML.
 */
export function preprocessCustomComponents(text: string): string {
  // Convert <LinkCard> to styled HTML card
  text = text.replace(
    /<LinkCard\s+url="([^"]*?)"\s+title="([^"]*?)"\s+description="([^"]*?)"\s+image="([^"]*?)"\s+siteName="([^"]*?)"\s*\/>/g,
    (_, url, title, description, image, siteName) => {
      const imageBlock = image
        ? `<div style="width:100%;height:160px;overflow:hidden;background:#141210;"><img src="${image}" alt="${escapeHtml(title)}" style="width:100%;height:100%;object-fit:cover;" /></div>`
        : ''
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="display:block;margin:16px 0;border-radius:8px;border:1px solid #2a2520;background:#141210;overflow:hidden;text-decoration:none;color:inherit;">
        ${imageBlock}
        <div style="padding:16px;">
          ${siteName ? `<p style="font-size:11px;color:#8a7d6b;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.5px;">${escapeHtml(siteName)}</p>` : ''}
          <p style="font-size:14px;font-weight:600;color:#f5f0e8;margin:0 0 4px;">${escapeHtml(title)}</p>
          ${description ? `<p style="font-size:12px;color:#8a7d6b;margin:0;line-height:1.5;">${escapeHtml(description)}</p>` : ''}
        </div>
      </a>`
    }
  )

  // Convert <VideoEmbed> to thumbnail with play button
  text = text.replace(
    /<VideoEmbed\s+url="([^"]*?)"\s*\/>/g,
    (_, url) => {
      const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/)
      const thumbnail = ytMatch
        ? `https://img.youtube.com/vi/${ytMatch[1]}/maxresdefault.jpg`
        : ''

      if (thumbnail) {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="display:block;margin:16px 0;text-decoration:none;">
          <div style="position:relative;width:100%;aspect-ratio:16/9;background:#141210;border-radius:8px;overflow:hidden;">
            <img src="${thumbnail}" alt="Video thumbnail" style="width:100%;height:100%;object-fit:cover;opacity:0.8;" />
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:60px;height:60px;background:rgba(201,162,39,0.9);border-radius:50%;display:flex;align-items:center;justify-content:center;">
              <div style="width:0;height:0;border-top:12px solid transparent;border-bottom:12px solid transparent;border-left:20px solid #0a0a0a;margin-left:4px;"></div>
            </div>
          </div>
        </a>`
      }

      return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="display:block;margin:16px 0;text-decoration:none;">
        <div style="padding:16px;border:1px solid #2a2520;border-radius:8px;background:#141210;">
          <p style="color:#c9a227;font-size:13px;margin:0;">&#9654; Watch video</p>
          <p style="color:#8a7d6b;font-size:11px;margin:4px 0 0;">${escapeHtml(url)}</p>
        </div>
      </a>`
    }
  )

  return text
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
      <a href="https://stewartandco.vercel.app/login" style="display:inline-block;padding:12px 32px;background-color:#c9a227;color:#0a0a0a;text-decoration:none;font-weight:600;font-size:14px;border-radius:6px;">Visit the Platform</a>
      <p style="font-size:12px;color:#8a7d6b;margin-top:16px;">This content is proprietary to Stewart &amp; Co. Do not redistribute.</p>
    </div>
  </div>
</body>
</html>`
}
