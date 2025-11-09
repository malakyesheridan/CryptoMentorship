'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface DeleteUserButtonProps {
  userId: string
  userEmail: string
  userName?: string | null
  currentUserId: string
}

export function DeleteUserButton({ userId, userEmail, userName, currentUserId }: DeleteUserButtonProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    // Prevent deleting yourself
    if (userId === currentUserId) {
      toast.error('Cannot delete your own account')
      return
    }

    const confirmMessage = `Are you sure you want to delete ${userName || userEmail}? This action cannot be undone and will delete all associated data.`
    
    if (!confirm(confirmMessage)) {
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete user')
      }

      toast.success('User deleted successfully')
      router.refresh()
    } catch (error: any) {
      console.error('Error deleting user:', error)
      toast.error(error.message || 'Failed to delete user')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-red-600 hover:text-red-700 hover:bg-red-50"
      onClick={handleDelete}
      disabled={isDeleting || userId === currentUserId}
      title={userId === currentUserId ? 'Cannot delete your own account' : `Delete ${userName || userEmail}`}
    >
      <Trash2 className="w-4 h-4" />
    </Button>
  )
}

