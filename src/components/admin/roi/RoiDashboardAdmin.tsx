'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ComponentType } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { json } from '@/lib/http'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Activity,
  BarChart3,
  Layers,
  Sliders,
  Sparkles,
  Trash2
} from 'lucide-react'

type TabId = 'settings' | 'model' | 'benchmarks' | 'allocation' | 'change-log'

interface PreviewResponse {
  metrics: {
    roiSinceInceptionPct: number
    roiLast30DaysPct: number
    maxDrawdownPct: number
    investedPct: number
    cashPct: number
    lastUpdatedAt: string | null
    asOfDate: string | null
  }
  validation: {
    errors: string[]
    warnings: string[]
  }
  counts: {
    model: number
    btc: number
    eth: number
    changeLogEvents: number
  }
}

interface SettingsForm {
  inceptionDate: string
  disclaimerText: string
  showBtcBenchmark: boolean
  showEthBenchmark: boolean
  showSimulator: boolean
  showChangeLog: boolean
  showAllocation: boolean
}

interface SeriesRow {
  id: string
  date: string
  value: number
}

interface SeriesResponse {
  seriesType: string
  page: number
  pageSize: number
  total: number
  rows: SeriesRow[]
}

interface AllocationItem {
  asset: string
  weight: number
}

interface AllocationForm {
  asOfDate: string
  cashWeight: number
  items: AllocationItem[]
}

interface ChangeLogEvent {
  id: string
  date: string
  title: string
  summary: string
  linkUrl?: string | null
}

const tabs: Array<{ id: TabId; label: string; icon: ComponentType<{ className?: string }> }> = [
  { id: 'settings', label: 'Settings', icon: Sliders },
  { id: 'model', label: 'Model Series', icon: Activity },
  { id: 'benchmarks', label: 'Benchmarks', icon: BarChart3 },
  { id: 'allocation', label: 'Allocation', icon: Layers },
  { id: 'change-log', label: 'Change Log', icon: Sparkles }
]

const formatPercent = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`

function PreviewPanel() {
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const loadPreview = async () => {
    setLoading(true)
    try {
      const data = await json<PreviewResponse>('/api/admin/roi/preview')
      setPreview(data)
    } catch (error: any) {
      toast.error(error.message || 'Failed to load preview')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPreview()
  }, [])

  return (
    <Card className="card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Preview & Validation</CardTitle>
        <Button variant="outline" size="sm" onClick={loadPreview} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh Preview'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {preview ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-slate-500">ROI Since Tracking Started</p>
                <p className={cn('text-lg font-semibold', preview.metrics.roiSinceInceptionPct >= 0 ? 'text-green-600' : 'text-red-600')}>
                  {formatPercent(preview.metrics.roiSinceInceptionPct)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">ROI (last 30 days)</p>
                <p className={cn('text-lg font-semibold', preview.metrics.roiLast30DaysPct >= 0 ? 'text-green-600' : 'text-red-600')}>
                  {formatPercent(preview.metrics.roiLast30DaysPct)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Max Drawdown</p>
                <p className="text-lg font-semibold text-red-600">
                  {formatPercent(preview.metrics.maxDrawdownPct)}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-slate-500">Invested vs Cash</p>
                <p className="text-sm text-slate-700">
                  {preview.metrics.investedPct.toFixed(1)}% invested / {preview.metrics.cashPct.toFixed(1)}% cash
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">As Of</p>
                <p className="text-sm text-slate-700">{preview.metrics.asOfDate ?? '--'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Series Counts</p>
                <p className="text-sm text-slate-700">
                  Model {preview.counts.model} | BTC {preview.counts.btc} | ETH {preview.counts.eth}
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900 mb-2">Validation</p>
              {preview.validation.errors.length === 0 && preview.validation.warnings.length === 0 ? (
                <p className="text-sm text-emerald-600">No validation issues detected.</p>
              ) : (
                <div className="space-y-2">
                  {preview.validation.errors.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-red-600">Errors</p>
                      <ul className="text-sm text-red-600 list-disc list-inside">
                        {preview.validation.errors.map((error) => (
                          <li key={error}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {preview.validation.warnings.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-amber-600">Warnings</p>
                      <ul className="text-sm text-amber-600 list-disc list-inside">
                        {preview.validation.warnings.map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-500">Loading preview...</p>
        )}
      </CardContent>
    </Card>
  )
}

function SettingsTab() {
  const [settings, setSettings] = useState<SettingsForm>({
    inceptionDate: '',
    disclaimerText: '',
    showBtcBenchmark: true,
    showEthBenchmark: true,
    showSimulator: true,
    showChangeLog: true,
    showAllocation: true
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await json<SettingsForm>('/api/admin/roi/settings')
        setSettings(data)
      } catch (error: any) {
        toast.error(error.message || 'Failed to load settings')
      } finally {
        setLoading(false)
      }
    }
    loadSettings()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await json('/api/admin/roi/settings', {
        method: 'POST',
        body: JSON.stringify(settings)
      })
      toast.success('Settings saved')
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading settings...</p>
  }

  return (
    <Card className="card">
      <CardHeader>
        <CardTitle>Dashboard Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Inception Date</label>
            <Input
              type="date"
              value={settings.inceptionDate}
              onChange={(event) => setSettings((prev) => ({ ...prev, inceptionDate: event.target.value }))}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Disclaimer Text</label>
          <Textarea
            rows={4}
            value={settings.disclaimerText}
            onChange={(event) => setSettings((prev) => ({ ...prev, disclaimerText: event.target.value }))}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-center justify-between border rounded-lg p-3">
            <span className="text-sm text-slate-700">Show BTC Benchmark</span>
            <Switch
              checked={settings.showBtcBenchmark}
              onChange={(event) => setSettings((prev) => ({ ...prev, showBtcBenchmark: event.target.checked }))}
            />
          </label>
          <label className="flex items-center justify-between border rounded-lg p-3">
            <span className="text-sm text-slate-700">Show ETH Benchmark</span>
            <Switch
              checked={settings.showEthBenchmark}
              onChange={(event) => setSettings((prev) => ({ ...prev, showEthBenchmark: event.target.checked }))}
            />
          </label>
          <label className="flex items-center justify-between border rounded-lg p-3">
            <span className="text-sm text-slate-700">Show Simulator</span>
            <Switch
              checked={settings.showSimulator}
              onChange={(event) => setSettings((prev) => ({ ...prev, showSimulator: event.target.checked }))}
            />
          </label>
          <label className="flex items-center justify-between border rounded-lg p-3">
            <span className="text-sm text-slate-700">Show Change Log</span>
            <Switch
              checked={settings.showChangeLog}
              onChange={(event) => setSettings((prev) => ({ ...prev, showChangeLog: event.target.checked }))}
            />
          </label>
          <label className="flex items-center justify-between border rounded-lg p-3">
            <span className="text-sm text-slate-700">Show Allocation</span>
            <Switch
              checked={settings.showAllocation}
              onChange={(event) => setSettings((prev) => ({ ...prev, showAllocation: event.target.checked }))}
            />
          </label>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function SeriesManager({ seriesType, title, description }: { seriesType: 'MODEL' | 'BTC' | 'ETH'; title: string; description: string }) {
  const [rows, setRows] = useState<SeriesRow[]>([])
  const [page, setPage] = useState(1)
  const [pageSize] = useState(50)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ date: '', value: '' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [csvText, setCsvText] = useState('')
  const [replaceExisting, setReplaceExisting] = useState(false)
  const [importing, setImporting] = useState(false)

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize])

  const loadSeries = async () => {
    setLoading(true)
    try {
      const data = await json<SeriesResponse>(
        `/api/admin/roi/series?seriesType=${seriesType}&page=${page}&pageSize=${pageSize}`
      )
      setRows(data.rows)
      setTotal(data.total)
    } catch (error: any) {
      toast.error(error.message || `Failed to load ${seriesType} series`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSeries()
  }, [seriesType, page])

  const resetForm = () => {
    setForm({ date: '', value: '' })
    setEditingId(null)
  }

  const handleSubmit = async () => {
    if (!form.date || !form.value) {
      toast.error('Date and value are required.')
      return
    }
    const payload = {
      seriesType,
      date: form.date,
      value: Number(form.value)
    }
    try {
      if (editingId) {
        await json(`/api/admin/roi/series/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify({ date: form.date, value: Number(form.value) })
        })
        toast.success('Series point updated')
      } else {
        await json('/api/admin/roi/series', {
          method: 'POST',
          body: JSON.stringify(payload)
        })
        toast.success('Series point added')
      }
      resetForm()
      await loadSeries()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save series point')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await json(`/api/admin/roi/series/${id}`, { method: 'DELETE' })
      toast.success('Series point deleted')
      await loadSeries()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete series point')
    }
  }

  const handleImport = async () => {
    if (!csvText.trim()) {
      toast.error('Paste CSV data to import.')
      return
    }
    setImporting(true)
    try {
      await json('/api/admin/roi/series/import', {
        method: 'POST',
        body: JSON.stringify({
          seriesType,
          csvText,
          replaceExisting
        })
      })
      toast.success('CSV imported')
      setCsvText('')
      await loadSeries()
    } catch (error: any) {
      toast.error(error.message || 'CSV import failed')
    } finally {
      setImporting(false)
    }
  }

  return (
    <Card className="card">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-slate-500">{description}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Date</label>
            <Input
              type="date"
              value={form.date}
              onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Value</label>
            <Input
              type="number"
              step="0.0001"
              value={form.value}
              onChange={(event) => setForm((prev) => ({ ...prev, value: event.target.value }))}
            />
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={handleSubmit}>{editingId ? 'Update' : 'Add'} Point</Button>
            {editingId && (
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            )}
          </div>
        </div>

        <div className="border rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium text-slate-700">CSV Import (date,value)</p>
          <Textarea
            rows={4}
            placeholder="2024-01-01,100\n2024-01-02,101.2"
            value={csvText}
            onChange={(event) => setCsvText(event.target.value)}
          />
          <label className="flex items-center justify-between border rounded-lg p-3">
            <span className="text-sm text-slate-700">Replace existing series before import</span>
            <Switch checked={replaceExisting} onChange={(event) => setReplaceExisting(event.target.checked)} />
          </label>
          <Button onClick={handleImport} disabled={importing}>
            {importing ? 'Importing...' : 'Import CSV'}
          </Button>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-slate-700">Series Points</p>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1}
              >
                Prev
              </Button>
              <span>
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
          {loading ? (
            <p className="text-sm text-slate-500">Loading series...</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-slate-500">No data yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Date</th>
                    <th className="text-left py-2">Value</th>
                    <th className="text-right py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b last:border-b-0">
                      <td className="py-2">{row.date}</td>
                      <td className="py-2">{row.value.toFixed(4)}</td>
                      <td className="py-2">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingId(row.id)
                              setForm({ date: row.date, value: row.value.toString() })
                            }}
                          >
                            Edit
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(row.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function AllocationTab() {
  const [form, setForm] = useState<AllocationForm>({
    asOfDate: '',
    cashWeight: 0,
    items: []
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loadAllocation = async () => {
      try {
        const data = await json<AllocationForm | null>('/api/admin/roi/allocation')
        if (data) {
          setForm(data)
        }
      } catch (error: any) {
        toast.error(error.message || 'Failed to load allocation')
      } finally {
        setLoading(false)
      }
    }
    loadAllocation()
  }, [])

  const updateItem = (index: number, update: Partial<AllocationItem>) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, ...update } : item))
    }))
  }

  const addItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { asset: '', weight: 0 }]
    }))
  }

  const removeItem = (index: number) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  const totalWeight = useMemo(
    () => form.items.reduce((sum, item) => sum + Number(item.weight || 0), form.cashWeight || 0),
    [form]
  )

  const handleSave = async () => {
    setSaving(true)
    try {
      await json('/api/admin/roi/allocation', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          cashWeight: Number(form.cashWeight),
          items: form.items.map((item) => ({
            asset: item.asset,
            weight: Number(item.weight)
          }))
        })
      })
      toast.success('Allocation saved')
    } catch (error: any) {
      toast.error(error.message || 'Failed to save allocation')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading allocation...</p>
  }

  return (
    <Card className="card">
      <CardHeader>
        <CardTitle>Allocation Snapshot</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700">As Of Date</label>
            <Input
              type="date"
              value={form.asOfDate}
              onChange={(event) => setForm((prev) => ({ ...prev, asOfDate: event.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Cash Weight</label>
            <Input
              type="number"
              step="0.001"
              min="0"
              max="1"
              value={form.cashWeight}
              onChange={(event) => setForm((prev) => ({ ...prev, cashWeight: Number(event.target.value) }))}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">Asset Weights</p>
            <Button variant="outline" size="sm" onClick={addItem}>
              Add Asset
            </Button>
          </div>
          {form.items.length === 0 ? (
            <p className="text-sm text-slate-500">No assets added yet.</p>
          ) : (
            <div className="space-y-2">
              {form.items.map((item, index) => (
                <div key={`${item.asset}-${index}`} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                  <Input
                    placeholder="Asset"
                    value={item.asset}
                    onChange={(event) => updateItem(index, { asset: event.target.value })}
                  />
                  <Input
                    type="number"
                    step="0.001"
                    min="0"
                    max="1"
                    value={item.weight}
                    onChange={(event) => updateItem(index, { weight: Number(event.target.value) })}
                  />
                  <div className="flex justify-end">
                    <Button variant="ghost" size="sm" onClick={() => removeItem(index)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className={cn('text-sm', Math.abs(totalWeight - 1) <= 0.005 ? 'text-emerald-600' : 'text-amber-600')}>
            Total weight: {totalWeight.toFixed(3)}
          </p>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Allocation'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ChangeLogTab() {
  const [events, setEvents] = useState<ChangeLogEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    id: '',
    date: '',
    title: '',
    summary: '',
    linkUrl: ''
  })

  const loadEvents = async () => {
    setLoading(true)
    try {
      const data = await json<ChangeLogEvent[]>('/api/admin/roi/change-log?take=50')
      setEvents(data)
    } catch (error: any) {
      toast.error(error.message || 'Failed to load change log')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEvents()
  }, [])

  const resetForm = () => {
    setForm({ id: '', date: '', title: '', summary: '', linkUrl: '' })
  }

  const handleSave = async () => {
    if (!form.date || !form.title || !form.summary) {
      toast.error('Date, title, and summary are required.')
      return
    }
    try {
      if (form.id) {
        await json(`/api/admin/roi/change-log/${form.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            date: form.date,
            title: form.title,
            summary: form.summary,
            linkUrl: form.linkUrl || null
          })
        })
        toast.success('Change log updated')
      } else {
        await json('/api/admin/roi/change-log', {
          method: 'POST',
          body: JSON.stringify({
            date: form.date,
            title: form.title,
            summary: form.summary,
            linkUrl: form.linkUrl || null
          })
        })
        toast.success('Change log added')
      }
      resetForm()
      await loadEvents()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save change log entry')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await json(`/api/admin/roi/change-log/${id}`, { method: 'DELETE' })
      toast.success('Change log deleted')
      await loadEvents()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete change log entry')
    }
  }

  return (
    <Card className="card">
      <CardHeader>
        <CardTitle>Change Log Events</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Date</label>
            <Input type="date" value={form.date} onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Title</label>
            <Input value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Summary</label>
            <Textarea rows={3} value={form.summary} onChange={(event) => setForm((prev) => ({ ...prev, summary: event.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Optional Link</label>
            <Input value={form.linkUrl} onChange={(event) => setForm((prev) => ({ ...prev, linkUrl: event.target.value }))} placeholder="https://..." />
          </div>
          <div className="md:col-span-2 flex justify-end gap-2">
            {form.id && (
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            )}
            <Button onClick={handleSave}>{form.id ? 'Update' : 'Add'} Event</Button>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-slate-700 mb-3">Recent Events</p>
          {loading ? (
            <p className="text-sm text-slate-500">Loading events...</p>
          ) : events.length === 0 ? (
            <p className="text-sm text-slate-500">No events yet.</p>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div key={event.id} className="border rounded-lg p-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs text-slate-500">{event.date}</p>
                    <p className="text-sm font-semibold text-slate-800">{event.title}</p>
                    <p className="text-sm text-slate-600">{event.summary}</p>
                    {event.linkUrl && (
                      <a className="text-xs text-blue-600 underline" href={event.linkUrl} target="_blank" rel="noreferrer">
                        {event.linkUrl}
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setForm({
                          id: event.id,
                          date: event.date,
                          title: event.title,
                          summary: event.summary,
                          linkUrl: event.linkUrl || ''
                        })
                      }
                    >
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(event.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function RoiDashboardAdmin() {
  const [activeTab, setActiveTab] = useState<TabId>('settings')

  return (
    <div className="space-y-6">
      <PreviewPanel />
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'outline'}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2"
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </Button>
        ))}
      </div>
      {activeTab === 'settings' && <SettingsTab />}
      {activeTab === 'model' && (
        <SeriesManager
          seriesType="MODEL"
          title="Model Portfolio Series"
          description="Daily model performance values used for ROI calculations."
        />
      )}
      {activeTab === 'benchmarks' && (
        <div className="space-y-6">
          <SeriesManager
            seriesType="BTC"
            title="BTC Benchmark Series"
            description="Daily BTC benchmark values for comparison."
          />
          <SeriesManager
            seriesType="ETH"
            title="ETH Benchmark Series"
            description="Daily ETH benchmark values for comparison."
          />
        </div>
      )}
      {activeTab === 'allocation' && <AllocationTab />}
      {activeTab === 'change-log' && <ChangeLogTab />}
    </div>
  )
}
