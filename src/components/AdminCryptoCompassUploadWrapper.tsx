'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import CryptoCompassUpload from './CryptoCompassUpload'

interface AdminCryptoCompassUploadWrapperProps {
  userRole?: string
}

export default function AdminCryptoCompassUploadWrapper({ userRole }: AdminCryptoCompassUploadWrapperProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  if (!['admin', 'editor'].includes(userRole || '')) {
    return null
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="bg-gold-500 hover:bg-gold-600 text-white font-medium"
      >
        <Upload className="w-4 h-4 mr-2" />
        Upload Episode
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl mx-4">
          <DialogHeader>
            <DialogTitle>Upload New Episode</DialogTitle>
            <DialogDescription>Create a new Crypto Compass episode</DialogDescription>
          </DialogHeader>
          <CryptoCompassUpload
            onSuccess={() => {
              setOpen(false)
              router.refresh()
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
