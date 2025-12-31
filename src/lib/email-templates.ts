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
    <div class="signal-box" style="background: ${tierColor.bg}; border: 2px solid ${tierColor.border}; border-radius: 12px; padding: 32px 28px; margin-bottom: 36px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <!-- Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 200px;">
          <span style="font-size: 24px;">⚡</span>
          <h3 style="font-size: 20px; font-weight: bold; color: #1e293b; margin: 0; line-height: 1.4;">
            Portfolio Update - ${tierLabels[signal.tier]}${categoryLabel} ⚡
          </h3>
        </div>
        <span style="font-size: 14px; color: #64748b; white-space: nowrap;">
          ${publishedDate}
        </span>
      </div>

      <!-- Update -->
      <div style="margin-bottom: 24px;">
        <h4 style="font-weight: 700; color: #1e293b; margin: 0 0 12px 0; font-size: 17px; letter-spacing: 0.3px;">Update:</h4>
        <div class="text-box" style="background: white; border-radius: 10px; padding: 20px 18px; border: 1px solid #e2e8f0;">
          <div style="font-size: 16px; color: #1e293b; margin: 0; line-height: 1.8; word-wrap: break-word; overflow-wrap: break-word;">
            ${escapeHtml(signal.signal).split('\n').filter(line => line.trim().length > 0).map(line => `<p style="margin: 0 0 12px 0; padding: 0; line-height: 1.8;">${line.trim()}</p>`).join('')}
          </div>
        </div>
      </div>

      ${signal.executiveSummary ? `
      <!-- Executive Summary -->
      <div style="margin-bottom: 24px;">
        <h4 style="font-weight: 700; color: #1e293b; margin: 0 0 12px 0; font-size: 17px; letter-spacing: 0.3px;">Executive Summary:</h4>
        <div class="text-box" style="background: white; border-radius: 10px; padding: 20px 18px; border: 1px solid #e2e8f0;">
          <p style="color: #334155; margin: 0; white-space: pre-wrap; line-height: 1.8; word-wrap: break-word; overflow-wrap: break-word; font-size: 16px;">
            ${escapeHtml(signal.executiveSummary)}
          </p>
        </div>
      </div>
      ` : ''}

      ${signal.associatedData ? `
      <!-- Associated Data -->
      <div>
        <h4 style="font-weight: 700; color: #1e293b; margin: 0 0 12px 0; font-size: 17px; letter-spacing: 0.3px;">Associated Data:</h4>
        <div class="text-box" style="background: white; border-radius: 10px; padding: 20px 18px; border: 1px solid #e2e8f0;">
          <p style="color: #334155; margin: 0; white-space: pre-wrap; line-height: 1.8; word-wrap: break-word; overflow-wrap: break-word; font-size: 16px;">
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
        <style>
          @media only screen and (max-width: 600px) {
            .container {
              width: 100% !important;
              max-width: 100% !important;
              padding: 16px !important;
            }
            .content-box {
              padding: 24px 20px !important;
            }
            .header-box {
              padding: 30px 20px !important;
            }
            .signal-box {
              padding: 20px 16px !important;
            }
            .text-box {
              padding: 16px 14px !important;
            }
            h1 {
              font-size: 24px !important;
            }
            h3 {
              font-size: 16px !important;
            }
          }
        </style>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; background-color: #f5f5f5;">
        <div class="container" style="max-width: 900px; width: 100%; margin: 0 auto; padding: 32px 24px;">
          <div class="header-box" style="background: linear-gradient(135deg, #FFFDF7 0%, #FBF9F3 100%); padding: 40px 32px; border-radius: 12px; margin-bottom: 24px; text-align: center;">
            <h1 style="color: #d4af37; margin: 0; font-size: 32px; font-weight: 700;">Daily Portfolio Update</h1>
          </div>
          
          <div class="content-box" style="background: white; padding: 40px 36px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <p style="margin: 0 0 24px 0; font-size: 18px; line-height: 1.7;">
              ${greeting}
            </p>
            
            <p style="margin: 0 0 32px 0; font-size: 17px; color: #475569; line-height: 1.7;">
              Here's your daily portfolio update${hasMultipleCategories ? 's' : ''}:
            </p>

            ${signalSections}

            <div style="text-align: center; margin: 40px 0;">
              <a href="${portfolioUrl}" 
                 style="display: inline-block; background: #d4af37; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 17px; transition: background-color 0.2s;">
                View Full Portfolio
              </a>
            </div>
            
            <p style="margin: 32px 0 0 0; font-size: 15px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 24px; line-height: 1.6;">
              <a href="${preferencesUrl}" style="color: #3b82f6; text-decoration: none;">Manage notification preferences</a>
            </p>
          </div>
          
          <div style="margin-top: 32px; text-align: center; font-size: 13px; color: #94a3b8;">
            <p style="margin: 0;">© ${new Date().getFullYear()} CryptoMentorship. All rights reserved.</p>
          </div>
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

/**
 * Send trial notification email to user
 */
export async function sendTrialNotificationEmail({
  to,
  userName,
  tier,
  trialEndDate,
  isExtension,
  loginUrl,
}: {
  to: string
  userName?: string | null
  tier: 'T1' | 'T2'
  trialEndDate: Date
  isExtension: boolean
  loginUrl: string
}): Promise<void> {
  const greeting = userName ? `Hi ${userName},` : 'Hi there,'
  const tierLabel = tierLabels[tier]
  const tierColor = tierColors[tier]
  const formattedEndDate = formatDate(trialEndDate, 'MMMM d, yyyy')
  const formattedEndDateTime = formatDate(trialEndDate, 'MMMM d, yyyy h:mm a')
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${isExtension ? 'Trial Extended' : 'Trial Subscription Activated'}</title>
        <style>
          @media only screen and (max-width: 600px) {
            .container {
              width: 100% !important;
              max-width: 100% !important;
              padding: 16px !important;
            }
            .content-box {
              padding: 24px 20px !important;
            }
            .header-box {
              padding: 30px 20px !important;
            }
            .trial-box {
              padding: 20px 16px !important;
            }
            h1 {
              font-size: 24px !important;
            }
          }
        </style>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; background-color: #f5f5f5;">
        <div class="container" style="max-width: 900px; width: 100%; margin: 0 auto; padding: 32px 24px;">
          <div class="header-box" style="background: linear-gradient(135deg, #FFFDF7 0%, #FBF9F3 100%); padding: 40px 32px; border-radius: 12px; margin-bottom: 24px; text-align: center;">
            <h1 style="color: #d4af37; margin: 0; font-size: 32px; font-weight: 700;">${isExtension ? 'Trial Extended' : 'Trial Subscription Activated'}</h1>
          </div>
          
          <div class="content-box" style="background: white; padding: 40px 36px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <p style="margin: 0 0 24px 0; font-size: 18px; line-height: 1.7;">
              ${greeting}
            </p>
            
            <p style="margin: 0 0 32px 0; font-size: 17px; color: #475569; line-height: 1.7;">
              ${isExtension 
                ? `Great news! Your trial subscription has been extended.`
                : `We're excited to let you know that a trial subscription has been activated for your account.`}
            </p>

            <div class="trial-box" style="background: ${tierColor.bg}; border: 2px solid ${tierColor.border}; border-radius: 12px; padding: 32px 28px; margin-bottom: 36px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
                <span style="font-size: 24px;">🎉</span>
                <h3 style="font-size: 20px; font-weight: bold; color: ${tierColor.text}; margin: 0; line-height: 1.4;">
                  ${tierLabel} Tier Trial
                </h3>
              </div>

              <div style="margin-bottom: 24px;">
                <h4 style="font-weight: 700; color: #1e293b; margin: 0 0 12px 0; font-size: 17px; letter-spacing: 0.3px;">Trial Details:</h4>
                <div class="text-box" style="background: white; border-radius: 10px; padding: 20px 18px; border: 1px solid #e2e8f0;">
                  <div style="font-size: 16px; color: #1e293b; margin: 0; line-height: 1.8;">
                    <p style="margin: 0 0 12px 0; padding: 0; line-height: 1.8;">
                      <strong>Tier:</strong> ${tierLabel}
                    </p>
                    <p style="margin: 0 0 12px 0; padding: 0; line-height: 1.8;">
                      <strong>Trial End Date:</strong> ${formattedEndDateTime}
                    </p>
                    <p style="margin: 0; padding: 0; line-height: 1.8; color: #64748b; font-size: 15px;">
                      Your trial access will remain active until ${formattedEndDate}.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <p style="margin: 0 0 24px 0; font-size: 17px; color: #475569; line-height: 1.7;">
              ${isExtension
                ? `You can continue enjoying all the benefits of your ${tierLabel} tier subscription.`
                : `You now have access to all the features and content available in the ${tierLabel} tier.`}
            </p>

            <div style="text-align: center; margin: 40px 0;">
              <a href="${loginUrl}" 
                 style="display: inline-block; background: #d4af37; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 17px; transition: background-color 0.2s;">
                Access Your Account
              </a>
            </div>
            
            <p style="margin: 32px 0 0 0; font-size: 15px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 24px; line-height: 1.6;">
              If you have any questions or need assistance, please don't hesitate to reach out to our support team.
            </p>
          </div>
          
          <div style="margin-top: 32px; text-align: center; font-size: 13px; color: #94a3b8;">
            <p style="margin: 0;">© ${new Date().getFullYear()} CryptoMentorship. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `

  const text = `
${isExtension ? 'Trial Extended' : 'Trial Subscription Activated'}

${greeting}

${isExtension 
  ? `Great news! Your trial subscription has been extended.`
  : `We're excited to let you know that a trial subscription has been activated for your account.`}

${tierLabel} Tier Trial

Trial Details:
- Tier: ${tierLabel}
- Trial End Date: ${formattedEndDateTime}

Your trial access will remain active until ${formattedEndDate}.

${isExtension
  ? `You can continue enjoying all the benefits of your ${tierLabel} tier subscription.`
  : `You now have access to all the features and content available in the ${tierLabel} tier.`}

Access Your Account: ${loginUrl}

If you have any questions or need assistance, please don't hesitate to reach out to our support team.

© ${new Date().getFullYear()} CryptoMentorship. All rights reserved.
  `.trim()

  await sendEmail({
    to,
    subject: isExtension ? `Trial Extended - ${tierLabel} Tier` : `Trial Subscription Activated - ${tierLabel} Tier`,
    html,
    text,
  })
}

