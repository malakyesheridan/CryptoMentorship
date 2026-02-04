import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime } from '@/lib/dates'
import { formatRiskProfileLabel } from '@/lib/riskOnboarding/labels'
import { RISK_ONBOARDING_QUESTIONS, RISK_ONBOARDING_WIZARD_KEY } from '@/lib/riskOnboarding/questions'
import { RiskProfileOverrideForm } from '@/components/admin/RiskProfileOverrideForm'

const LIKERT_LABELS: Record<string, string> = {
  strongly_agree: 'Strongly agree',
  agree: 'Agree',
  neutral: 'Neutral',
  disagree: 'Disagree',
  strongly_disagree: 'Strongly disagree',
}

export default async function RiskProfileDetailPage({ params }: { params: { userId: string } }) {
  const userId = params.userId

  const [user, onboarding, profile] = await Promise.all([
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
  ])

  if (!user) {
    return (
      <div className="space-y-4">
        <p>User not found.</p>
        <Link href="/admin/risk-profiles" className="text-sm text-slate-600">
          Back to list
        </Link>
      </div>
    )
  }

  const answers = (onboarding?.answers || {}) as Record<string, any>

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-hero text-3xl sm:text-4xl mb-2">
            <span>Risk</span> <span className="gold">Profile</span>
          </h1>
          <p className="subhead">{user.name || 'Unnamed'} - {user.email}</p>
        </div>
        <Link href="/admin/risk-profiles" className="text-sm text-slate-600">
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
              <div className="text-sm text-slate-600">Recommended</div>
              <div className="text-xl font-semibold text-slate-900">
                {formatRiskProfileLabel(profile.recommendedProfile)}
              </div>
              <div className="text-sm text-slate-600">Score: {profile.score}</div>
              <div className="text-sm text-slate-600">Completed: {formatDateTime(profile.completedAt)}</div>
              {profile.overriddenByAdmin && profile.adminOverrideProfile && (
                <div className="text-sm text-amber-700">
                  Override: {formatRiskProfileLabel(profile.adminOverrideProfile)}
                </div>
              )}
              {profile.adminOverrideReason && (
                <div className="text-sm text-slate-600">Reason: {profile.adminOverrideReason}</div>
              )}
              <div className="text-sm text-slate-600">Drivers:</div>
              <ul className="text-sm text-slate-700 space-y-1">
                {(profile.drivers as string[]).map((driver) => (
                  <li key={driver}>- {driver}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-slate-600">No profile computed yet.</p>
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
                <div key={question.id} className="border-b border-slate-100 pb-3">
                  <div className="text-sm font-semibold text-slate-800">{question.title}</div>
                  <div className="text-sm text-slate-600">{optionLabel}</div>
                </div>
              )
            }

            if (question.type === 'likert-group') {
              const groupAnswers = answers[question.id] || {}
              return (
                <div key={question.id} className="border-b border-slate-100 pb-3">
                  <div className="text-sm font-semibold text-slate-800">{question.title}</div>
                  <div className="mt-2 space-y-2">
                    {question.statements?.map((statement) => (
                      <div key={statement.id} className="text-sm text-slate-600">
                        <span className="font-medium text-slate-700">{statement.label}:</span>{' '}
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
            <div className="text-sm text-slate-600">
              <span className="font-medium text-slate-700">Goal details:</span> {answers.goal_other_text}
            </div>
          )}
          {answers.holdings_text && (
            <div className="text-sm text-slate-600">
              <span className="font-medium text-slate-700">Holdings:</span> {answers.holdings_text}
            </div>
          )}
          {answers.learn_more_text && (
            <div className="text-sm text-slate-600">
              <span className="font-medium text-slate-700">Learning goals:</span> {answers.learn_more_text}
            </div>
          )}
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

