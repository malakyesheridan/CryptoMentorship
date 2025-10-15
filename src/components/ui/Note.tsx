import { cn } from '@/lib/utils'

interface NoteProps {
  children: React.ReactNode
  className?: string
}

export function Note({ children, className }: NoteProps) {
  return (
    <div className={cn('bg-gold-50 border border-gold-200 rounded-xl p-4 my-4', className)}>
      <div className="flex items-start gap-3">
        <div className="w-5 h-5 bg-gold-400 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-white text-xs font-bold">!</span>
        </div>
        <div className="text-gold-800">
          {children}
        </div>
      </div>
    </div>
  )
}
