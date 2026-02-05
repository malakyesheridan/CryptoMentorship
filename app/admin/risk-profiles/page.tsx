import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/dates'
import { formatRiskProfileLabel } from '@/lib/riskOnboarding/labels'
import { RISK_ONBOARDING_WIZARD_KEY } from '@/lib/riskOnboarding/questions'

export const dynamic = 'force-dynamic'

export default async function RiskProfilesPage() {
  const [profiles, onboardingResponses] = await Promise.all([
    prisma.userRiskProfile.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, defaultRiskProfile: true } },
      },
      orderBy: { completedAt: 'desc' },
    }),
    prisma.userOnboardingResponse.findMany({
      where: { wizardKey: RISK_ONBOARDING_WIZARD_KEY },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { updatedAt: 'desc' },
    }),
  ])

  const profileByUser = new Map(profiles.map((profile) => [profile.userId, profile]))
  const rows = onboardingResponses.map((response) => ({
    userId: response.userId,
    userName: response.user.name,
    userEmail: response.user.email,
    status: response.status,
    startedAt: response.startedAt,
    profile: profileByUser.get(response.userId) || null,
  }))

  for (const profile of profiles) {
    if (!rows.find((row) => row.userId === profile.userId)) {
      rows.push({
        userId: profile.userId,
        userName: profile.user.name || 'Unnamed',
        userEmail: profile.user.email,
        status: 'COMPLETED',
        startedAt: profile.completedAt,
        profile,
      })
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="heading-hero text-3xl sm:text-4xl mb-2">
            <span>Risk</span> <span className="gold">Profiles</span>
          </h1>
          <p className="subhead">Review onboarding responses and recommendations</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/risk-profiles/settings">Edit scoring & questions</Link>
        </Button>
      </div>

      <Card className="card">
        <CardHeader>
          <CardTitle className="heading-2">Profiles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="py-2 pr-4">Member</th>
                  <th className="py-2 pr-4">Recommended</th>
                  <th className="py-2 pr-4">Score</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Completed</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rows.map((row) => {
                  const status = row.status || 'NOT_STARTED'
                  const profile = row.profile
                  return (
                    <tr key={row.userId} className="text-slate-700">
                      <td className="py-3 pr-4">
                        <div className="font-medium text-slate-900">
                          {row.userName || 'Unnamed'}
                        </div>
                        <div className="text-xs text-slate-500">{row.userEmail}</div>
                      </td>
                      <td className="py-3 pr-4">
                        {profile ? (
                          <>
                            <div className="font-semibold text-slate-900">
                              {formatRiskProfileLabel(profile.recommendedProfile)}
                            </div>
                            {profile.overriddenByAdmin && profile.adminOverrideProfile && (
                              <div className="text-xs text-amber-600">
                                Override: {formatRiskProfileLabel(profile.adminOverrideProfile)}
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-slate-500">Pending</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">{profile ? profile.score : '-'}</td>
                      <td className="py-3 pr-4">
                        <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                          {status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        {profile ? formatDateTime(profile.completedAt) : '-'}
                      </td>
                      <td className="py-3">
                        <Link
                          href={`/admin/risk-profiles/${row.userId}`}
                          className="text-sm font-semibold text-slate-900 hover:text-slate-700"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

