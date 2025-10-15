'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface ActivityData {
  date: string
  count: number
}

interface ActivityChartProps {
  data: ActivityData[]
  height?: number
  color?: string
  className?: string
  onDayClick?: (date: string, count: number) => void
  showTooltip?: boolean
}

export function ActivityChart({
  data,
  height = 60,
  color = '#3b82f6',
  className = '',
  onDayClick,
  showTooltip = true
}: ActivityChartProps) {
  const [hoveredBar, setHoveredBar] = useState<string | null>(null)
  const [selectedBar, setSelectedBar] = useState<string | null>(null)

  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      // Return empty data for last 7 days
      const emptyData = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        emptyData.push({
          date: date.toISOString().split('T')[0],
          count: 0
        })
      }
      return emptyData
    }

    // Fill in missing days with 0 count
    const last7Days = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const existingData = data.find(d => d.date === dateStr)
      last7Days.push({
        date: dateStr,
        count: existingData?.count || 0
      })
    }
    
    return last7Days
  }, [data])

  const maxCount = Math.max(...chartData.map(d => d.count), 1)
  const barWidth = 100 / chartData.length

  const handleBarClick = (date: string, count: number) => {
    setSelectedBar(selectedBar === date ? null : date)
    onDayClick?.(date, count)
  }

  const handleBarHover = (date: string) => {
    setHoveredBar(date)
  }

  const handleBarLeave = () => {
    setHoveredBar(null)
  }

  return (
    <div className={cn('w-full relative', className)}>
      <svg
        width="100%"
        height={height}
        viewBox="0 0 100 60"
        className="overflow-visible"
      >
        {chartData.map((item, index) => {
          const barHeight = maxCount > 0 ? (item.count / maxCount) * 50 : 0
          const x = index * barWidth + barWidth / 2 - 2
          const y = 55 - barHeight
          const isHovered = hoveredBar === item.date
          const isSelected = selectedBar === item.date
          const isToday = item.date === new Date().toISOString().split('T')[0]
          
          return (
            <g key={item.date}>
              <rect
                x={x}
                y={y}
                width="4"
                height={barHeight}
                fill={isSelected ? '#1d4ed8' : color}
                opacity={item.count > 0 ? (isHovered ? 1 : 0.8) : 0.2}
                rx="2"
                className="transition-all duration-300 ease-out cursor-pointer hover:scale-110 transform-gpu"
                onClick={() => handleBarClick(item.date, item.count)}
                onMouseEnter={() => handleBarHover(item.date)}
                onMouseLeave={handleBarLeave}
                style={{
                  transformOrigin: 'center bottom',
                  filter: isHovered ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))' : 'none'
                }}
              />
              
              {/* Today indicator */}
              {isToday && (
                <circle
                  cx={x + 2}
                  cy={y - 2}
                  r="1.5"
                  fill="#f59e0b"
                  className="animate-pulse"
                />
              )}
            </g>
          )
        })}
      </svg>
      
      {/* Tooltip */}
      {showTooltip && hoveredBar && (
        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-xs rounded shadow-lg z-10 whitespace-nowrap">
          {format(new Date(hoveredBar), 'MMM d')}: {chartData.find(d => d.date === hoveredBar)?.count || 0} lesson{(chartData.find(d => d.date === hoveredBar)?.count || 0) !== 1 ? 's' : ''}
        </div>
      )}
      
      {/* Day labels */}
      <div className="flex justify-between text-xs text-slate-500 mt-1">
        {chartData.map((item, index) => {
          const date = new Date(item.date)
          const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
          const isToday = item.date === new Date().toISOString().split('T')[0]
          const isSelected = selectedBar === item.date
          
          return (
            <span 
              key={item.date} 
              className={cn(
                'text-center transition-colors duration-300',
                isToday && 'text-yellow-600 font-semibold',
                isSelected && 'text-blue-600 font-semibold'
              )}
              style={{ width: `${barWidth}%` }}
            >
              {dayName}
            </span>
          )
        })}
      </div>
      
      {/* Count labels */}
      <div className="flex justify-between text-xs font-medium text-slate-600 mt-1">
        {chartData.map((item, index) => {
          const isSelected = selectedBar === item.date
          
          return (
            <span 
              key={item.date} 
              className={cn(
                'text-center transition-colors duration-300',
                isSelected && 'text-blue-600'
              )}
              style={{ width: `${barWidth}%` }}
            >
              {item.count > 0 ? item.count : ''}
            </span>
          )
        })}
      </div>
      
      {/* Selected day details */}
      {selectedBar && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-sm text-blue-800">
            <strong>{format(new Date(selectedBar), 'EEEE, MMMM d, yyyy')}</strong>
            <p className="mt-1">
              {chartData.find(d => d.date === selectedBar)?.count || 0} lesson{(chartData.find(d => d.date === selectedBar)?.count || 0) !== 1 ? 's' : ''} completed
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
