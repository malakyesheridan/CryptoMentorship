// Daily-digest variant of the signal update email. Renders 1–N system
// updates in a single email so users don't get spammed when multiple
// systems change on the same day. Falls back gracefully to a single-system
// layout when only one signal is in the digest.

export type DigestSignal = {
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
  // UI
  color: string
}

export type DailySignalDigestInput = {
  userName?: string | null
  signals: DigestSignal[]
  dashboardUrl: string
  preferencesUrl: string
  date?: string | Date
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

function formatDateLabel(value: string | Date | undefined): string {
  const d = value ? new Date(value) : new Date()
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

function safeColor(input: string): string {
  // Inline-style sink — only allow simple CSS color tokens (#hex / rgb / named).
  // Anything containing a quote or angle bracket is replaced with a fallback.
  if (/[<>"'`]/.test(input)) return '#d4af37'
  return input
}

function buildSignalSectionHtml(signal: DigestSignal): string {
  const accent = safeColor(signal.color)
  const safeSystem = escapeHtml(signal.systemName)
  const safeSignal = escapeHtml(signal.signal)
  const safeCommentary = signal.commentary?.trim()
    ? escapeHtml(signal.commentary.trim())
    : null

  const detailRows: string[] = []

  if (signal.signalType === 'rotation') {
    if (signal.fromAsset && signal.toAsset) {
      detailRows.push(
        `<tr><td style="padding: 6px 0; color: #64748b; font-size: 13px;">Rotation</td><td style="padding: 6px 0; color: #0f172a; font-size: 13px; text-align: right; font-weight: 600;">${escapeHtml(signal.fromAsset)} → ${escapeHtml(signal.toAsset)}</td></tr>`
      )
    }
    detailRows.push(
      `<tr><td style="padding: 6px 0; color: #64748b; font-size: 13px;">Allocation</td><td style="padding: 6px 0; color: #0f172a; font-size: 13px; text-align: right; font-weight: 600;">${safeSignal}</td></tr>`
    )
  } else {
    if (signal.zone) {
      detailRows.push(
        `<tr><td style="padding: 6px 0; color: #64748b; font-size: 13px;">Zone</td><td style="padding: 6px 0; color: #0f172a; font-size: 13px; text-align: right; font-weight: 600;">${escapeHtml(signal.zone)}</td></tr>`
      )
    }
    if (signal.action) {
      detailRows.push(
        `<tr><td style="padding: 6px 0; color: #64748b; font-size: 13px;">Action</td><td style="padding: 6px 0; color: #0f172a; font-size: 13px; text-align: right; font-weight: 600;">${escapeHtml(signal.action)}</td></tr>`
      )
    }
    if (typeof signal.compositeZ === 'number') {
      detailRows.push(
        `<tr><td style="padding: 6px 0; color: #64748b; font-size: 13px;">Composite Z</td><td style="padding: 6px 0; color: #0f172a; font-size: 13px; text-align: right; font-weight: 600; font-variant-numeric: tabular-nums;">${escapeHtml(fmtNum(signal.compositeZ))}</td></tr>`
      )
    }
  }

  if (typeof signal.btcPrice === 'number') {
    detailRows.push(
      `<tr><td style="padding: 6px 0; color: #64748b; font-size: 13px;">BTC Price</td><td style="padding: 6px 0; color: #0f172a; font-size: 13px; text-align: right; font-weight: 600; font-variant-numeric: tabular-nums;">${escapeHtml(fmtPrice(signal.btcPrice))}</td></tr>`
    )
  }

  const commentaryHtml = safeCommentary
    ? `<p style="margin: 8px 0 0 0; font-size: 14px; color: #334155; line-height: 1.55; white-space: pre-wrap;">${safeCommentary}</p>`
    : ''

  return `
    <div style="border-left: 4px solid ${accent}; background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
      <div style="display: inline-block; padding: 3px 10px; border-radius: 999px; background: ${accent}1A; color: ${accent}; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;">${safeSystem}</div>
      <p style="margin: 8px 0 0 0; font-size: 18px; font-weight: 700; color: #0f172a;">${safeSignal}</p>
      <table role="presentation" style="width: 100%; border-collapse: collapse; margin-top: 8px;">
        ${detailRows.join('')}
      </table>
      ${commentaryHtml}
    </div>
  `
}

function buildSignalSectionText(signal: DigestSignal): string {
  const lines: string[] = []
  lines.push(`— ${signal.systemName} —`)
  lines.push(signal.signal)
  if (signal.signalType === 'rotation' && signal.fromAsset && signal.toAsset) {
    lines.push(`Rotation: ${signal.fromAsset} → ${signal.toAsset}`)
  }
  if (signal.signalType === 'zone_action') {
    if (signal.zone) lines.push(`Zone: ${signal.zone}`)
    if (signal.action) lines.push(`Action: ${signal.action}`)
    if (typeof signal.compositeZ === 'number') {
      lines.push(`Composite Z: ${fmtNum(signal.compositeZ)}`)
    }
  }
  if (typeof signal.btcPrice === 'number') {
    lines.push(`BTC Price: ${fmtPrice(signal.btcPrice)}`)
  }
  if (signal.commentary?.trim()) lines.push(signal.commentary.trim())
  return lines.join('\n')
}

export function buildDailySignalDigestEmail(input: DailySignalDigestInput) {
  const signals = input.signals ?? []
  const greeting = input.userName?.trim()
    ? `Hi ${escapeHtml(input.userName.trim())},`
    : 'Hi there,'

  const dateLabel = formatDateLabel(input.date)
  const subject =
    signals.length > 1
      ? `Stewart & Co — Daily Signal Update (${signals.length} systems)`
      : 'Stewart & Co — Daily Signal Update'

  const sectionsHtml = signals.map(buildSignalSectionHtml).join('')
  const sectionsText = signals.map(buildSignalSectionText).join('\n\n')

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
            <h1 style="margin: 0 0 4px 0; font-size: 26px; color: #111827;">Your Daily Signal Update</h1>
            ${dateLabel ? `<p style="margin: 0 0 20px 0; font-size: 13px; color: #64748b;">${escapeHtml(dateLabel)}</p>` : ''}

            <p style="margin: 0 0 16px 0; font-size: 15px; color: #475569;">${greeting}</p>
            <p style="margin: 0 0 20px 0; font-size: 15px; color: #475569;">
              ${
                signals.length > 1
                  ? `${signals.length} systems updated their signals today.`
                  : 'A system updated its signal today.'
              }
            </p>

            ${sectionsHtml}

            <div style="text-align: center; margin: 28px 0 8px 0;">
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
Your Daily Signal Update${dateLabel ? `\n${dateLabel}` : ''}

${input.userName?.trim() ? `Hi ${input.userName.trim()},` : 'Hi there,'}

${
  signals.length > 1
    ? `${signals.length} systems updated their signals today.`
    : 'A system updated its signal today.'
}

${sectionsText}

View on Dashboard: ${input.dashboardUrl}

This is not financial advice. All signals are based on systematic rules and historical backtests.

Manage your notification preferences: ${input.preferencesUrl}
  `.trim()

  return { subject, html, text }
}
