'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { X, Mail, Calendar, Shield, CheckCircle2, XCircle, BookOpen, MessageSquare, Award, TrendingUp, Eye, Bookmark, HelpCircle, Users, Clock } from 'lucide-react'
import { formatDate } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { RoleSelector } from './RoleSelector'
import { CreateTrialModal } from './CreateTrialModal'

interface UserProfileModalProps {
  userId: string
  currentUserId: string
  isOpen: boolean
  onClose: () => void
}

interface UserProfileData {
  user: {
    id: string
    name: string | null
    email: string
    role: string
    isActive: boolean
    emailVerified: string | null
    lastLoginAt: string | null
    loginCount: number
    createdAt: string
    profileCompleted: boolean
    onboardingCompleted: boolean
  }
  membership: {
    tier: string
    status: string
    currentPeriodEnd: string | null
  } | null
  stats: {
    messages: number
    enrollments: number
    completedEnrollments: number
    certificates: number
    signalTrades: number
    portfolioDailySignals: number
    viewEvents: number
    bookmarks: number
    questions: number
    rsvps: number
    totalLessonsCompleted: number
    totalTimeSpent: number
  }
  recentActivity: Array<{
    id: string
    completedAt: string | null
    lesson: {
      title: string
      track: {
        title: string
        slug: string
      }
    }
  }>
}

export function UserProfileModal({ userId, currentUserId, isOpen, onClose }: UserProfileModalProps) {
  const [data, setData] = useState<UserProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showTrialModal, setShowTrialModal] = useState(false)

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserProfile()
    }
  }, [isOpen, userId])

  const fetchUserProfile = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/users/${userId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch user profile')
      }
      const profileData = await response.json()
      setData(profileData)
    } catch (err: any) {
      setError(err.message || 'Failed to load user profile')
      console.error('Error fetching user profile:', err)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  const formatTimeSpent = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <Card 
        className="card w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
          <CardTitle className="heading-2">User Profile</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-y-auto pt-6">
          {isLoading && (
            <div className="text-center py-12">
              <p className="text-slate-500">Loading user profile...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <p className="text-red-600">{error}</p>
              <Button onClick={fetchUserProfile} className="mt-4" variant="outline">
                Retry
              </Button>
            </div>
          )}

          {data && !isLoading && (
            <div className="space-y-6">
              {/* User Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-lg mb-4">Basic Information</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-slate-500">Name</p>
                      <p className="font-medium">{data.user.name || 'No name'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Email</p>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <p className="font-medium">{data.user.email}</p>
                        {data.user.emailVerified && (
                          <Badge variant="secondary" className="text-xs">
                            Verified
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Role</p>
                      <RoleSelector
                        userId={data.user.id}
                        currentRole={data.user.role}
                        currentUserId={currentUserId}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 mb-2">Membership</p>
                      {data.membership ? (
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary">{data.membership.tier}</Badge>
                          <Badge variant="outline" className="capitalize">
                            {data.membership.status}
                          </Badge>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400 mb-2">No membership</p>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowTrialModal(true)}
                        className="w-full"
                      >
                        {data.membership ? 'Update Trial Subscription' : 'Create Trial Subscription'}
                      </Button>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Status</p>
                      {data.user.isActive ? (
                        <Badge className="badge-preview text-xs mt-1">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge className="badge-locked text-xs mt-1">
                          <XCircle className="w-3 h-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-4">Account Details</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-slate-500">Joined</p>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <p className="font-medium">{formatDate(new Date(data.user.createdAt), 'MMM d, yyyy')}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Last Login</p>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <p className="font-medium">
                          {data.user.lastLoginAt 
                            ? formatDate(new Date(data.user.lastLoginAt), 'MMM d, yyyy HH:mm')
                            : 'Never'}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Login Count</p>
                      <p className="font-medium">{data.user.loginCount}</p>
                    </div>
                    {data.membership && (
                      <div>
                        <p className="text-sm text-slate-500">Membership</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary">{data.membership.tier}</Badge>
                          <Badge variant="outline" className="capitalize">
                            {data.membership.status}
                          </Badge>
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-slate-500">Onboarding</p>
                      <div className="flex items-center gap-2 mt-1">
                        {data.user.profileCompleted && (
                          <Badge variant="secondary" className="text-xs">
                            Profile Complete
                          </Badge>
                        )}
                        {data.user.onboardingCompleted && (
                          <Badge variant="secondary" className="text-xs">
                            Onboarding Complete
                          </Badge>
                        )}
                        {!data.user.profileCompleted && !data.user.onboardingCompleted && (
                          <span className="text-xs text-slate-400">Not completed</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div>
                <h3 className="font-semibold text-lg mb-4">Activity Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="card p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="w-4 h-4 text-slate-500" />
                      <p className="text-sm text-slate-500">Messages</p>
                    </div>
                    <p className="text-2xl font-bold">{data.stats.messages}</p>
                  </Card>
                  
                  <Card className="card p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen className="w-4 h-4 text-slate-500" />
                      <p className="text-sm text-slate-500">Enrollments</p>
                    </div>
                    <p className="text-2xl font-bold">{data.stats.enrollments}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {data.stats.completedEnrollments} completed
                    </p>
                  </Card>
                  
                  <Card className="card p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Award className="w-4 h-4 text-slate-500" />
                      <p className="text-sm text-slate-500">Certificates</p>
                    </div>
                    <p className="text-2xl font-bold">{data.stats.certificates}</p>
                  </Card>
                  
                  <Card className="card p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-slate-500" />
                      <p className="text-sm text-slate-500">Lessons</p>
                    </div>
                    <p className="text-2xl font-bold">{data.stats.totalLessonsCompleted}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {formatTimeSpent(data.stats.totalTimeSpent)} spent
                    </p>
                  </Card>
                  
                  <Card className="card p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="w-4 h-4 text-slate-500" />
                      <p className="text-sm text-slate-500">Views</p>
                    </div>
                    <p className="text-2xl font-bold">{data.stats.viewEvents}</p>
                  </Card>
                  
                  <Card className="card p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Bookmark className="w-4 h-4 text-slate-500" />
                      <p className="text-sm text-slate-500">Bookmarks</p>
                    </div>
                    <p className="text-2xl font-bold">{data.stats.bookmarks}</p>
                  </Card>
                  
                  <Card className="card p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <HelpCircle className="w-4 h-4 text-slate-500" />
                      <p className="text-sm text-slate-500">Questions</p>
                    </div>
                    <p className="text-2xl font-bold">{data.stats.questions}</p>
                  </Card>
                  
                  <Card className="card p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-slate-500" />
                      <p className="text-sm text-slate-500">RSVPs</p>
                    </div>
                    <p className="text-2xl font-bold">{data.stats.rsvps}</p>
                  </Card>
                </div>
              </div>

              {/* Recent Activity */}
              {data.recentActivity.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-4">Recent Learning Activity</h3>
                  <div className="space-y-2">
                    {data.recentActivity.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-sm">{activity.lesson.title}</p>
                          <p className="text-xs text-slate-500">
                            {activity.lesson.track.title}
                          </p>
                        </div>
                        {activity.completedAt && (
                          <p className="text-xs text-slate-500">
                            {formatDate(new Date(activity.completedAt), 'MMM d')}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Trial Modal */}
      {showTrialModal && data && (
        <CreateTrialModal
          userId={data.user.id}
          userName={data.user.name}
          userEmail={data.user.email}
          onSuccess={() => {
            fetchUserProfile() // Refresh user data
          }}
          onClose={() => setShowTrialModal(false)}
        />
      )}
    </div>
  )
}

