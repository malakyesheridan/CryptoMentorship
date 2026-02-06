import { format } from 'date-fns'

export type TrialReminderDigestEntry = {
  membershipId: string
  userId: string
  name: string | null
  email: string
  tier: string
  trialEnd: Date
  joinedAt: Date
}

function formatDateTime(value: Date) {
  return format(value, 'yyyy-MM-dd HH:mm')
}

function formatDate(value: Date) {
  return format(value, 'yyyy-MM-dd')
}

export function buildTrialReminderDigestEmail(params: {
  entries: TrialReminderDigestEntry[]
  totalCount: number
  runDate: string
  appUrl: string
}) {
  const maxList = 30
  const list = params.entries.slice(0, maxList)
  const remaining = params.entries.length - list.length
  const adminUrl = `${params.appUrl}/admin/users`

  const rowsHtml = list.map((entry) => `
    <tr>
      <td style="padding: 8px 6px; border-bottom: 1px solid #e2e8f0;">${entry.name || 'No name'}</td>
      <td style="padding: 8px 6px; border-bottom: 1px solid #e2e8f0;">${entry.email}</td>
      <td style="padding: 8px 6px; border-bottom: 1px solid #e2e8f0;">${entry.tier}</td>
      <td style="padding: 8px 6px; border-bottom: 1px solid #e2e8f0;">${formatDateTime(entry.trialEnd)} UTC</td>
      <td style="padding: 8px 6px; border-bottom: 1px solid #e2e8f0;">${formatDate(entry.joinedAt)}</td>
      <td style="padding: 8px 6px; border-bottom: 1px solid #e2e8f0;">
        <a href="${adminUrl}?email=${encodeURIComponent(entry.email)}" style="color: #d4af37; text-decoration: none;">View</a>
      </td>
    </tr>
  `).join('')

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Trial users with 7 days remaining</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 720px; margin: 0 auto; padding: 20px;">
        <div style="background: #fffdf7; padding: 24px; border-radius: 8px; margin-bottom: 20px;">
          <h1 style="color: #1e293b; margin: 0 0 6px 0; font-size: 22px;">Trial users with 7 days remaining</h1>
          <p style="margin: 0; color: #64748b; font-size: 14px;">Digest date: ${params.runDate}</p>
        </div>

        <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <p style="margin: 0 0 12px 0;">Found <strong>${params.totalCount}</strong> trial member(s) ending in 7 days.</p>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="text-align: left; color: #64748b;">
                <th style="padding: 8px 6px; border-bottom: 1px solid #e2e8f0;">Name</th>
                <th style="padding: 8px 6px; border-bottom: 1px solid #e2e8f0;">Email</th>
                <th style="padding: 8px 6px; border-bottom: 1px solid #e2e8f0;">Tier</th>
                <th style="padding: 8px 6px; border-bottom: 1px solid #e2e8f0;">Trial ends</th>
                <th style="padding: 8px 6px; border-bottom: 1px solid #e2e8f0;">Joined</th>
                <th style="padding: 8px 6px; border-bottom: 1px solid #e2e8f0;">Admin</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          ${remaining > 0 ? `<p style="margin: 12px 0 0 0; color: #64748b; font-size: 12px;">+${remaining} more not shown.</p>` : ''}
        </div>

        <div style="margin-top: 20px; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0;">Admin users list: <a href="${adminUrl}" style="color: #64748b;">${adminUrl}</a></p>
        </div>
      </body>
    </html>
  `

  const textLines = [
    `Trial users with 7 days remaining (Digest date: ${params.runDate})`,
    '',
    `Found ${params.totalCount} trial member(s) ending in 7 days.`,
    '',
    ...list.map((entry) => (
      `- ${entry.name || 'No name'} | ${entry.email} | ${entry.tier} | ends ${formatDateTime(entry.trialEnd)} UTC | joined ${formatDate(entry.joinedAt)} | ${adminUrl}?email=${encodeURIComponent(entry.email)}`
    ))
  ]
  if (remaining > 0) {
    textLines.push('', `+${remaining} more not shown.`)
  }
  textLines.push('', `Admin list: ${adminUrl}`)

  return {
    subject: `Trial users with 7 days remaining - ${params.runDate}`,
    html,
    text: textLines.join('\n')
  }
}
