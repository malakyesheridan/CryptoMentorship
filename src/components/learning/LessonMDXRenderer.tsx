import { MDXRenderer } from '@/components/MDXRenderer'
import type { SerializedMDXSource } from '@/lib/mdx'

type LessonMDXRendererProps = {
  serialized?: SerializedMDXSource | null
  content?: string
  className?: string
}

export function LessonMDXRenderer({ serialized, content, className = '' }: LessonMDXRendererProps) {
  if (!serialized && !content) {
    return null
  }

  return (
    <div className={`prose prose-slate max-w-none ${className}`}>
      {serialized ? (
        <MDXRenderer source={serialized} />
      ) : (
        <div className="whitespace-pre-wrap">{content}</div>
      )}
    </div>
  )
}
