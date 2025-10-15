'use client'

import React from 'react'
import { MDXRemote } from 'next-mdx-remote'
import { Callout } from './ui/Callout'
import { Note } from './ui/Note'
import { Quote } from './ui/Quote'
import { Metric } from './ui/Metric'
import { ExternalLink } from 'lucide-react'

import type { SerializedMDXSource } from '@/lib/mdx'

const components = {
  Callout,
  Note,
  Quote,
  Metric,
  h1: (props: any) => <h1 className="font-playfair font-bold text-4xl mb-6 text-[var(--text-strong)]" {...props} />,
  h2: (props: any) => <h2 className="font-playfair font-bold text-3xl mb-4 mt-8 text-[var(--text-strong)]" {...props} />,
  h3: (props: any) => <h3 className="font-playfair font-bold text-2xl mb-3 mt-6 text-[var(--text-strong)]" {...props} />,
  h4: (props: any) => <h4 className="font-playfair font-bold text-xl mb-2 mt-4 text-[var(--text-strong)]" {...props} />,
  p: (props: any) => <p className="mb-4 text-[var(--text-strong)] leading-relaxed" {...props} />,
  ul: (props: any) => <ul className="mb-4 ml-6 list-disc text-[var(--text-strong)]" {...props} />,
  ol: (props: any) => <ol className="mb-4 ml-6 list-decimal text-[var(--text-strong)]" {...props} />,
  li: (props: any) => <li className="mb-2" {...props} />,
  blockquote: (props: any) => <blockquote className="border-l-4 border-gold-400 pl-4 italic text-[var(--text-muted)] my-4" {...props} />,
  code: (props: any) => <code className="bg-slate-100 px-2 py-1 rounded text-sm font-mono" {...props} />,
  pre: (props: any) => <pre className="bg-slate-900 text-white p-4 rounded-lg overflow-x-auto mb-4" {...props} />,
  a: (props: any) => {
    const isExternal = props.href && (props.href.startsWith('http') || props.href.startsWith('//'))
    return (
      <a 
        className="text-gold-600 hover:text-gold-700 underline inline-flex items-center gap-1" 
        {...props}
        {...(isExternal && { 
          target: '_blank', 
          rel: 'noopener noreferrer' 
        })}
      >
        {props.children}
        {isExternal && <ExternalLink className="w-3 h-3" />}
      </a>
    )
  },
  strong: (props: any) => <strong className="font-semibold text-[var(--text-strong)]" {...props} />,
  em: (props: any) => <em className="italic" {...props} />,
}

interface MDXRendererProps {
  source: SerializedMDXSource | null
  slug?: string
  hash?: string
}

export function MDXRenderer({ source, slug, hash }: MDXRendererProps) {
  if (!source || typeof source !== 'object' || !source.compiledSource) {
    if (slug || hash) {
      console.error('[MDXRenderer] Missing compiledSource', { slug, hash })
    }
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/40 p-6 text-center text-sm text-muted-foreground">
        This content could not be rendered. If you maintain this page, please review the MDX source.
      </div>
    )
  }

  return (
    <div className="prose prose-lg max-w-none">
      <React.Suspense fallback={null}>
        <MDXRemote {...source} components={components} scope={{}} frontmatter={{}} />
      </React.Suspense>
    </div>
  )
}
