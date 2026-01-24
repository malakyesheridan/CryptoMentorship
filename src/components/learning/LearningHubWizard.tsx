"use client"

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { HelpCircle, X } from "lucide-react"
import { cn } from "@/lib/utils"

type Placement = "top" | "bottom" | "left" | "right"

type WizardStep = {
  id: string
  title: string
  body: string
  route: string
  selector?: string
  placement?: Placement
  optional?: boolean
  navigateTo?: string
  routeLabel?: string
  missingBody?: string
}

type WizardState = {
  active: boolean
  completed: boolean
  stepIndex: number
}

const STORAGE_KEY = "learningHubWizard.v2"

const STEPS: WizardStep[] = [
  {
    id: "learning-tabs",
    title: "Switch views",
    body: "Use these tabs to jump between Discover and Progress.",
    route: "/learning",
    selector: "[data-tour=\"learning-tabs\"]",
    placement: "bottom"
  },
  {
    id: "learning-search",
    title: "Find a track",
    body: "Search by topic or keyword to narrow the list.",
    route: "/learning",
    selector: "[data-tour=\"learning-search\"]",
    placement: "bottom"
  },
  {
    id: "learning-grid",
    title: "Pick a learning track",
    body: "These are your learning tracks. Each one is a full path.",
    route: "/learning",
    selector: "[data-tour=\"learning-track-grid\"]",
    placement: "top"
  },
  {
    id: "learning-track-cta",
    title: "Start a track",
    body: "Open a track to view lessons, quizzes, and progress.",
    route: "/learning",
    selector: "[data-tour=\"learning-track-cta\"]",
    placement: "top"
  },
  {
    id: "track-progress",
    title: "Track progress",
    body: "Your progress updates as you complete lessons.",
    route: "/learn/*",
    selector: "[data-tour=\"track-progress\"]",
    placement: "bottom",
    optional: true,
    missingBody: "Progress appears after you start a track.",
    routeLabel: "a learning track"
  },
  {
    id: "track-continue",
    title: "Continue learning",
    body: "Jump straight to the next lesson anytime.",
    route: "/learn/*",
    selector: "[data-tour=\"track-continue\"]",
    placement: "bottom",
    routeLabel: "a learning track"
  },
  {
    id: "lesson-sidebar",
    title: "Lesson list",
    body: "Use the sidebar to move between lessons and see what's complete.",
    route: "/learn/*/lesson/*",
    selector: "[data-tour=\"lesson-sidebar\"]",
    placement: "right",
    routeLabel: "a lesson"
  },
  {
    id: "lesson-video",
    title: "Video player",
    body: "Watch the lesson here. Fullscreen and playback controls are available.",
    route: "/learn/*/lesson/*",
    selector: "[data-tour=\"lesson-video\"]",
    placement: "top",
    optional: true,
    missingBody: "This lesson might be text-only or locked.",
    routeLabel: "a lesson"
  },
  {
    id: "lesson-complete",
    title: "Mark complete",
    body: "Finish the lesson once you complete the video (and quiz, if required).",
    route: "/learn/*/lesson/*",
    selector: "[data-tour=\"lesson-complete\"]",
    placement: "top",
    optional: true,
    missingBody: "This button appears after the lesson is ready to complete.",
    routeLabel: "a lesson"
  },
  {
    id: "lesson-next",
    title: "Next lesson",
    body: "Move to the next lesson or finish the track.",
    route: "/learn/*/lesson/*",
    selector: "[data-tour=\"lesson-next\"]",
    placement: "top",
    optional: true,
    missingBody: "This appears once there is another lesson available.",
    routeLabel: "a lesson"
  }
]

function matchesRoute(pattern: string, pathname: string) {
  if (pattern === pathname) return true
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const regex = new RegExp(`^${escaped.replace(/\\\*/g, "[^/]+")}$`)
  return regex.test(pathname)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function LearningHubWizard() {
  const pathname = usePathname()
  const router = useRouter()
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

  const isLearningRoute = pathname.startsWith("/learning") || pathname.startsWith("/learn")

  const step = STEPS[state.stepIndex]
  const stepOnRoute = step ? matchesRoute(step.route, pathname) : false

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
        setState({ active: pathname === "/learning", completed: false, stepIndex: 0 })
      }
    } else {
      setState({ active: pathname === "/learning", completed: false, stepIndex: 0 })
    }
    setIsReady(true)
  }, [pathname])

  useEffect(() => {
    if (!isReady || typeof window === "undefined") return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state, isReady])

  useEffect(() => {
    if (!state.active || !step || !stepOnRoute) {
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
  }, [state.active, step?.id, stepOnRoute])

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

  if (!isLearningRoute) return null

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
    const nextStep = STEPS[nextIndex]
    persistState({ ...state, stepIndex: nextIndex })
    if (nextStep?.navigateTo) {
      router.push(nextStep.navigateTo)
    }
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
          Learning Hub Tour
        </Button>
      </div>
    )
  }

  if (!stepOnRoute) {
    return (
      <div className="fixed bottom-6 right-6 z-[130]">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-4 w-72">
          <p className="text-sm font-semibold text-slate-900 mb-2">Continue your tour</p>
          <p className="text-sm text-slate-600 mb-4">
            Head to {step.routeLabel || "the next Learning Hub page"} to keep going.
          </p>
          <div className="flex items-center gap-2">
            {step.navigateTo ? (
              <Button size="sm" onClick={() => router.push(step.navigateTo as string)}>
                Go now
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => persistState({ ...state, active: false })}>
                Pause tour
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={handleSkip}>
              End
            </Button>
          </div>
        </div>
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
