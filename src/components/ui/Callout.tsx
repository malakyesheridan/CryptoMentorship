import { cn } from '@/lib/utils'

interface CalloutProps {
  children: React.ReactNode
  type?: 'info' | 'warning' | 'success' | 'error'
  className?: string
}

export function Callout({ children, type = 'info', className }: CalloutProps) {
  const baseClasses = 'p-4 rounded-xl border-l-4 my-4'
  
  const typeClasses = {
    info: 'bg-blue-50 border-blue-400 text-blue-800',
    warning: 'bg-yellow-50 border-yellow-400 text-yellow-800',
    success: 'bg-green-50 border-green-400 text-green-800',
    error: 'bg-red-50 border-red-400 text-red-800',
  }

  return (
    <div className={cn(baseClasses, typeClasses[type], className)}>
      {children}
    </div>
  )
}
