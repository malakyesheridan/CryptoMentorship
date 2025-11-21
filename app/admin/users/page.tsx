import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Shield, CheckCircle2, XCircle } from 'lucide-react'
import { UsersTable } from '@/components/admin/UsersTable'
import { CreateUserButton } from '@/components/admin/CreateUserButton'

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
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        <div>
          <h1 className="heading-hero text-3xl sm:text-4xl mb-2">
            <span>User</span> <span className="gold">Management</span>
          </h1>
          <p className="subhead">Manage users, roles, and memberships</p>
        </div>
        <CreateUserButton />
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
      {session?.user && (
        <UsersTable 
          users={users.map(u => ({
            ...u,
            createdAt: u.createdAt
          }))} 
          currentUserId={session.user.id}
        />
      )}
    </div>
  )
}

