'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

type HealthState =
  | { ok: true; checked: boolean }
  | { ok: false; checked: boolean; message: string }

export function DbHealthBanner() {
  const [state, setState] = useState<HealthState>({ ok: true, checked: false })
  const [isRefreshing, setIsRefreshing] = useState(false)

  const checkHealth = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const response = await fetch('/api/health/db', {
        method: 'GET',
        cache: 'no-store',
      })
      const payload = await response.json().catch(() => null)
      if (response.ok && payload?.ok) {
        setState({ ok: true, checked: true })
      } else {
        setState({
          ok: false,
          checked: true,
          message:
            typeof payload?.message === 'string'
              ? payload.message
              : 'Database is currently unavailable. Track changes may fail until connectivity is restored.',
        })
      }
    } catch {
      setState({
        ok: false,
        checked: true,
        message: 'Database health check failed. Confirm database connectivity before creating tracks.',
      })
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    checkHealth()
  }, [checkHealth])

  if (!state.checked || state.ok) {
    return null
  }

  return (
    <div className="mb-6 rounded-md border border-[#c03030] bg-[#2e1a1a] px-4 py-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-2 text-[#c03030]">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold">Database connectivity issue</p>
            <p className="text-sm text-[#c03030]">{state.message}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={checkHealth}
          disabled={isRefreshing}
          className="border-[#c03030] bg-[var(--bg-panel)] text-[#c03030] hover:bg-[#2e1a1a]"
        >
          <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          Retry
        </Button>
      </div>
    </div>
  )
}

