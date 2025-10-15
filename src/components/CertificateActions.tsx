'use client'

import { Button } from '@/components/ui/button'
import { Download, Share2 } from 'lucide-react'

interface CertificateActionsProps {
  trackTitle: string
}

export function CertificateActions({ trackTitle }: CertificateActionsProps) {
  const handlePrint = () => {
    window.print()
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Certificate of Completion',
        text: `I completed the "${trackTitle}" learning track!`,
        url: window.location.href
      })
    }
  }

  return (
    <div className="flex items-center justify-center gap-4 mt-8">
      <Button 
        onClick={handlePrint}
        className="flex items-center gap-2"
      >
        <Download className="h-4 w-4" />
        Print Certificate
      </Button>
      
      <Button 
        variant="outline" 
        onClick={handleShare}
        className="flex items-center gap-2"
      >
        <Share2 className="h-4 w-4" />
        Share Certificate
      </Button>
    </div>
  )
}
