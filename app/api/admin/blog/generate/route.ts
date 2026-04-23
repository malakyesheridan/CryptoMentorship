import { NextRequest, NextResponse } from 'next/server'
import { requireRoleAPI } from '@/lib/auth-server'
import { handleError } from '@/lib/errors'
import { getOpenAI } from '@/lib/openai'
import { z } from 'zod'

const GenerateSchema = z.object({
  topic: z.string().min(10, 'Topic must be at least 10 characters').max(1000),
  category: z.enum([
    'market-update',
    'system-spotlight',
    'industry-analysis',
    'webinar-recap',
    'guide',
  ]),
  tone: z.enum(['analytical', 'educational', 'conversational']).default('analytical'),
  length: z.enum(['short', 'medium', 'long']).default('medium'),
  keyPoints: z.array(z.string()).optional(),
})

const SYSTEM_PROMPT = `You are the content writer for Stewart & Co, an elite crypto analytics and systems platform. You write blog posts and market commentary for sophisticated crypto investors.

VOICE & TONE:
- Authoritative but accessible — you know more than the reader, but you're not condescending
- Data-driven — reference on-chain metrics, macro indicators, and market structure
- Direct — no fluff, no filler, no "in this article we will discuss"
- Confident without being promotional — let the analysis speak for itself
- Use "we" when referring to Stewart & Co's systems and views

STRUCTURE:
- Title: Sharp, specific, avoids clickbait
- Subtitle: One sentence that expands on the title
- Body: Markdown format with ## headings, **bold** for key terms, > blockquotes for key insights
- End with a clear takeaway or positioning statement — never end with "only time will tell" or similar weak closings

TERMINOLOGY:
- Use: regime gate, market cycle phase, accumulation zone, distribution zone, risk-adjusted returns, Calmar ratio, Sharpe ratio, drawdown, rotation, relative strength
- Reference Stewart & Co systems by name where relevant: SDCA (Unified Composite Strategy), MARS (Rotation System), DHRS (Dynamic Hedging & Rotation System), Market Intelligence
- Never: guarantee returns, give financial advice, use "to the moon", "HODL", or meme language

Output ONLY the blog post content in Markdown. Start with the title as # heading, subtitle as italic text below, then the body. No preamble, no "here's the blog post", no wrapper text.`

const LENGTH_GUIDE: Record<string, string> = {
  short: '~500 words (3-4 paragraphs + takeaway)',
  medium: '~1000 words (5-7 paragraphs with 2-3 subheadings)',
  long: '~1500 words (8-10 paragraphs with 3-5 subheadings)',
}

export async function POST(request: NextRequest) {
  try {
    await requireRoleAPI(['admin', 'editor'])

    const body = await request.json()
    const data = GenerateSchema.parse(body)

    const userPrompt = [
      `Write a ${data.length} blog post (${LENGTH_GUIDE[data.length]}) about:`,
      data.topic,
      `\nCategory: ${data.category.replace(/-/g, ' ')}`,
      `Tone: ${data.tone}`,
      data.keyPoints?.length
        ? `\nKey points to cover:\n${data.keyPoints.map((p) => `- ${p}`).join('\n')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n')

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    })

    const content = completion.choices[0]?.message?.content?.trim() || ''

    // Parse title, subtitle, and body from generated markdown
    const lines = content.split('\n')
    let title = ''
    let subtitle = ''
    let bodyStart = 0

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!title && line.startsWith('# ')) {
        title = line.replace(/^#\s+/, '')
        bodyStart = i + 1
        continue
      }
      if (title && !subtitle && line.startsWith('*') && line.endsWith('*')) {
        subtitle = line.replace(/^\*+|\*+$/g, '')
        bodyStart = i + 1
        break
      }
      if (title && !subtitle && line) {
        // No italic subtitle found, body starts here
        bodyStart = i
        break
      }
    }

    const bodyContent = lines.slice(bodyStart).join('\n').trim()

    // Auto-generate excerpt from first ~160 chars of body text
    const plainText = bodyContent
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/\*\*/g, '')
      .replace(/[>*_~`]/g, '')
      .replace(/\n+/g, ' ')
      .trim()
    const excerpt = plainText.length > 160
      ? plainText.substring(0, 157) + '...'
      : plainText

    return NextResponse.json({
      title,
      subtitle,
      body: bodyContent,
      excerpt,
      fullContent: content,
    })
  } catch (error) {
    return handleError(error)
  }
}
