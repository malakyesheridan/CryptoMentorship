'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { createSection } from '@/lib/actions/learning'
import { toast } from 'sonner'

interface NewSectionPageProps {
  params: {
    trackId: string
  }
}

export default function NewSectionPage({ params }: NewSectionPageProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    summary: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await createSection({
        trackId: params.trackId,
        title: formData.title,
        summary: formData.summary || undefined,
      })

      if (result.success) {
        toast.success('Section created successfully')
        router.push(`/admin/learn/tracks/${params.trackId}`)
      }
    } catch (error: any) {
      console.error('Error creating section:', error)
      toast.error(error.message || 'Failed to create section')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        <AdminSidebar />
        <div className="flex-1 p-8">
          <div className="max-w-2xl mx-auto">
            <div className="mb-8">
              <Link href={`/admin/learn/tracks/${params.trackId}`}>
                <Button variant="outline" size="sm" className="mb-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Track
                </Button>
              </Link>
              <h1 className="text-3xl font-bold text-slate-900">Create New Section</h1>
              <p className="text-slate-600 mt-2">
                Add a new section to organize lessons in this track
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Section Information</CardTitle>
                  <CardDescription>
                    Provide details for the new section
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Section Title *
                    </label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., Introduction to Cryptocurrency"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Summary
                    </label>
                    <textarea
                      value={formData.summary}
                      onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                      placeholder="Brief description of what this section covers..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-center justify-end gap-4">
                <Link href={`/admin/learn/tracks/${params.trackId}`}>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={isLoading}>
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? 'Creating...' : 'Create Section'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

