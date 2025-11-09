'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Save, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { updateSection, deleteSection } from '@/lib/actions/learning'
import { toast } from 'sonner'

interface EditSectionPageProps {
  params: {
    trackId: string
    sectionId: string
  }
}

export default function EditSectionPage({ params }: EditSectionPageProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingSection, setIsLoadingSection] = useState(true)
  const [formData, setFormData] = useState({
    title: '',
    summary: '',
  })

  useEffect(() => {
    async function fetchSection() {
      try {
        const res = await fetch(`/api/admin/learn/sections/${params.sectionId}`)
        if (!res.ok) {
          throw new Error('Failed to fetch section')
        }
        const section = await res.json()
        
        setFormData({
          title: section.title || '',
          summary: section.summary || '',
        })
      } catch (error) {
        console.error('Error fetching section:', error)
        toast.error('Failed to load section')
      } finally {
        setIsLoadingSection(false)
      }
    }

    fetchSection()
  }, [params.sectionId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await updateSection(params.sectionId, {
        title: formData.title,
        summary: formData.summary || undefined,
      })

      if (result.success) {
        toast.success('Section updated successfully')
        router.push(`/admin/learn/tracks/${params.trackId}`)
      }
    } catch (error: any) {
      console.error('Error updating section:', error)
      toast.error(error.message || 'Failed to update section')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this section? All lessons in this section will be moved to "No Section".')) {
      return
    }

    setIsLoading(true)
    try {
      const result = await deleteSection(params.sectionId)
      if (result.success) {
        toast.success('Section deleted successfully')
        router.push(`/admin/learn/tracks/${params.trackId}`)
      }
    } catch (error: any) {
      console.error('Error deleting section:', error)
      toast.error(error.message || 'Failed to delete section')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoadingSection) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="flex">
          <AdminSidebar />
          <div className="flex-1 p-8">
            <div className="max-w-2xl mx-auto">
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-slate-200 rounded w-1/4"></div>
                <div className="h-64 bg-slate-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
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
              <h1 className="text-3xl font-bold text-slate-900">Edit Section</h1>
              <p className="text-slate-600 mt-2">
                Update section information
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Section Information</CardTitle>
                  <CardDescription>
                    Update section details
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

              <div className="flex items-center justify-between">
                <Button 
                  type="button" 
                  variant="destructive" 
                  onClick={handleDelete}
                  disabled={isLoading}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Section
                </Button>
                
                <div className="flex items-center gap-4">
                  <Link href={`/admin/learn/tracks/${params.trackId}`}>
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </Link>
                  <Button type="submit" disabled={isLoading}>
                    <Save className="h-4 w-4 mr-2" />
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

