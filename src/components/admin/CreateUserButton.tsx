'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { UserPlus } from 'lucide-react'
import { CreateUserWithTrialModal } from './CreateUserWithTrialModal'
import { useRouter } from 'next/navigation'

export function CreateUserButton() {
  const [showModal, setShowModal] = useState(false)
  const router = useRouter()

  return (
    <>
      <Button onClick={() => setShowModal(true)} className="w-full sm:w-auto min-h-[44px]">
        <UserPlus className="w-4 h-4 mr-2" />
        <span className="hidden sm:inline">Create User + Trial</span>
        <span className="sm:hidden">Create User</span>
      </Button>
      
      {showModal && (
        <CreateUserWithTrialModal
          onSuccess={() => {
            router.refresh()
            setShowModal(false)
          }}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}

