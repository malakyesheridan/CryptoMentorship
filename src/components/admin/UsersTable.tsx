'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/dates'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { DeleteUserButton } from '@/components/admin/DeleteUserButton'
import { RoleSelector } from '@/components/admin/RoleSelector'
import { UserProfileModal } from '@/components/admin/UserProfileModal'
import { 
  Mail,
  Calendar,
  CheckCircle2,
  XCircle,
  Eye,
  Power
} from 'lucide-react'
import { toast } from 'sonner'

interface User {
  id: string
  name: string | null
  email: string
  role: string
  isActive: boolean
  createdAt: Date
  memberships: Array<{
    tier: string
    status: string
  }>
  _count: {
    messages: number
    enrollments: number
    certificates: number
  }
}

interface UsersTableProps {
  users: User[]
  currentUserId: string
}

export function UsersTable({ users, currentUserId }: UsersTableProps) {
  const router = useRouter()
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [isTogglingStatus, setIsTogglingStatus] = useState<string | null>(null)

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    // Prevent deactivating yourself
    if (userId === currentUserId && currentStatus) {
      toast.error('Cannot deactivate your own account')
      return
    }

    setIsTogglingStatus(userId)
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update status')
      }

      toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`)
      router.refresh()
    } catch (error: any) {
      console.error('Error updating status:', error)
      toast.error(error.message || 'Failed to update status')
    } finally {
      setIsTogglingStatus(null)
    }
  }

  return (
    <>
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
                    <tr 
                      key={user.id} 
                      className="border-b border-[color:var(--border-subtle)] hover:bg-slate-50 cursor-pointer"
                      onClick={() => setSelectedUserId(user.id)}
                    >
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium text-slate-800">{user.name || 'No name'}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <p className="text-sm text-slate-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                        <RoleSelector
                          userId={user.id}
                          currentRole={user.role}
                          currentUserId={currentUserId}
                        />
                      </td>
                      <td className="py-4 px-4">
                        {membership ? (
                          <div>
                            <Badge variant="secondary" className="text-xs">
                              {membership.tier}
                            </Badge>
                            <p className="text-xs text-slate-500 mt-1 capitalize">
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
                      <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
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
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => handleToggleStatus(user.id, user.isActive)}
                            disabled={isTogglingStatus === user.id || (user.id === currentUserId && user.isActive)}
                            title={user.id === currentUserId && user.isActive ? 'Cannot deactivate your own account' : `Toggle ${user.isActive ? 'deactivate' : 'activate'}`}
                          >
                            <Power className={cn(
                              "w-3 h-3",
                              user.isActive ? "text-red-600" : "text-green-600"
                            )} />
                          </Button>
                        </div>
                      </td>
                      <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => setSelectedUserId(user.id)}
                            title="View profile"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {currentUserId && (
                            <DeleteUserButton
                              userId={user.id}
                              userEmail={user.email}
                              userName={user.name}
                              currentUserId={currentUserId}
                            />
                          )}
                        </div>
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

      {selectedUserId && (
        <UserProfileModal
          userId={selectedUserId}
          currentUserId={currentUserId}
          isOpen={!!selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </>
  )
}

