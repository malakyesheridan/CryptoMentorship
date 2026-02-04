"use client"

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { HelpCircle, X } from "lucide-react"
import { cn } from "@/lib/utils"

type Placement = "top" | "bottom" | "left" | "right"

type WizardStep = {
  id: string
  title: string
  body: string
  selector?: string
  placement?: Placement
  optional?: boolean
  missingBody?: string
}

type WizardState = {
  active: boolean
  completed: boolean
  stepIndex: number
}

const STORAGE_KEY = "portfolioWizard.v1"

const STEPS: WizardStep[] = [
  {
    id: "portfolio-hero",
    title: "Portfolio updates",
    body: "This page contains the latest daily portfolio updates.",
    selector: "[data-tour=\"portfolio-hero\"]",
    placement: "bottom"
  },
  {
    id: "portfolio-updates",
    title: "Daily update hub",
    body: "All daily updates, tier tabs, and notes live here.",
    selector: "[data-tour=\"portfolio-updates\"]",
    placement: "top"
  },
  {
    id: "portfolio-date",
    title: "Pick a date",
    body: "Use the calendar to review historical updates.",
    selector: "[data-tour=\"portfolio-date-picker\"]",
    placement: "bottom"
  },
  {
    id: "portfolio-tier-tabs",
    title: "Tier tabs",
    body: "Switch between Growth and Elite updates based on your tier.",
    selector: "[data-tour=\"portfolio-tier-tabs\"]",
    placement: "bottom"
  },
  {
    id: "portfolio-category-tabs",
    title: "Elite categories",
    body: "Elite members can switch between Market Rotation and Memecoins.",
    selector: "[data-tour=\"portfolio-category-tabs\"]",
    placement: "bottom",
    optional: true,
    missingBody: "Category tabs appear for Elite updates."
  },
  {
    id: "portfolio-update-card",
    title: "The update",
    body: "This card contains the actual portfolio update details.",
    selector: "[data-tour=\"portfolio-update-card\"]",
    placement: "top"
  },
  {
    id: "portfolio-allocation",
    title: "Allocation split",
    body: "When available, this shows the portfolio allocation breakdown.",
    selector: "[data-tour=\"portfolio-allocation\"]",
    placement: "top",
    optional: true,
    missingBody: "Some updates include a written summary instead of allocations."
  },
  {
    id: "portfolio-summary",
    title: "Executive summary",
    body: "A short rationale behind the update.",
    selector: "[data-tour=\"portfolio-summary\"]",
    placement: "top",
    optional: true,
    missingBody: "Executive summaries appear on select updates."
  },
  {
    id: "portfolio-data",
    title: "Associated data",
    body: "Supporting data and notes live here when provided.",
    selector: "[data-tour=\"portfolio-data\"]",
    placement: "top",
    optional: true,
    missingBody: "Some updates do not include supporting data."
  },
  {
    id: "portfolio-disclaimer",
    title: "Important disclaimer",
    body: "Always review the disclaimer before acting on portfolio data.",
    selector: "[data-tour=\"portfolio-disclaimer\"]",
    placement: "top"
  }
]

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function PortfolioWizard() {
  const pathname = usePathname()
  const [state, setState] = useState<WizardState>({
    active: false,
    completed: false,
    stepIndex: 0
  })
  const [isReady, setIsReady] = useState(false)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const calloutRef = useRef<HTMLDivElement | null>(null)
  const [calloutSize, setCalloutSize] = useState({ width: 320, height: 200 })
  const initRef = useRef(false)

  const isPortfolioHome = pathname === "/portfolio"
  const step = STEPS[state.stepIndex]

  const persistState = (nextState: WizardState) => {
    setState(nextState)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState))
    }
  }

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true
    if (typeof window === "undefined") return

    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as WizardState
        setState(parsed)
      } catch {
        setState({ active: isPortfolioHome, completed: false, stepIndex: 0 })
      }
    } else {
      setState({ active: isPortfolioHome, completed: false, stepIndex: 0 })
    }
    setIsReady(true)
  }, [isPortfolioHome])

  useEffect(() => {
    if (!isReady || typeof window === "undefined") return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state, isReady])

  useEffect(() => {
    if (!state.active || !step || !isPortfolioHome) {
      setTargetRect(null)
      return
    }

    const updateTarget = () => {
      if (!step.selector) {
        setTargetRect(null)
        return
      }
      const element = document.querySelector(step.selector) as HTMLElement | null
      if (!element) {
        setTargetRect(null)
        return
      }
      setTargetRect(element.getBoundingClientRect())
    }

    updateTarget()
    const handleScroll = () => requestAnimationFrame(updateTarget)
    window.addEventListener("scroll", handleScroll, true)
    window.addEventListener("resize", updateTarget)

    return () => {
      window.removeEventListener("scroll", handleScroll, true)
      window.removeEventListener("resize", updateTarget)
    }
  }, [state.active, step, isPortfolioHome])

  useLayoutEffect(() => {
    if (!calloutRef.current) return
    const rect = calloutRef.current.getBoundingClientRect()
    if (rect.width && rect.height) {
      setCalloutSize({ width: rect.width, height: rect.height })
    }
  }, [state.active, step?.id, targetRect])

  useEffect(() => {
    if (state.stepIndex >= STEPS.length) {
      persistState({ active: false, completed: true, stepIndex: STEPS.length - 1 })
    }
  }, [state.stepIndex])

  const calloutStyle = useMemo(() => {
    if (!targetRect || !step) {
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)"
      } as const
    }

    if (typeof window === "undefined") {
      return { top: 0, left: 0 }
    }

    const gap = 14
    let top = targetRect.top + targetRect.height / 2 - calloutSize.height / 2
    let left = targetRect.left + targetRect.width / 2 - calloutSize.width / 2

    switch (step.placement) {
      case "top":
        top = targetRect.top - calloutSize.height - gap
        left = targetRect.left + targetRect.width / 2 - calloutSize.width / 2
        break
      case "bottom":
        top = targetRect.bottom + gap
        left = targetRect.left + targetRect.width / 2 - calloutSize.width / 2
        break
      case "left":
        top = targetRect.top + targetRect.height / 2 - calloutSize.height / 2
        left = targetRect.left - calloutSize.width - gap
        break
      case "right":
        top = targetRect.top + targetRect.height / 2 - calloutSize.height / 2
        left = targetRect.right + gap
        break
    }

    const maxLeft = window.innerWidth - calloutSize.width - 12
    const maxTop = window.innerHeight - calloutSize.height - 12

    return {
      top: clamp(top, 12, Math.max(12, maxTop)),
      left: clamp(left, 12, Math.max(12, maxLeft))
    }
  }, [targetRect, calloutSize, step])

  if (!isPortfolioHome) return null

  const hasActiveStep = state.active && step

  const handleStart = () => {
    persistState({ active: true, completed: false, stepIndex: 0 })
  }

  const handleClose = () => {
    persistState({ ...state, active: false, completed: true })
  }

  const handleSkip = () => {
    persistState({ ...state, active: false, completed: true })
  }

  const handleNext = () => {
    const nextIndex = state.stepIndex + 1
    if (nextIndex >= STEPS.length) {
      persistState({ active: false, completed: true, stepIndex: STEPS.length - 1 })
      return
    }
    persistState({ ...state, stepIndex: nextIndex })
  }

  const handleBack = () => {
    const prevIndex = Math.max(0, state.stepIndex - 1)
    persistState({ ...state, stepIndex: prevIndex })
  }

  if (!hasActiveStep) {
    return (
      <div className="fixed bottom-6 right-6 z-[120]">
        <Button
          variant="outline"
          size="sm"
          className="shadow-lg bg-white"
          onClick={handleStart}
        >
          <HelpCircle className="h-4 w-4 mr-2" />
          Portfolio Tour
        </Button>
      </div>
    )
  }

  const isMissingTarget = !!step.selector && !targetRect
  const bodyText = isMissingTarget && step.optional ? step.missingBody || step.body : step.body

  return (
    <div className="fixed inset-0 z-[140] pointer-events-none">
      {targetRect ? (
        <div
          className="absolute z-0 rounded-xl border-2 border-yellow-400 shadow-[0_0_0_9999px_rgba(15,23,42,0.55)]"
          style={{
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12
          }}
        />
      ) : (
        <div className="absolute inset-0 z-0 bg-slate-950/60" />
      )}

      <div
        ref={calloutRef}
        className={cn(
          "pointer-events-auto absolute z-10 bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 w-80 max-w-[calc(100vw-32px)]"
        )}
        style={calloutStyle}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500">
            Step {state.stepIndex + 1} of {STEPS.length}
          </span>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600"
            aria-label="End tour"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <h3 className="text-base font-semibold text-slate-900 mb-2">{step.title}</h3>
        <p className="text-sm text-slate-600 mb-4">{bodyText}</p>
        <div className="flex items-center justify-between">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleBack}
            disabled={state.stepIndex === 0}
          >
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleSkip}>
              Skip
            </Button>
            <Button size="sm" onClick={handleNext}>
              {state.stepIndex === STEPS.length - 1 ? "Finish" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
