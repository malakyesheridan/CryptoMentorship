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
  onSuccess?: () => void // Optional callback for parent components to refresh data
}

export function RoleSelector({ userId, currentRole, currentUserId, className, onSuccess }: RoleSelectorProps) {
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
      onSuccess?.() // Call parent callback if provided
    } catch (error: any) {
      console.error('Error updating role:', error)
      toast.error(error.message || 'Failed to update role')
      setSelectedRole(currentRole)
    } finally {
      setIsUpdating(false)
    }
  }

  const roleColors: Record<string, string> = {
    admin: 'border-[#c03030] text-[#c03030] bg-[#2e1a1a]',
    editor: 'border-[#4a7cc3] text-[#4a7cc3] bg-[#1a1e2e]',
    member: 'border-[#4a7c3f] text-[#4a7c3f] bg-[#1a2e1a]',
    guest: 'border-[var(--border-subtle)] text-[var(--text-strong)] bg-[#1a1815]',
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

