'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { deleteTrack } from '@/lib/actions/learning'
import { toast } from 'sonner'

interface DeleteTrackButtonProps {
  trackId: string
}

export function DeleteTrackButton({ trackId }: DeleteTrackButtonProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this track? This action cannot be undone.')) {
      return
    }

    setIsDeleting(true)
    try {
      const result = await deleteTrack(trackId)
      if (result.success) {
        toast.success('Track deleted successfully')
        router.push('/admin/learn/tracks')
      }
    } catch (error: any) {
      console.error('Error deleting track:', error)
      toast.error(error.message || 'Failed to delete track')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Button 
      variant="destructive" 
      onClick={handleDelete}
      disabled={isDeleting}
    >
      <Trash2 className="h-4 w-4 mr-2" />
      {isDeleting ? 'Deleting...' : 'Delete'}
    </Button>
  )
}

