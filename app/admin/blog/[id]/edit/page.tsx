'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BlogEditor } from '@/components/admin/BlogEditor'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Save,
  Send,
  Sparkles,
  Loader2,
  Copy,
  Eye,
  FileDown,
  Globe,
  Upload,
  X,
  Trash2,
  ArrowLeft,
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

const CATEGORIES = [
  { value: 'market-update', label: 'Market Update' },
  { value: 'system-spotlight', label: 'System Spotlight' },
  { value: 'industry-analysis', label: 'Industry Analysis' },
  { value: 'webinar-recap', label: 'Webinar Recap' },
  { value: 'guide', label: 'Guide' },
] as const

const TONES = [
  { value: 'analytical', label: 'Analytical' },
  { value: 'educational', label: 'Educational' },
  { value: 'conversational', label: 'Conversational' },
] as const

const LENGTHS = [
  { value: 'short', label: 'Short (~500w)' },
  { value: 'medium', label: 'Medium (~1000w)' },
  { value: 'long', label: 'Long (~1500w)' },
] as const

export default function EditBlogPostPage() {
  const router = useRouter()
  const params = useParams()
  const postId = params.id as string
  const [isPending, startTransition] = useTransition()

  // Loading state
  const [isLoading, setIsLoading] = useState(true)
  const [postSlug, setPostSlug] = useState('')
  const [postStatus, setPostStatus] = useState('draft')
  const [websitePublishedAt, setWebsitePublishedAt] = useState<string | null>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [body, setBody] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [category, setCategory] = useState('market-update')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [featuredImage, setFeaturedImage] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [platformOnly, setPlatformOnly] = useState(false)

  // AI panel state
  const [aiTopic, setAiTopic] = useState('')
  const [aiTone, setAiTone] = useState('analytical')
  const [aiLength, setAiLength] = useState('medium')
  const [aiKeyPoints, setAiKeyPoints] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  // HTML preview state
  const [htmlPreview, setHtmlPreview] = useState('')
  const [showHtmlPreview, setShowHtmlPreview] = useState(false)

  // Save state
  const [isSaving, setIsSaving] = useState(false)

  // PDF export state
  const [exportingPdf, setExportingPdf] = useState(false)

  // Website publish state
  const [publishingToWebsite, setPublishingToWebsite] = useState(false)
  const [showWebsiteConfirm, setShowWebsiteConfirm] = useState(false)

  // Load existing post data
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/admin/blog/${postId}`)
        if (!res.ok) throw new Error('Failed to load post')
        const post = await res.json()

        setTitle(post.title || '')
        setSubtitle(post.subtitle || '')
        setBody(post.body || '')
        setExcerpt(post.excerpt || '')
        setCategory(post.category || 'market-update')
        setTags(post.tags || [])
        setFeaturedImage(post.featuredImage || '')
        setPlatformOnly(post.platformOnly || false)
        setPostSlug(post.slug || '')
        setPostStatus(post.status || 'draft')
        setWebsitePublishedAt(post.websitePublishedAt || null)
      } catch (err: any) {
        toast.error(err.message || 'Failed to load post')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [postId])

  async function handleGenerate() {
    if (!aiTopic.trim()) {
      toast.error('Enter a topic for the AI to write about')
      return
    }

    setIsGenerating(true)
    try {
      const res = await fetch('/api/admin/blog/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: aiTopic,
          category,
          tone: aiTone,
          length: aiLength,
          keyPoints: aiKeyPoints
            ? aiKeyPoints.split('\n').filter(Boolean)
            : undefined,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Generation failed')
      }

      const data = await res.json()
      setTitle(data.title || '')
      setSubtitle(data.subtitle || '')
      setBody(data.body || '')
      setExcerpt(data.excerpt || '')
      toast.success('Draft regenerated — review and edit before saving')
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate content')
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleSave(status: 'draft' | 'published') {
    if (!title.trim()) {
      toast.error('Title is required')
      return
    }
    if (!body.trim()) {
      toast.error('Body content is required')
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch(`/api/admin/blog/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          subtitle: subtitle || null,
          body,
          excerpt: excerpt || null,
          category,
          tags,
          featuredImage: featuredImage || null,
          status,
          platformOnly,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Save failed')
      }

      setPostStatus(status)
      toast.success(status === 'published' ? 'Post published!' : 'Draft saved')
      startTransition(() => {
        router.refresh()
      })
    } catch (err: any) {
      toast.error(err.message || 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this post?')) return

    try {
      const res = await fetch(`/api/admin/blog/${postId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')

      toast.success('Post deleted')
      startTransition(() => {
        router.push('/admin/blog')
      })
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete')
    }
  }

  async function handlePreviewHtml() {
    if (!body.trim()) {
      toast.error('Write some content first')
      return
    }

    try {
      const res = await fetch('/api/admin/blog/preview-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          subtitle,
          body,
          category,
          author: 'Stewart & Co',
        }),
      })

      if (!res.ok) throw new Error('Preview failed')

      const data = await res.json()
      setHtmlPreview(data.html)
      setShowHtmlPreview(true)
    } catch {
      toast.error('Failed to generate HTML preview')
    }
  }

  async function handleExportPDF() {
    if (!body.trim()) {
      toast.error('Write some content first')
      return
    }
    setExportingPdf(true)
    try {
      const res = await fetch('/api/admin/blog/preview-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, subtitle, body, category, author: 'Stewart & Co' }),
      })
      if (!res.ok) throw new Error('Failed to generate HTML')
      const { html } = await res.json()

      const container = document.createElement('div')
      container.style.position = 'absolute'
      container.style.left = '-9999px'
      container.style.width = '800px'
      container.innerHTML = html
      document.body.appendChild(container)

      const { exportBlogToPDF } = await import('@/lib/blog-pdf-export')
      await exportBlogToPDF(container, postSlug || 'blog-post')
      toast.success('PDF exported successfully')

      document.body.removeChild(container)
    } catch {
      toast.error('PDF export failed')
    } finally {
      setExportingPdf(false)
    }
  }

  async function handlePublishToWebsite() {
    setPublishingToWebsite(true)
    setShowWebsiteConfirm(false)

    try {
      const res = await fetch(`/api/admin/blog/${postId}/publish-website`, {
        method: 'POST',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || data.error || 'Failed to publish to website')
      }

      toast.success('Published to website')
      setWebsitePublishedAt(new Date().toISOString())
      startTransition(() => {
        router.refresh()
      })
    } catch (err: any) {
      toast.error(err.message || 'Failed to publish to website')
    } finally {
      setPublishingToWebsite(false)
    }
  }

  async function handleFeaturedImageUpload(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB')
      return
    }
    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/admin/blog/upload', { method: 'POST', body: formData })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Upload failed')
      }
      const { url } = await res.json()
      setFeaturedImage(url)
      toast.success('Featured image uploaded')
    } catch (err: any) {
      toast.error(err.message || 'Image upload failed')
    } finally {
      setUploadingImage(false)
    }
  }

  function addTag() {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag])
    }
    setTagInput('')
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag))
  }

  if (isLoading) {
    return (
      <div className="container-main section-padding animate-pulse">
        <div className="h-8 w-48 bg-[#2a2520] rounded mb-4" />
        <div className="h-5 w-80 bg-[#2a2520] rounded mb-8" />
        <div className="h-96 bg-[#2a2520] rounded" />
      </div>
    )
  }

  return (
    <div className="container-main section-padding">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/admin/blog" className="text-[var(--text-muted)] hover:text-[var(--text-strong)]">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h2 className="heading-md text-[var(--text-strong)]">Edit Blog Post</h2>
            <Badge variant={postStatus === 'published' ? 'default' : 'outline'} className={postStatus === 'published' ? 'bg-green-600/20 text-green-400 border-green-600/30' : ''}>
              {postStatus}
            </Badge>
          </div>
          <p className="text-[var(--text-muted)] text-sm ml-8">/{postSlug}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleDelete} className="text-red-400 hover:text-red-300 hover:border-red-400/50">
          <Trash2 className="h-4 w-4 mr-1" />
          Delete
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column: Editor (3/5) */}
        <div className="lg:col-span-3 space-y-6">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter post title..."
              className="text-lg font-semibold mt-1"
            />
          </div>

          <div>
            <Label htmlFor="subtitle">Subtitle</Label>
            <Input
              id="subtitle"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="A brief subtitle (optional)"
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full mt-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] text-[var(--text-strong)] px-3 py-2 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-3 pb-1">
              <label className="flex items-center gap-2 text-sm text-[var(--text-strong)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={platformOnly}
                  onChange={(e) => setPlatformOnly(e.target.checked)}
                  className="rounded border-[var(--border-subtle)]"
                />
                Members Only
              </label>
            </div>
          </div>

          <div>
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 mt-1 mb-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="outline" className="flex items-center gap-1">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add a tag..."
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTag()
                  }
                }}
              />
              <Button type="button" variant="outline" size="sm" onClick={addTag}>
                Add
              </Button>
            </div>
          </div>

          {/* Featured Image */}
          <div>
            <Label>Featured Image</Label>
            {featuredImage ? (
              <div className="mt-1 relative group rounded-lg overflow-hidden border border-[var(--border-subtle)]">
                <img src={featuredImage} alt="Featured" className="w-full h-40 object-cover" />
                <button
                  type="button"
                  onClick={() => setFeaturedImage('')}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="mt-1 flex flex-col items-center justify-center h-32 border-2 border-dashed border-[var(--border-subtle)] rounded-lg cursor-pointer hover:border-gold-400/40 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFeaturedImageUpload(file)
                  }}
                  disabled={uploadingImage}
                />
                {uploadingImage ? (
                  <Loader2 className="h-6 w-6 text-[var(--text-muted)] animate-spin" />
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-[var(--text-muted)] mb-2" />
                    <span className="text-sm text-[var(--text-muted)]">Click to upload featured image</span>
                    <span className="text-xs text-[var(--text-muted)] mt-1">JPEG, PNG, WebP · Max 5MB</span>
                  </>
                )}
              </label>
            )}
          </div>

          <div>
            <Label htmlFor="excerpt">Excerpt</Label>
            <Textarea
              id="excerpt"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Brief summary for listings"
              rows={2}
              className="mt-1"
            />
          </div>

          <div>
            <Label>Content (Markdown)</Label>
            <div className="mt-1">
              <BlogEditor body={body} setBody={setBody} />
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={handlePreviewHtml}>
              <Eye className="h-4 w-4 mr-2" />
              Preview Branded HTML
            </Button>
          </div>
        </div>

        {/* Right Column: AI Panel (2/5) */}
        <div className="lg:col-span-2">
          <Card className="sticky top-6 border-gold-400/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-gold-400" />
                <span className="text-[var(--text-strong)]">AI Writer</span>
              </CardTitle>
              <p className="text-sm text-[var(--text-muted)]">
                Regenerate content — this will replace the current draft
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="ai-topic">Topic / Brief</Label>
                <Textarea
                  id="ai-topic"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="What should this post be about?"
                  rows={4}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="ai-keypoints">Key Points (optional)</Label>
                <Textarea
                  id="ai-keypoints"
                  value={aiKeyPoints}
                  onChange={(e) => setAiKeyPoints(e.target.value)}
                  placeholder="One point per line..."
                  rows={3}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Tone</Label>
                <div className="flex gap-2 mt-1">
                  {TONES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setAiTone(t.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        aiTone === t.value
                          ? 'bg-gold-400 text-white'
                          : 'bg-[var(--bg-page)] text-[var(--text-muted)] hover:text-[var(--text-strong)] border border-[var(--border-subtle)]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Length</Label>
                <div className="flex gap-2 mt-1">
                  {LENGTHS.map((l) => (
                    <button
                      key={l.value}
                      type="button"
                      onClick={() => setAiLength(l.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        aiLength === l.value
                          ? 'bg-gold-400 text-white'
                          : 'bg-[var(--bg-page)] text-[var(--text-muted)] hover:text-[var(--text-strong)] border border-[var(--border-subtle)]'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                type="button"
                className="w-full btn-gold"
                onClick={handleGenerate}
                disabled={isGenerating || !aiTopic.trim()}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Regenerate Draft
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Save Bar */}
      <div className="sticky bottom-0 mt-8 -mx-4 px-4 py-4 bg-[var(--bg-panel)] border-t border-[var(--border-subtle)] flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => handleSave('draft')} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Draft
          </Button>
          <Button type="button" variant="outline" onClick={handleExportPDF} disabled={exportingPdf}>
            <FileDown className="h-4 w-4 mr-2" />
            {exportingPdf ? 'Generating...' : 'Export PDF'}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {postStatus === 'published' && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowWebsiteConfirm(true)}
              disabled={publishingToWebsite}
              className="border-blue-400/30 text-blue-400 hover:bg-blue-400/10"
            >
              <Globe className="h-4 w-4 mr-2" />
              {publishingToWebsite
                ? 'Publishing...'
                : websitePublishedAt
                  ? 'Update on Website'
                  : 'Push to Website'}
            </Button>
          )}
          <Button type="button" className="btn-gold" onClick={() => handleSave('published')} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            {postStatus === 'published' ? 'Update' : 'Publish'}
          </Button>
        </div>
      </div>

      {/* Website Publish Confirmation */}
      <Dialog open={showWebsiteConfirm} onOpenChange={setShowWebsiteConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Publish to Website</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--text-muted)]">
            This will publish this post to the Stewart & Co website. The branded HTML version will be pushed.
            {websitePublishedAt && (
              <span className="block mt-2 text-xs">
                Last pushed: {new Date(websitePublishedAt).toLocaleDateString()}
              </span>
            )}
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowWebsiteConfirm(false)}>
              Cancel
            </Button>
            <Button
              onClick={handlePublishToWebsite}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              <Globe className="h-4 w-4 mr-2" />
              Confirm Publish
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* HTML Preview Modal */}
      {showHtmlPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
              <h3 className="font-semibold text-[var(--text-strong)]">Branded HTML Preview</h3>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(htmlPreview)
                    toast.success('HTML copied to clipboard')
                  }}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy HTML
                </Button>
                <button type="button" onClick={() => setShowHtmlPreview(false)}>
                  <X className="h-5 w-5 text-[var(--text-muted)]" />
                </button>
              </div>
            </div>
            <div className="overflow-auto max-h-[calc(90vh-80px)]">
              <iframe
                srcDoc={htmlPreview}
                className="w-full min-h-[600px] border-0"
                title="Blog HTML Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
