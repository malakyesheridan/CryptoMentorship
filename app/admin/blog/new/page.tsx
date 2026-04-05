'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BlogEditor } from '@/components/admin/BlogEditor'
import {
  Save,
  Send,
  Sparkles,
  Loader2,
  Copy,
  Eye,
  FileDown,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

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

export default function NewBlogPostPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Form state
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [body, setBody] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [category, setCategory] = useState('market-update')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [featuredImage, setFeaturedImage] = useState('')
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
  const pdfContainerRef = useRef<HTMLDivElement>(null)

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
      toast.success('Draft generated — review and edit before publishing')
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
      const res = await fetch('/api/admin/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          subtitle: subtitle || undefined,
          body,
          excerpt: excerpt || undefined,
          category,
          tags,
          featuredImage: featuredImage || undefined,
          status,
          platformOnly,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Save failed')
      }

      const post = await res.json()
      toast.success(status === 'published' ? 'Post published!' : 'Draft saved')
      startTransition(() => {
        router.push(`/admin/blog/${post.id}/edit`)
      })
    } catch (err: any) {
      toast.error(err.message || 'Failed to save')
    } finally {
      setIsSaving(false)
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
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'blog-post'
      await exportBlogToPDF(container, slug)
      toast.success('PDF exported successfully')

      document.body.removeChild(container)
    } catch {
      toast.error('PDF export failed')
    } finally {
      setExportingPdf(false)
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

  return (
    <div className="container-main section-padding">
      <div className="mb-8">
        <h2 className="heading-md text-[var(--text-strong)]">New Blog Post</h2>
        <p className="text-[var(--text-muted)] text-lg">Create a new blog post with AI-assisted writing</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column: Editor (3/5) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Title */}
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

          {/* Subtitle */}
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

          {/* Category + Platform Only */}
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

          {/* Tags */}
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

          {/* Featured Image URL */}
          <div>
            <Label htmlFor="featuredImage">Featured Image URL</Label>
            <Input
              id="featuredImage"
              value={featuredImage}
              onChange={(e) => setFeaturedImage(e.target.value)}
              placeholder="https://..."
              className="mt-1"
            />
          </div>

          {/* Excerpt */}
          <div>
            <Label htmlFor="excerpt">Excerpt</Label>
            <Textarea
              id="excerpt"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Brief summary for listings (auto-generated if left empty)"
              rows={2}
              className="mt-1"
            />
          </div>

          {/* Markdown Editor */}
          <div>
            <Label>Content (Markdown)</Label>
            <div className="mt-1">
              <BlogEditor body={body} setBody={setBody} />
            </div>
          </div>

          {/* Preview HTML button */}
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
                Generate a draft using AI, then review and edit
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Topic */}
              <div>
                <Label htmlFor="ai-topic">Topic / Brief</Label>
                <Textarea
                  id="ai-topic"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="What should this post be about? Be specific about the angle, data, or narrative..."
                  rows={4}
                  className="mt-1"
                />
              </div>

              {/* Key Points */}
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

              {/* Tone */}
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

              {/* Length */}
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

              {/* Generate Button */}
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
                    Generate Draft
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
        <Button type="button" className="btn-gold" onClick={() => handleSave('published')} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
          Publish
        </Button>
      </div>

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
