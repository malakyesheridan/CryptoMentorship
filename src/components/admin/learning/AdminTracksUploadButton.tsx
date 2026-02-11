'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UploadModal } from '@/components/learning/UploadModal'

interface AdminTracksUploadButtonProps {
  tracks: Array<{ id: string; title: string }>
}

export function AdminTracksUploadButton({ tracks }: AdminTracksUploadButtonProps) {
  const router = useRouter()
  const [uploadModalOpen, setUploadModalOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setUploadModalOpen(true)} className="flex items-center gap-2">
        <Upload className="h-4 w-4" />
        Upload
      </Button>

      <UploadModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        tracks={tracks}
        onTrackCreated={() => {
          setUploadModalOpen(false)
          router.refresh()
        }}
        onVideoUploaded={() => {
          router.refresh()
        }}
      />
    </>
  )
}
