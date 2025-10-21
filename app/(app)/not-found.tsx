'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Home, Search, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-ivory)]">
      <div className="card p-8 max-w-md text-center">
        <div className="w-24 h-24 bg-gradient-to-br from-gold-400 to-gold-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <Search className="w-12 h-12 text-white" />
        </div>
        
        <h1 className="font-playfair text-4xl font-bold mb-4">404</h1>
        <h2 className="font-playfair text-2xl font-bold mb-4">Page Not Found</h2>
        
        <p className="text-[var(--text-muted)] mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        
        <div className="space-y-3">
          <Button asChild className="btn-gold w-full">
            <Link href="/">
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Link>
          </Button>
          
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            className="w-full"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
        
        <div className="mt-8 text-sm text-[var(--text-muted)]">
          <p>Looking for something specific?</p>
          <div className="flex justify-center gap-4 mt-2">
            <Link href="/research" className="hover:text-gold-600">Research</Link>
            <Link href="/macro" className="hover:text-gold-600">Crypto Compass</Link>
            <Link href="/signals" className="hover:text-gold-600">Signals</Link>
            <Link href="/resources" className="hover:text-gold-600">Resources</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
