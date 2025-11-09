'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Megaphone, Send, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export default function AdminAnnouncePage() {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast.error('Title is required')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/admin/announce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim() || undefined,
          url: url.trim() || undefined,
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send announcement')
      }

      toast.success('Announcement sent successfully!')
      setTitle('')
      setBody('')
      setUrl('')
      setPreview(false)
    } catch (error) {
      toast.error('Failed to send announcement')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container-main section-padding">
      {/* Header */}
      <div className="mb-8">
        <h1 className="heading-hero text-4xl mb-2">Send Announcement</h1>
        <p className="subhead">Broadcast a message to all members</p>
      </div>

      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              Compose Announcement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="title" className="text-base font-medium">
                  Title *
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Announcement title"
                  className="mt-2"
                  required
                />
              </div>

              <div>
                <Label htmlFor="body" className="text-base font-medium">
                  Message
                </Label>
                <Textarea
                  id="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Optional message content"
                  className="mt-2"
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="url" className="text-base font-medium">
                  Link URL
                </Label>
                <Input
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Optional link (e.g., /research, /crypto-compass)"
                  className="mt-2"
                />
              </div>

              {/* Preview */}
              {preview && (title || body) && (
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <h4 className="font-semibold text-slate-800 mb-2">Preview</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">📢 Announcement</Badge>
                      <span className="text-sm text-slate-500">Just now</span>
                    </div>
                    <h5 className="font-medium text-slate-800">
                      {title || 'Announcement Title'}
                    </h5>
                    {body && (
                      <p className="text-sm text-slate-600">
                        {body}
                      </p>
                    )}
                    {url && (
                      <p className="text-xs text-slate-500">
                        Link: {url}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPreview(!preview)}
                  disabled={!title && !body}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {preview ? 'Hide Preview' : 'Preview'}
                </Button>

                <Button
                  type="submit"
                  disabled={loading || !title.trim()}
                  className="flex-1"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {loading ? 'Sending...' : 'Send Announcement'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mt-6">
          <CardContent className="p-6">
            <h4 className="font-semibold text-slate-800 mb-3">About Announcements</h4>
            <ul className="text-sm text-slate-600 space-y-2">
              <li>• Announcements are sent to all members, editors, and admins</li>
              <li>• Recipients can control notification preferences in their account settings</li>
              <li>• Announcements appear in the notifications bell and center</li>
              <li>• Use clear, concise titles and helpful messages</li>
              <li>• Include relevant links to guide members to new content</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
