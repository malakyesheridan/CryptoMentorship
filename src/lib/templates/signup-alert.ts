type SignupAlertDetails = {
  name?: string | null
  email: string
  userId: string
  role?: string | null
  createdAt: Date
  source: string
  provider?: string | null
  trial: boolean
  trialEndsAt?: Date | null
  membershipStatus?: string | null
  membershipTier?: string | null
  referralCode?: string | null
  referralSource?: string | null
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
  utmTerm?: string | null
  utmContent?: string | null
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatValue(value: string | null | undefined): string {
  if (!value) return 'N/A'
  return value
}

function formatDate(value: Date | null | undefined): string {
  if (!value) return 'N/A'
  return value.toISOString()
}

export function buildSignupAlertEmail(details: SignupAlertDetails) {
  const rows: Array<{ label: string; value: string }> = [
    { label: 'Name', value: formatValue(details.name || null) },
    { label: 'Email', value: formatValue(details.email) },
    { label: 'User ID', value: formatValue(details.userId) },
    { label: 'Role', value: formatValue(details.role || null) },
    { label: 'Signup Time (UTC)', value: formatDate(details.createdAt) },
    { label: 'Source', value: formatValue(details.source) },
    { label: 'Provider', value: formatValue(details.provider || null) },
    { label: 'Trial', value: details.trial ? 'Yes' : 'No' },
    { label: 'Trial Ends (UTC)', value: formatDate(details.trialEndsAt || null) },
    { label: 'Membership Status', value: formatValue(details.membershipStatus || null) },
    { label: 'Membership Tier', value: formatValue(details.membershipTier || null) },
    { label: 'Referral Code', value: formatValue(details.referralCode || null) },
    { label: 'Referral Source', value: formatValue(details.referralSource || null) },
    { label: 'UTM Source', value: formatValue(details.utmSource || null) },
    { label: 'UTM Medium', value: formatValue(details.utmMedium || null) },
    { label: 'UTM Campaign', value: formatValue(details.utmCampaign || null) },
    { label: 'UTM Term', value: formatValue(details.utmTerm || null) },
    { label: 'UTM Content', value: formatValue(details.utmContent || null) },
  ]

  const subjectName = details.name || details.email
  const subject = `New signup: ${subjectName}${details.trial ? ' (trial)' : ''}`

  const htmlRows = rows
    .map(
      (row) =>
        `<tr><td style="padding:8px 12px; font-weight:600; color:#1f2937; width:180px;">${escapeHtml(row.label)}</td><td style="padding:8px 12px; color:#374151;">${escapeHtml(row.value)}</td></tr>`
    )
    .join('')

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Signup Alert</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #111827; max-width: 640px; margin: 0 auto; padding: 20px;">
        <div style="background: #111827; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 22px;">New Member Signup Alert</h1>
          <p style="margin: 6px 0 0; color: #d1d5db;">Informative alert only</p>
        </div>

        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <table style="width: 100%; border-collapse: collapse;">
            ${htmlRows}
          </table>
        </div>

        <p style="margin: 20px 0 0; font-size: 12px; color: #6b7280;">
          This is an automated alert for a new signup. No action is required.
        </p>
      </body>
    </html>
  `

  const text = [
    'New Member Signup Alert',
    '',
    ...rows.map((row) => `${row.label}: ${row.value}`),
    '',
    'This is an automated alert for a new signup. No action is required.'
  ].join('\n')

  return { subject, html, text }
}

export type { SignupAlertDetails }
