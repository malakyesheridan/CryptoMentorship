'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface RoleSelectorProps {
  userId: string
  currentRole: string
  currentUserId: string
  className?: string
}

export function RoleSelector({ userId, currentRole, currentUserId, className }: RoleSelectorProps) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)
  const [selectedRole, setSelectedRole] = useState(currentRole)

  const handleRoleChange = async (newRole: string) => {
    if (newRole === currentRole) return
    
    // Prevent changing your own role
    if (userId === currentUserId) {
      toast.error('Cannot change your own role')
      setSelectedRole(currentRole)
      return
    }

    setIsUpdating(true)
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update role')
      }

      toast.success('Role updated successfully')
      setSelectedRole(newRole)
      router.refresh()
    } catch (error: any) {
      console.error('Error updating role:', error)
      toast.error(error.message || 'Failed to update role')
      setSelectedRole(currentRole)
    } finally {
      setIsUpdating(false)
    }
  }

  const roleColors: Record<string, string> = {
    admin: 'border-red-300 text-red-700 bg-red-50',
    editor: 'border-blue-300 text-blue-700 bg-blue-50',
    member: 'border-green-300 text-green-700 bg-green-50',
    guest: 'border-slate-300 text-slate-700 bg-slate-50',
  }

  return (
    <select
      value={selectedRole}
      onChange={(e) => handleRoleChange(e.target.value)}
      disabled={isUpdating || userId === currentUserId}
      className={cn(
        "text-xs font-medium capitalize px-2 py-1 rounded border",
        roleColors[selectedRole] || roleColors.guest,
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
    >
      <option value="guest">Guest</option>
      <option value="member">Member</option>
      <option value="editor">Editor</option>
      <option value="admin">Admin</option>
    </select>
  )
}

