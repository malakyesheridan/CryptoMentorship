'use client'

import { useState } from 'react'
import { Calendar, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format, parseISO, isValid } from 'date-fns'
import { cn } from '@/lib/utils'

interface CalendarDatePickerProps {
  selectedDate: string | null
  onDateChange: (date: string | null) => void
  availableDates?: string[] // Optional: dates that have updates
}

export function CalendarDatePicker({ selectedDate, onDateChange, availableDates = [] }: CalendarDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [tempDate, setTempDate] = useState(selectedDate || '')

  const handleDateSelect = (dateString: string) => {
    if (dateString) {
      // Validate the date string format (YYYY-MM-DD)
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const date = parseISO(dateString)
        if (isValid(date)) {
          onDateChange(dateString)
          setIsOpen(false)
        }
      }
    }
  }

  const handleClear = () => {
    onDateChange(null)
    setTempDate('')
    setIsOpen(false)
  }

  const today = new Date()
  const todayString = format(today, 'yyyy-MM-dd')
  const selectedDateObj = selectedDate ? parseISO(selectedDate) : null

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 rounded-xl px-4 py-2 font-medium transition-all duration-200",
          selectedDate && "bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100"
        )}
      >
        <Calendar className="h-4 w-4" />
        {selectedDate && isValid(parseISO(selectedDate))
          ? format(parseISO(selectedDate), 'MMM d, yyyy')
          : 'Select Date'}
        {selectedDate && (
          <X 
            className="h-3 w-3 ml-1 hover:bg-yellow-200 rounded p-0.5" 
            onClick={(e) => {
              e.stopPropagation()
              handleClear()
            }}
          />
        )}
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Calendar Popup */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-20 bg-white rounded-lg shadow-xl border border-slate-200 p-4 min-w-[280px]">
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Date
              </label>
              <input
                type="date"
                value={tempDate || todayString}
                onChange={(e) => {
                  setTempDate(e.target.value)
                  if (e.target.value) {
                    handleDateSelect(e.target.value)
                  }
                }}
                max={todayString}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="flex-1"
              >
                Close
              </Button>
              {selectedDate && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClear}
                  className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

