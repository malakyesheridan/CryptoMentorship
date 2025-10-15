'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <Card className={cn('animate-pulse', className)}>
      <CardContent className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-8 w-full" />
        </div>
      </CardContent>
    </Card>
  )
}

export function CourseCardSkeleton({ className = '' }: { className?: string }) {
  return (
    <Card className={cn('min-w-[280px] flex-shrink-0', className)}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Course image skeleton */}
          <Skeleton className="w-full h-32 rounded-lg" />
          
          {/* Course info skeleton */}
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
            
            {/* Progress info skeleton */}
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-12" />
            </div>
            
            {/* Action button skeleton */}
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function BookmarkCardSkeleton({ className = '' }: { className?: string }) {
  return (
    <Card className={cn('group', className)}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Content image skeleton */}
          <div className="relative">
            <Skeleton className="w-full h-32 rounded-lg" />
            <Skeleton className="absolute top-2 left-2 h-5 w-16 rounded-full" />
          </div>
          
          {/* Content info skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-12" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function StreakWidgetSkeleton({ className = '' }: { className?: string }) {
  return (
    <Card className={cn('bg-gradient-to-r from-orange-50 to-red-50 border-orange-200', className)}>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header skeleton */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-8" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              </div>
            </div>
            <div className="text-right space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-8" />
            </div>
          </div>
          
          {/* Message skeleton */}
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          
          {/* Progress skeleton */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-8" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
          
          {/* Action buttons skeleton */}
          <div className="flex gap-3">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardStatsSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-3 gap-4', className)}>
      <CardSkeleton />
      <CardSkeleton />
      <div className="md:col-span-3">
        <CardSkeleton />
      </div>
    </div>
  )
}
