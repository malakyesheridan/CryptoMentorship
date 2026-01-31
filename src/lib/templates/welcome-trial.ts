import { formatDate } from '@/lib/dates'

export type WelcomeTrialTemplateInput = {
  firstName?: string | null
  trialEndDate: string | Date
  primaryCTAUrl: string
  supportUrl?: string
}

export function buildWelcomeTrialEmail(input: WelcomeTrialTemplateInput) {
  const name = input.firstName?.trim() ? input.firstName.trim() : 'there'
  const trialEnd = formatDate(input.trialEndDate, 'MMM d, yyyy')
  const supportUrl = input.supportUrl || input.primaryCTAUrl

  const subject = 'Welcome to Stewart & Co - Your Trial Has Started'

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Stewart & Co</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #111827; margin: 0; padding: 0; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; padding: 32px 20px;">
          <div style="background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 6px 20px rgba(15, 23, 42, 0.08);">
            <h1 style="margin: 0 0 12px 0; font-size: 26px; color: #111827;">Welcome, ${name}.</h1>
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #334155;">Your free trial is now active. We are glad you're here.</p>

            <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 10px; padding: 16px; margin-bottom: 20px;">
              <p style="margin: 0; font-size: 15px; color: #7c2d12;"><strong>Trial ends on:</strong> ${trialEnd}</p>
            </div>

            <p style="margin: 0 0 24px 0; font-size: 16px; color: #334155;">Start here to get value today:</p>

            <div style="text-align: center; margin-bottom: 24px;">
              <a href="${input.primaryCTAUrl}" style="display: inline-block; background: #d4af37; color: #111827; padding: 14px 26px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">View the daily updates</a>
            </div>

            <p style="margin: 0 0 16px 0; font-size: 15px; color: #475569;">You will receive a daily update email with new portfolio signals. You can always find the latest updates in your dashboard.</p>

            <p style="margin: 0; font-size: 14px; color: #64748b;">
              Need help? Reply to this email or visit our support page:<br />
              <a href="${supportUrl}" style="color: #2563eb; text-decoration: none;">${supportUrl}</a>
            </p>
          </div>

          <p style="margin: 18px 0 0; text-align: center; font-size: 12px; color: #94a3b8;">(c) ${new Date().getFullYear()} Stewart & Co.</p>
        </div>
      </body>
    </html>
  `

  const text = `
Welcome, ${name}.

Your free trial is now active. Trial ends on ${trialEnd}.

Start here: ${input.primaryCTAUrl}

You will receive a daily update email with new portfolio signals. You can always find the latest updates in your dashboard.

Need help? ${supportUrl}

(c) ${new Date().getFullYear()} Stewart & Co.
  `.trim()

  return { subject, html, text }
}
