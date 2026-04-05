'use client'

interface LinkCardProps {
  url: string
  title: string
  description?: string
  image?: string
  siteName?: string
}

export function LinkCard({ url, title, description, image, siteName }: LinkCardProps) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block my-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] overflow-hidden hover:border-gold-400/40 transition-colors no-underline group"
    >
      {image && (
        <div className="w-full h-40 overflow-hidden bg-black/20">
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        </div>
      )}
      <div className="p-4">
        {siteName && (
          <p className="text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wide">{siteName}</p>
        )}
        <p className="text-sm font-semibold text-[var(--text-strong)] mb-1 group-hover:text-gold-400 transition-colors">
          {title}
        </p>
        {description && (
          <p className="text-xs text-[var(--text-muted)] line-clamp-2">{description}</p>
        )}
      </div>
    </a>
  )
}
