export type WelcomeEmailInput = {
  firstName?: string | null
}

export function buildWelcomeEmail(input: WelcomeEmailInput) {
  const name = input.firstName?.trim() ? input.firstName.trim() : 'there'

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
            <p style="margin: 0 0 18px 0; font-size: 16px; color: #334155;">Thanks for joining Stewart &amp; Co. You now have full access to the platform.</p>

            <p style="margin: 0 0 12px 0; font-size: 15px; color: #475569;"><strong>What you can expect:</strong></p>
            <ul style="margin: 0 0 18px 0; padding-left: 20px; color: #475569; font-size: 15px; line-height: 1.7;">
              <li>Daily portfolio updates delivered by email</li>
              <li>Learning hub tracks and videos to level up your skills</li>
              <li>Community chat for live discussion and support</li>
              <li>Crypto Compass research and breakdowns</li>
            </ul>

            <p style="margin: 0; font-size: 14px; color: #64748b;">
              Need help? Reply to this email and we will take care of you.
            </p>
          </div>

          <p style="margin: 18px 0 0; text-align: center; font-size: 12px; color: #94a3b8;">(c) ${new Date().getFullYear()} Stewart &amp; Co.</p>
        </div>
      </body>
    </html>
  `

  const text = `
Welcome, ${name}.

Thanks for joining Stewart & Co. You now have full access to the platform.

What you can expect:
- Daily portfolio updates delivered by email
- Learning hub tracks and videos to level up your skills
- Community chat for live discussion and support
- Crypto Compass research and breakdowns

Need help? Reply to this email and we will take care of you.

(c) ${new Date().getFullYear()} Stewart & Co.
  `.trim()

  return { subject, html, text }
}
