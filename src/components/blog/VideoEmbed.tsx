'use client'

interface VideoEmbedProps {
  url: string
}

export function VideoEmbed({ url }: VideoEmbedProps) {
  const getEmbedUrl = (url: string): string | null => {
    const ytMatch = url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/
    )
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`

    const loomMatch = url.match(/loom\.com\/share\/([\w-]+)/)
    if (loomMatch) return `https://www.loom.com/embed/${loomMatch[1]}`

    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`

    return null
  }

  const embedUrl = getEmbedUrl(url)

  if (!embedUrl) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-gold-400 underline"
      >
        {url}
      </a>
    )
  }

  return (
    <div className="my-4 rounded-lg overflow-hidden border border-[var(--border-subtle)] aspect-video bg-black/20">
      <iframe
        src={embedUrl}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
        title="Embedded video"
      />
    </div>
  )
}
