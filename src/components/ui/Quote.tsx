import { cn } from '@/lib/utils'

interface QuoteProps {
  children: React.ReactNode
  author?: string
  className?: string
}

export function Quote({ children, author, className }: QuoteProps) {
  return (
    <blockquote className={cn('border-l-4 border-gold-400 pl-6 py-4 my-6 bg-gold-50/50 rounded-r-xl', className)}>
      <div className="text-[var(--text-strong)] italic text-lg leading-relaxed">
        &ldquo;{children}&rdquo;
      </div>
      {author && (
        <footer className="mt-4 text-sm text-[var(--text-muted)] font-medium">
          — {author}
        </footer>
      )}
    </blockquote>
  )
}
