import * as React from "react"
import { cn } from "@/lib/utils"

export interface SwitchProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, ...props }, ref) => {
    return (
      <label className="inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="sr-only peer"
          ref={ref}
          {...props}
        />
        <div className={cn(
          "relative w-11 h-6 bg-[#2a2520] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--gold-400)]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-[var(--bg-panel)] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--text-muted)] after:border-[#2a2520] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--gold-400)]",
          className
        )} />
      </label>
    )
  }
)
Switch.displayName = "Switch"

export { Switch }
