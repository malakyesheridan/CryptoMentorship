import { sendEmail } from './email'
import { formatDate } from './dates'

/**
 * Escape HTML to prevent XSS in email templates
 */
function escapeHtml(text: string | null | undefined): string {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

interface DailySignal {
  id: string
  tier: 'T1' | 'T2'
  category?: 'majors' | 'memecoins' | null
  signal: string
  executiveSummary?: string | null
  associatedData?: string | null
  publishedAt: Date | string
}

const tierLabels: Record<'T1' | 'T2', string> = {
  T1: 'Growth',
  T2: 'Elite',
}

const tierColors: Record<'T1' | 'T2', { bg: string; border: string; text: string }> = {
  T1: { bg: '#FAF5FF', border: '#E9D5FF', text: '#6B21A8' }, // purple-50, purple-200, purple-800 (old T2)
  T2: { bg: '#FEFCE8', border: '#FEF08A', text: '#854D0E' }, // yellow-50, yellow-200, yellow-800 (old T3)
}

/**
 * Generate HTML for a single update section
 */
function generateUpdateSection(signal: DailySignal): string {
  const categoryLabel = signal.category === 'majors' 
    ? ' Market Rotation' 
    : signal.category === 'memecoins' 
    ? ' Memecoins' 
    : ''
  
  const tierColor = tierColors[signal.tier]
  const publishedDate = formatDate(new Date(signal.publishedAt), 'short')

  return `
    <div style="background: ${tierColor.bg}; border: 2px solid ${tierColor.border}; border-radius: 8px; padding: 24px; margin-bottom: 24px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <!-- Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 20px;">⚡</span>
          <h3 style="font-size: 18px; font-weight: bold; color: #1e293b; margin: 0;">
            Portfolio Update - ${tierLabels[signal.tier]}${categoryLabel} ⚡
          </h3>
        </div>
        <span style="font-size: 12px; color: #64748b;">
          ${publishedDate}
        </span>
      </div>

      <!-- Update -->
      <div style="margin-bottom: 16px;">
        <h4 style="font-weight: bold; color: #1e293b; margin: 0 0 8px 0; font-size: 16px;">Update:</h4>
        <div style="background: white; border-radius: 8px; padding: 16px; border: 1px solid #e2e8f0;">
          <div style="font-size: 18px; color: #1e293b; margin: 0;">
            ${escapeHtml(signal.signal).split('\n').filter(line => line.trim().length > 0).map(line => `<p style="margin: 0 0 4px 0; padding: 0;">${line.trim()}</p>`).join('')}
          </div>
        </div>
      </div>

      ${signal.executiveSummary ? `
      <!-- Executive Summary -->
      <div style="margin-bottom: 16px;">
        <h4 style="font-weight: bold; color: #1e293b; margin: 0 0 8px 0; font-size: 16px;">Executive Summary:</h4>
        <div style="background: white; border-radius: 8px; padding: 16px; border: 1px solid #e2e8f0;">
          <p style="color: #334155; margin: 0; white-space: pre-wrap;">
            ${escapeHtml(signal.executiveSummary)}
          </p>
        </div>
      </div>
      ` : ''}

      ${signal.associatedData ? `
      <!-- Associated Data -->
      <div>
        <h4 style="font-weight: bold; color: #1e293b; margin: 0 0 8px 0; font-size: 16px;">Associated Data:</h4>
        <div style="background: white; border-radius: 8px; padding: 16px; border: 1px solid #e2e8f0;">
          <p style="color: #334155; margin: 0; white-space: pre-wrap;">
            ${escapeHtml(signal.associatedData)}
          </p>
        </div>
      </div>
      ` : ''}
    </div>
  `
}

/**
 * Send daily portfolio update email
 * For T2 (Elite) users, can send both majors and memecoins updates in one email
 */
export async function sendDailySignalEmail({
  to,
  userName,
  signals,
  portfolioUrl,
  preferencesUrl,
}: {
  to: string
  userName?: string | null
  signals: DailySignal[]
  portfolioUrl: string
  preferencesUrl: string
}): Promise<void> {
  if (signals.length === 0) {
    throw new Error('No updates provided for email')
  }

  const greeting = userName ? `Hi ${userName},` : 'Hi there,'
  
  // Generate update sections
  const signalSections = signals.map(signal => generateUpdateSection(signal)).join('')

  // Determine main tier (for header)
  const mainTier = signals[0].tier
  const hasMultipleCategories = signals.length > 1 && signals.some(s => s.category)

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Daily Portfolio Update</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #FFFDF7 0%, #FBF9F3 100%); padding: 40px 20px; border-radius: 8px; margin-bottom: 20px;">
          <h1 style="color: #d4af37; margin: 0 0 10px 0; font-size: 28px;">Daily Portfolio Update</h1>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <p style="margin: 0 0 20px 0; font-size: 16px;">
            ${greeting}
          </p>
          
          <p style="margin: 0 0 24px 0; font-size: 16px; color: #475569;">
            Here's your daily portfolio update${hasMultipleCategories ? 's' : ''}:
          </p>

          ${signalSections}

          <div style="text-align: center; margin: 30px 0;">
            <a href="${portfolioUrl}" 
               style="display: inline-block; background: #d4af37; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
              View Full Portfolio
            </a>
          </div>
          
          <p style="margin: 30px 0 0 0; font-size: 14px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 20px;">
            <a href="${preferencesUrl}" style="color: #3b82f6; text-decoration: none;">Manage notification preferences</a>
          </p>
        </div>
        
        <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0;">© ${new Date().getFullYear()} CryptoMentorship. All rights reserved.</p>
        </div>
      </body>
    </html>
  `

  // Generate text version
  const textSignals = signals.map(signal => {
    const categoryLabel = signal.category === 'majors' 
      ? ' Market Rotation' 
      : signal.category === 'memecoins' 
      ? ' Memecoins' 
      : ''
    
    let text = `Portfolio Update - ${tierLabels[signal.tier]}${categoryLabel}\n`
    text += `Published: ${formatDate(new Date(signal.publishedAt), 'short')}\n\n`
    text += `Update:\n${signal.signal}\n\n`
    
    if (signal.executiveSummary) {
      text += `Executive Summary:\n• ${signal.executiveSummary}\n\n`
    }
    
    if (signal.associatedData) {
      text += `Associated Data:\n${signal.associatedData}\n\n`
    }
    
    return text
  }).join('\n---\n\n')
  
  // Note: Text version doesn't need HTML escaping since it's plain text

  const text = `
Daily Portfolio Update

${greeting}

Here's your daily portfolio update${hasMultipleCategories ? 's' : ''}:

${textSignals}

View Full Portfolio: ${portfolioUrl}

Manage notification preferences: ${preferencesUrl}

© ${new Date().getFullYear()} CryptoMentorship. All rights reserved.
  `.trim()

  await sendEmail({
    to,
    subject: 'Daily Portfolio Update',
    html,
    text,
  })
}

