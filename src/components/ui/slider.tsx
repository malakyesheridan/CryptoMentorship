import React from 'react'

interface SliderProps {
  value: number[]
  max: number
  step?: number
  onValueChange: (value: number[]) => void
  className?: string
}

export function Slider({ value, max, step = 1, onValueChange, className = '' }: SliderProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onValueChange([parseFloat(e.target.value)])
  }

  return (
    <input
      type="range"
      min="0"
      max={max}
      step={step}
      value={value[0]}
      onChange={handleChange}
      className={`w-full h-2 bg-[#2a2520] rounded-lg appearance-none cursor-pointer slider ${className}`}
      style={{
        background: `linear-gradient(to right, var(--gold-400) 0%, var(--gold-400) ${(value[0] / max) * 100}%, #2a2520 ${(value[0] / max) * 100}%, #2a2520 100%)`
      }}
    />
  )
}
