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
      <Button onClick={() => setShowModal(true)}>
        <UserPlus className="w-4 h-4 mr-2" />
        Create User + Trial
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

