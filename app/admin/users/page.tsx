import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { formatDate } from '@/lib/dates'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { DeleteUserButton } from '@/components/admin/DeleteUserButton'
import { 
  Users, 
  Search,
  Mail,
  Calendar,
  Shield,
  CheckCircle2,
  XCircle
} from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const session = await getServerSession(authOptions)
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      memberships: {
        take: 1,
        orderBy: { createdAt: 'desc' }
      },
      _count: {
        select: {
          messages: true,
          enrollments: true,
          certificates: true
        }
      }
    }
  })

  const userStats = {
    total: users.length,
    active: users.filter(u => u.isActive).length,
    admins: users.filter(u => u.role === 'admin').length,
    editors: users.filter(u => u.role === 'editor').length,
    members: users.filter(u => u.role === 'member').length,
    guests: users.filter(u => u.role === 'guest').length,
    withMembership: users.filter(u => u.memberships.length > 0).length
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="heading-hero text-4xl mb-2">
          <span>User</span> <span className="gold">Management</span>
        </h1>
        <p className="subhead">Manage users, roles, and memberships</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="heading-2 text-sm">Total Users</CardTitle>
            <Users className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.total}</div>
            <p className="text-xs text-slate-500">
              {userStats.active} active
            </p>
          </CardContent>
        </Card>

        <Card className="card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="heading-2 text-sm">Roles</CardTitle>
            <Shield className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userStats.admins + userStats.editors}
            </div>
            <p className="text-xs text-slate-500">
              {userStats.admins} admin, {userStats.editors} editor
            </p>
          </CardContent>
        </Card>

        <Card className="card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="heading-2 text-sm">Members</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.members}</div>
            <p className="text-xs text-slate-500">
              {userStats.withMembership} with membership
            </p>
          </CardContent>
        </Card>

        <Card className="card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="heading-2 text-sm">Guests</CardTitle>
            <XCircle className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.guests}</div>
            <p className="text-xs text-slate-500">Unregistered users</p>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card className="card">
        <CardHeader>
          <CardTitle>All Users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[color:var(--border-subtle)]">
                  <th className="text-left py-3 px-4 font-medium text-slate-600">User</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Role</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Membership</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Activity</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Joined</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const membership = user.memberships[0]
                  return (
                    <tr key={user.id} className="border-b border-[color:var(--border-subtle)] hover:bg-slate-50">
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium text-slate-800">{user.name || 'No name'}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <p className="text-sm text-slate-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "capitalize",
                            user.role === 'admin' && "border-red-300 text-red-700",
                            user.role === 'editor' && "border-blue-300 text-blue-700",
                            user.role === 'member' && "border-green-300 text-green-700"
                          )}
                        >
                          {user.role}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        {membership ? (
                          <div>
                            <Badge variant="secondary" className="text-xs">
                              {membership.tier}
                            </Badge>
                            <p className="text-xs text-slate-500 mt-1">
                              {membership.status}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">No membership</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm text-slate-600">
                          <p>{user._count.messages} messages</p>
                          <p>{user._count.enrollments} enrollments</p>
                          <p>{user._count.certificates} certificates</p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1 text-sm text-slate-500">
                          <Calendar className="w-4 h-4" />
                          {formatDate(user.createdAt, 'MMM d, yyyy')}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {user.isActive ? (
                          <Badge className="badge-preview text-xs">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge className="badge-locked text-xs">
                            <XCircle className="w-3 h-3 mr-1" />
                            Inactive
                          </Badge>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        {session?.user && (
                          <DeleteUserButton
                            userId={user.id}
                            userEmail={user.email}
                            userName={user.name}
                            currentUserId={session.user.id}
                          />
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          
          {users.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-500">No users found.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

