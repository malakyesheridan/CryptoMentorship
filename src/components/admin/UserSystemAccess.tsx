'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

type AvailableSystem = {
  slug: string
  name: string
  shortName: string
  description: string
}

type Assignment = {
  systemSlug: string
  isActive: boolean
  assignedAt: string
}

type ApiResponse = {
  userId: string
  assignments: Assignment[]
  availableSystems: AvailableSystem[]
}

interface UserSystemAccessProps {
  userId: string
}

export function UserSystemAccess({ userId }: UserSystemAccessProps) {
  const [available, setAvailable] = useState<AvailableSystem[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [initialSelected, setInitialSelected] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/users/${userId}/systems`)
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'Failed to load system assignments')
      }
      const data = (await res.json()) as ApiResponse
      const activeSlugs = new Set(
        data.assignments.filter((a) => a.isActive).map((a) => a.systemSlug)
      )
      setAvailable(data.availableSystems)
      setSelected(activeSlugs)
      setInitialSelected(new Set(activeSlugs))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  const toggle = (slug: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }

  const isDirty = useMemo(() => {
    if (selected.size !== initialSelected.size) return true
    let dirty = false
    selected.forEach((s) => {
      if (!initialSelected.has(s)) dirty = true
    })
    return dirty
  }, [selected, initialSelected])

  const handleSave = async () => {
    if (!isDirty || isSaving) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}/systems`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systems: Array.from(selected) }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'Failed to save assignments')
      }
      const data = (await res.json()) as { assignments: Assignment[] }
      const newSelected = new Set(
        data.assignments.filter((a) => a.isActive).map((a) => a.systemSlug)
      )
      setSelected(newSelected)
      setInitialSelected(new Set(newSelected))
      toast.success('System access updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div>
      <h3 className="font-semibold text-lg mb-2">System Access</h3>
      <p className="text-sm text-[var(--text-muted)] mb-4">
        Select which systems this user receives signals for.
      </p>

      {isLoading && (
        <p className="text-sm text-[var(--text-muted)]">Loading systems…</p>
      )}

      {error && !isLoading && (
        <div>
          <p className="text-sm text-[var(--danger)]">{error}</p>
          <Button onClick={load} className="mt-2" variant="outline" size="sm">
            Retry
          </Button>
        </div>
      )}

      {!isLoading && !error && (
        <>
          <div className="space-y-2">
            {available.map((system) => {
              const isOn = selected.has(system.slug)
              return (
                <label
                  key={system.slug}
                  className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-[var(--bg-hover)]"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 cursor-pointer"
                    checked={isOn}
                    onChange={() => toggle(system.slug)}
                    disabled={isSaving}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-[var(--text-strong)]">
                      {system.shortName}
                    </div>
                    <div className="text-xs text-[var(--text-muted)] mt-0.5">
                      {system.description}
                    </div>
                  </div>
                </label>
              )
            })}
          </div>

          <div className="mt-4 flex items-center gap-3">
            <Button onClick={handleSave} disabled={!isDirty || isSaving} size="sm">
              {isSaving ? 'Saving…' : 'Save changes'}
            </Button>
            {isDirty && !isSaving && (
              <span className="text-xs text-[var(--text-muted)]">
                Unsaved changes
              </span>
            )}
          </div>
        </>
      )}
    </div>
  )
}
