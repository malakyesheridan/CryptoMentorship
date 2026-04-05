'use client'

import { useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import { commands, type ICommand } from '@uiw/react-md-editor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ImagePlus, Link2, Video } from 'lucide-react'
import { toast } from 'sonner'

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false })

interface BlogEditorProps {
  body: string
  setBody: (value: string) => void
}

export function BlogEditor({ body, setBody }: BlogEditorProps) {
  // Link card modal state
  const [showLinkCardModal, setShowLinkCardModal] = useState(false)
  const [linkCardUrl, setLinkCardUrl] = useState('')
  const [linkCardLoading, setLinkCardLoading] = useState(false)

  // Video embed modal state
  const [showVideoModal, setShowVideoModal] = useState(false)
  const [videoUrl, setVideoUrl] = useState('')

  // Image upload custom command
  const imageUploadCommand: ICommand = {
    name: 'image-upload',
    keyCommand: 'image-upload',
    buttonProps: { 'aria-label': 'Upload image', title: 'Upload image' },
    icon: <ImagePlus size={14} />,
    execute: (_state, api) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (!file) return

        api.replaceSelection('![Uploading...]()')

        const formData = new FormData()
        formData.append('file', file)

        try {
          const res = await fetch('/api/admin/blog/upload', {
            method: 'POST',
            body: formData,
          })
          if (!res.ok) {
            const err = await res.json()
            throw new Error(err.error || 'Upload failed')
          }
          const { url } = await res.json()
          setBody(body.replace('![Uploading...]()', `![${file.name}](${url})`))
          toast.success('Image uploaded')
        } catch (err: any) {
          toast.error(err.message || 'Image upload failed')
          setBody(body.replace('![Uploading...]()', ''))
        }
      }
      input.click()
    },
  }

  // Link card custom command
  const linkCardCommand: ICommand = {
    name: 'link-card',
    keyCommand: 'link-card',
    buttonProps: { 'aria-label': 'Insert link card', title: 'Insert link card' },
    icon: <Link2 size={14} />,
    execute: () => {
      setShowLinkCardModal(true)
    },
  }

  // Video embed custom command
  const videoEmbedCommand: ICommand = {
    name: 'video-embed',
    keyCommand: 'video-embed',
    buttonProps: { 'aria-label': 'Embed video', title: 'Embed video' },
    icon: <Video size={14} />,
    execute: () => {
      setShowVideoModal(true)
    },
  }

  const customCommands = [
    commands.bold,
    commands.italic,
    commands.strikethrough,
    commands.hr,
    commands.title,
    commands.divider,
    commands.link,
    commands.quote,
    commands.code,
    commands.codeBlock,
    commands.divider,
    imageUploadCommand,
    linkCardCommand,
    videoEmbedCommand,
    commands.divider,
    commands.unorderedListCommand,
    commands.orderedListCommand,
    commands.checkedListCommand,
  ]

  // Link card insertion handler
  async function handleInsertLinkCard() {
    if (!linkCardUrl) return
    setLinkCardLoading(true)

    try {
      const res = await fetch('/api/admin/blog/og-fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: linkCardUrl }),
      })
      const { data } = await res.json()

      const linkCardMdx = `\n\n<LinkCard url="${data.url}" title="${data.title}" description="${data.description || ''}" image="${data.image || ''}" siteName="${data.siteName || ''}" />\n\n`
      setBody(body + linkCardMdx)
      toast.success('Link card added')
    } catch {
      toast.error('Failed to fetch link preview')
    } finally {
      setLinkCardLoading(false)
      setShowLinkCardModal(false)
      setLinkCardUrl('')
    }
  }

  // Video insertion handler
  function handleInsertVideo() {
    if (!videoUrl) return
    const videoMdx = `\n\n<VideoEmbed url="${videoUrl}" />\n\n`
    setBody(body + videoMdx)
    toast.success('Video embedded')
    setShowVideoModal(false)
    setVideoUrl('')
  }

  // Drag and drop image handler
  async function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()

    const file = e.dataTransfer.files[0]
    if (!file || !file.type.startsWith('image/')) return

    const formData = new FormData()
    formData.append('file', file)

    toast.info('Uploading image...')

    try {
      const res = await fetch('/api/admin/blog/upload', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) throw new Error('Upload failed')
      const { url } = await res.json()

      setBody(body + `\n\n![${file.name}](${url})\n`)
      toast.success('Image uploaded')
    } catch {
      toast.error('Image upload failed')
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
  }

  // URL paste handler
  async function handlePaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData('text/plain').trim()
    const urlRegex = /^https?:\/\/\S+$/
    if (!urlRegex.test(text)) return

    e.preventDefault()
    const convertToCard = window.confirm('Convert this URL to a rich link card?')

    if (convertToCard) {
      toast.info('Fetching link preview...')
      try {
        const res = await fetch('/api/admin/blog/og-fetch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: text }),
        })
        const { data } = await res.json()
        const linkCardMdx = `\n\n<LinkCard url="${data.url}" title="${data.title}" description="${data.description || ''}" image="${data.image || ''}" siteName="${data.siteName || ''}" />\n\n`
        setBody(body + linkCardMdx)
        toast.success('Link card added')
      } catch {
        setBody(body + `\n[${text}](${text})\n`)
        toast.error('Could not fetch preview — inserted as plain link')
      }
    } else {
      setBody(body + `\n[${text}](${text})\n`)
    }
  }

  return (
    <>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onPaste={handlePaste}
        data-color-mode="dark"
      >
        <MDEditor
          value={body}
          onChange={(val) => setBody(val || '')}
          commands={customCommands}
          preview="live"
          height={500}
        />
      </div>

      {/* Link Card Modal */}
      <Dialog open={showLinkCardModal} onOpenChange={setShowLinkCardModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Insert Link Card</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="link-url">URL</Label>
              <Input
                id="link-url"
                placeholder="https://..."
                value={linkCardUrl}
                onChange={(e) => setLinkCardUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInsertLinkCard()}
                className="mt-1"
              />
            </div>
            <Button
              onClick={handleInsertLinkCard}
              disabled={!linkCardUrl || linkCardLoading}
              className="w-full btn-gold"
            >
              {linkCardLoading ? 'Fetching preview...' : 'Insert Link Card'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Embed Modal */}
      <Dialog open={showVideoModal} onOpenChange={setShowVideoModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Embed Video</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="video-url">Video URL</Label>
              <Input
                id="video-url"
                placeholder="YouTube, Loom, or Vimeo URL"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInsertVideo()}
                className="mt-1"
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Supports YouTube, Loom, and Vimeo links
              </p>
            </div>
            <Button
              onClick={handleInsertVideo}
              disabled={!videoUrl}
              className="w-full btn-gold"
            >
              Embed Video
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
