export type WelcomeEmailInput = {
  firstName?: string | null
  primaryCTAUrl: string
  supportUrl?: string
}

export function buildWelcomeEmail(input: WelcomeEmailInput) {
  const name = input.firstName?.trim() ? input.firstName.trim() : 'there'
  const supportUrl = input.supportUrl || input.primaryCTAUrl

  const subject = 'Welcome to Stewart & Co'

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
            <p style="margin: 0 0 18px 0; font-size: 16px; color: #334155;">You are officially in. Here is the best place to start:</p>

            <div style="text-align: center; margin-bottom: 24px;">
              <a href="${input.primaryCTAUrl}" style="display: inline-block; background: #d4af37; color: #111827; padding: 14px 26px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Go to your dashboard</a>
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

You are officially in. Start here: ${input.primaryCTAUrl}

You will receive a daily update email with new portfolio signals. You can always find the latest updates in your dashboard.

Need help? ${supportUrl}

(c) ${new Date().getFullYear()} Stewart & Co.
  `.trim()

  return { subject, html, text }
}
