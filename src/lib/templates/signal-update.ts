export type SignalUpdateEmailInput = {
  userName?: string | null
  systemName: string
  systemSlug: string
  signalType: 'rotation' | 'zone_action'
  signal: string
  commentary?: string | null
  // Rotation-specific
  fromAsset?: string | null
  toAsset?: string | null
  // SDCA-specific
  zone?: string | null
  action?: string | null
  compositeZ?: number | null
  btcPrice?: number | null
  // Links
  dashboardUrl: string
  preferencesUrl: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function fmtNum(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return '—'
  return value.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

function fmtPrice(value: number): string {
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function buildSignalUpdateEmail(input: SignalUpdateEmailInput) {
  const greeting = input.userName?.trim()
    ? `Hi ${escapeHtml(input.userName.trim())},`
    : 'Hi there,'

  const subject = `${input.systemName} Signal Update — ${input.signal}`

  const safeSystemName = escapeHtml(input.systemName)
  const safeSignal = escapeHtml(input.signal)
  const safeCommentary = input.commentary?.trim()
    ? escapeHtml(input.commentary.trim())
    : null

  const detailRowsHtml: string[] = []
  const detailRowsText: string[] = []

  if (input.signalType === 'rotation') {
    if (input.fromAsset && input.toAsset) {
      detailRowsHtml.push(
        `<tr><td style="padding: 8px 0; color: #64748b; font-size: 14px;">Rotation</td><td style="padding: 8px 0; color: #0f172a; font-size: 14px; text-align: right; font-weight: 600;">${escapeHtml(input.fromAsset)} → ${escapeHtml(input.toAsset)}</td></tr>`
      )
      detailRowsText.push(`Rotation: ${input.fromAsset} → ${input.toAsset}`)
    }
    detailRowsHtml.push(
      `<tr><td style="padding: 8px 0; color: #64748b; font-size: 14px;">Allocation</td><td style="padding: 8px 0; color: #0f172a; font-size: 14px; text-align: right; font-weight: 600;">${safeSignal}</td></tr>`
    )
    detailRowsText.push(`Allocation: ${input.signal}`)
  } else {
    if (input.zone) {
      detailRowsHtml.push(
        `<tr><td style="padding: 8px 0; color: #64748b; font-size: 14px;">Zone</td><td style="padding: 8px 0; color: #0f172a; font-size: 14px; text-align: right; font-weight: 600;">${escapeHtml(input.zone)}</td></tr>`
      )
      detailRowsText.push(`Zone: ${input.zone}`)
    }
    if (input.action) {
      detailRowsHtml.push(
        `<tr><td style="padding: 8px 0; color: #64748b; font-size: 14px;">Action</td><td style="padding: 8px 0; color: #0f172a; font-size: 14px; text-align: right; font-weight: 600;">${escapeHtml(input.action)}</td></tr>`
      )
      detailRowsText.push(`Action: ${input.action}`)
    }
    if (typeof input.compositeZ === 'number') {
      detailRowsHtml.push(
        `<tr><td style="padding: 8px 0; color: #64748b; font-size: 14px;">Composite Z</td><td style="padding: 8px 0; color: #0f172a; font-size: 14px; text-align: right; font-weight: 600; font-variant-numeric: tabular-nums;">${escapeHtml(fmtNum(input.compositeZ))}</td></tr>`
      )
      detailRowsText.push(`Composite Z: ${fmtNum(input.compositeZ)}`)
    }
  }

  if (typeof input.btcPrice === 'number') {
    detailRowsHtml.push(
      `<tr><td style="padding: 8px 0; color: #64748b; font-size: 14px;">BTC Price</td><td style="padding: 8px 0; color: #0f172a; font-size: 14px; text-align: right; font-weight: 600; font-variant-numeric: tabular-nums;">${escapeHtml(fmtPrice(input.btcPrice))}</td></tr>`
    )
    detailRowsText.push(`BTC Price: ${fmtPrice(input.btcPrice)}`)
  }

  const commentaryBlockHtml = safeCommentary
    ? `<p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; line-height: 1.6; white-space: pre-wrap;">${safeCommentary}</p>`
    : ''

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${escapeHtml(subject)}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #111827; margin: 0; padding: 0; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; padding: 32px 20px;">
          <div style="background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 6px 20px rgba(15, 23, 42, 0.08);">
            <div style="display: inline-block; padding: 4px 12px; border-radius: 999px; background: #f1f5f9; color: #475569; font-size: 12px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 16px;">${safeSystemName}</div>
            <h1 style="margin: 0 0 8px 0; font-size: 28px; color: #111827;">Signal Update</h1>
            <p style="margin: 0 0 24px 0; font-size: 22px; color: #d4af37; font-weight: 600;">${safeSignal}</p>

            <p style="margin: 0 0 16px 0; font-size: 15px; color: #475569;">${greeting}</p>
            <p style="margin: 0 0 16px 0; font-size: 15px; color: #475569;">A new signal has been published for ${safeSystemName}.</p>

            ${commentaryBlockHtml}

            <table role="presentation" style="width: 100%; border-collapse: collapse; margin-top: 8px; border-top: 1px solid #e2e8f0;">
              ${detailRowsHtml.join('')}
            </table>

            <div style="text-align: center; margin: 32px 0 8px 0;">
              <a href="${input.dashboardUrl}"
                 style="display: inline-block; background: #d4af37; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">
                View on Dashboard
              </a>
            </div>

            <p style="margin: 24px 0 0 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
              This is not financial advice. All signals are based on systematic rules and historical backtests. Past performance does not guarantee future results.
            </p>
          </div>

          <p style="margin: 18px 0 0; text-align: center; font-size: 12px; color: #94a3b8;">
            Manage your notification preferences in your <a href="${input.preferencesUrl}" style="color: #64748b;">account settings</a>.
          </p>
          <p style="margin: 8px 0 0; text-align: center; font-size: 12px; color: #94a3b8;">© ${new Date().getFullYear()} Stewart &amp; Co.</p>
        </div>
      </body>
    </html>
  `

  const text = `
${input.systemName} — Signal Update
${input.signal}

${input.userName?.trim() ? `Hi ${input.userName.trim()},` : 'Hi there,'}

A new signal has been published for ${input.systemName}.

${input.commentary?.trim() ? `${input.commentary.trim()}\n\n` : ''}${detailRowsText.join('\n')}

View on Dashboard: ${input.dashboardUrl}

This is not financial advice. All signals are based on systematic rules and historical backtests.

Manage your notification preferences: ${input.preferencesUrl}
  `.trim()

  return { subject, html, text }
}
