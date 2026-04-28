import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime } from '@/lib/dates'
import { formatRiskProfileLabel } from '@/lib/riskOnboarding/labels'
import { RISK_ONBOARDING_QUESTIONS, RISK_ONBOARDING_WIZARD_KEY } from '@/lib/riskOnboarding/questions'
import { RiskProfileOverrideForm } from '@/components/admin/RiskProfileOverrideForm'
import { getRiskOnboardingConfig } from '@/lib/riskOnboarding/config-store'
import { normalizeScoreToProfileRange } from '@/lib/riskOnboarding/config'
import { getActiveSystems } from '@/lib/system-registry'

const LIKERT_LABELS: Record<string, string> = {
  strongly_agree: 'Strongly agree',
  agree: 'Agree',
  neutral: 'Neutral',
  disagree: 'Disagree',
  strongly_disagree: 'Strongly disagree',
}

export default async function RiskProfileDetailPage({ params }: { params: { userId: string } }) {
  const userId = params.userId

  const [user, onboarding, profile, config, recommendations, assignments] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, defaultRiskProfile: true },
    }),
    prisma.userOnboardingResponse.findUnique({
      where: {
        userId_wizardKey: {
          userId,
          wizardKey: RISK_ONBOARDING_WIZARD_KEY,
        },
      },
    }),
    prisma.userRiskProfile.findUnique({
      where: { userId },
    }),
    getRiskOnboardingConfig(),
    prisma.userSystemRecommendation.findMany({
      where: { userId },
      orderBy: { fitScore: 'desc' },
    }),
    prisma.userSystemAssignment.findMany({
      where: { userId, isActive: true },
      select: { systemSlug: true, assignedBy: true, assignedAt: true },
    }),
  ])

  if (!user) {
    return (
      <div className="space-y-4">
        <p>User not found.</p>
        <Link href="/admin/risk-profiles" className="text-sm text-[var(--text-strong)]">
          Back to list
        </Link>
      </div>
    )
  }

  const answers = (onboarding?.answers || {}) as Record<string, any>
  const normalizedScore =
    profile ? normalizeScoreToProfileRange(profile.score, profile.recommendedProfile, config) : null

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-hero text-3xl sm:text-4xl mb-2">
            <span>Risk</span> <span className="gold">Profile</span>
          </h1>
          <p className="subhead">{user.name || 'Unnamed'} - {user.email}</p>
        </div>
        <Link href="/admin/risk-profiles" className="text-sm text-[var(--text-strong)]">
          Back to list
        </Link>
      </div>

      <Card className="card">
        <CardHeader>
          <CardTitle className="heading-2">Snapshot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {profile ? (
            <>
              <div className="text-sm text-[var(--text-strong)]">Recommended</div>
              <div className="text-xl font-semibold text-[var(--text-strong)]">
                {formatRiskProfileLabel(profile.recommendedProfile)}
              </div>
              <div className="text-sm text-[var(--text-strong)]">Score: {normalizedScore}</div>
              <div className="text-sm text-[var(--text-strong)]">Completed: {formatDateTime(profile.completedAt)}</div>
              {profile.overriddenByAdmin && profile.adminOverrideProfile && (
                <div className="text-sm text-amber-700">
                  Override: {formatRiskProfileLabel(profile.adminOverrideProfile)}
                </div>
              )}
              {profile.adminOverrideReason && (
                <div className="text-sm text-[var(--text-strong)]">Reason: {profile.adminOverrideReason}</div>
              )}
              <div className="text-sm text-[var(--text-strong)]">Drivers:</div>
              <ul className="text-sm text-[var(--text-strong)] space-y-1">
                {(profile.drivers as string[]).map((driver) => (
                  <li key={driver}>- {driver}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-[var(--text-strong)]">No profile computed yet.</p>
          )}
        </CardContent>
      </Card>

      <Card className="card">
        <CardHeader>
          <CardTitle className="heading-2">Answers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {RISK_ONBOARDING_QUESTIONS.map((question) => {
            if (question.type === 'single') {
              const value = answers[question.id]
              const optionLabel = question.options?.find((option) => option.id === value)?.label || 'N/A'
              return (
                <div key={question.id} className="border-b border-[var(--border-subtle)] pb-3">
                  <div className="text-sm font-semibold text-[var(--text-strong)]">{question.title}</div>
                  <div className="text-sm text-[var(--text-strong)]">{optionLabel}</div>
                </div>
              )
            }

            if (question.type === 'likert-group') {
              const groupAnswers = answers[question.id] || {}
              return (
                <div key={question.id} className="border-b border-[var(--border-subtle)] pb-3">
                  <div className="text-sm font-semibold text-[var(--text-strong)]">{question.title}</div>
                  <div className="mt-2 space-y-2">
                    {question.statements?.map((statement) => (
                      <div key={statement.id} className="text-sm text-[var(--text-strong)]">
                        <span className="font-medium text-[var(--text-strong)]">{statement.label}:</span>{' '}
                        {LIKERT_LABELS[groupAnswers[statement.id] as string] || 'N/A'}
                      </div>
                    ))}
                  </div>
                </div>
              )
            }

            return null
          })}

          {answers.goal_other_text && (
            <div className="text-sm text-[var(--text-strong)]">
              <span className="font-medium text-[var(--text-strong)]">Goal details:</span> {answers.goal_other_text}
            </div>
          )}
          {answers.holdings_text && (
            <div className="text-sm text-[var(--text-strong)]">
              <span className="font-medium text-[var(--text-strong)]">Holdings:</span> {answers.holdings_text}
            </div>
          )}
          {answers.learn_more_text && (
            <div className="text-sm text-[var(--text-strong)]">
              <span className="font-medium text-[var(--text-strong)]">Learning goals:</span> {answers.learn_more_text}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="card">
        <CardHeader>
          <CardTitle className="heading-2">System Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          {(() => {
            const assignedSlugs = new Set(assignments.map((a) => a.systemSlug))
            const registry = getActiveSystems()
            const byslug = new Map(recommendations.map((r) => [r.systemSlug, r]))

            if (recommendations.length === 0) {
              return (
                <p className="text-sm text-[var(--text-strong)]">
                  No quiz-based system recommendations yet for this user.
                </p>
              )
            }

            return (
              <div className="space-y-3">
                {registry.map((sys) => {
                  const rec = byslug.get(sys.slug)
                  const assigned = assignedSlugs.has(sys.slug)
                  return (
                    <div
                      key={sys.slug}
                      className="rounded-xl border border-[var(--border-subtle)] p-4"
                      style={{ borderLeftWidth: 4, borderLeftColor: sys.color }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div
                            className="text-xs font-semibold uppercase tracking-wider"
                            style={{ color: sys.color }}
                          >
                            {sys.shortName}
                          </div>
                          <div className="text-sm text-[var(--text-muted)]">{sys.name}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
                            {rec?.fitLabel ?? '—'}
                          </div>
                          <div className="text-base font-semibold tabular-nums text-[var(--text-strong)]">
                            {rec ? `${rec.fitScore}/100` : '—'}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={
                            assigned
                              ? 'rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-700'
                              : 'rounded-full bg-[var(--bg-skeleton)] px-2 py-0.5 text-[var(--text-muted)]'
                          }
                        >
                          {assigned ? 'Currently assigned' : 'Not assigned'}
                        </span>
                        {rec?.recommended && (
                          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-700">
                            Quiz recommends
                          </span>
                        )}
                        {rec?.accepted && (
                          <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-blue-700">
                            User accepted
                          </span>
                        )}
                        {rec?.declined && (
                          <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-rose-700">
                            User declined
                          </span>
                        )}
                      </div>
                      {rec && Array.isArray(rec.reasons) && rec.reasons.length > 0 && (
                        <ul className="mt-2 space-y-1 text-sm text-[var(--text-strong)]">
                          {(rec.reasons as string[]).map((r) => (
                            <li key={r}>- {r}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )
                })}
                <p className="text-xs text-[var(--text-muted)]">
                  To change the user&rsquo;s active system assignments, open them in{' '}
                  <Link href="/admin/users" className="underline">
                    Admin → Users
                  </Link>{' '}
                  and use the System Access section.
                </p>
              </div>
            )
          })()}
        </CardContent>
      </Card>

      <Card className="card">
        <CardHeader>
          <CardTitle className="heading-2">Admin Override</CardTitle>
        </CardHeader>
        <CardContent>
          <RiskProfileOverrideForm
            userId={user.id}
            currentOverrideProfile={profile?.adminOverrideProfile || null}
            currentReason={profile?.adminOverrideReason || ''}
          />
        </CardContent>
      </Card>
    </div>
  )
}
