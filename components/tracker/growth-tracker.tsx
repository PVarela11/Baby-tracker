'use client'

import { useState } from 'react'
import { Baby, Ruler, Scale, Plus, Pencil, Trash2, X } from 'lucide-react'
import type { GrowthLogsApi } from '@/hooks/use-growth-logs'
import type { GrowthLog } from '@/lib/types'
import { cn } from '@/lib/utils'

export function GrowthTracker({ api }: { api: GrowthLogsApi }) {
  const [addOpen, setAddOpen] = useState(false)
  const [editLog, setEditLog] = useState<GrowthLog | null>(null)
  const [formData, setFormData] = useState({
    log_date: new Date().toISOString().split('T')[0],
    weight_kg: '',
    height_cm: '',
    head_circumference_cm: '',
    notes: '',
  })
  const [busy, setBusy] = useState(false)

  function openAdd() {
    setFormData({
      log_date: new Date().toISOString().split('T')[0],
      weight_kg: '',
      height_cm: '',
      head_circumference_cm: '',
      notes: '',
    })
    setAddOpen(true)
  }

  function openEdit(log: GrowthLog) {
    setEditLog(log)
    setFormData({
      log_date: log.log_date,
      weight_kg: log.weight_kg?.toString() || '',
      height_cm: log.height_cm?.toString() || '',
      head_circumference_cm: log.head_circumference_cm?.toString() || '',
      notes: log.notes || '',
    })
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const data = {
        log_date: formData.log_date,
        weight_kg: formData.weight_kg ? Number.parseFloat(formData.weight_kg) : null,
        height_cm: formData.height_cm ? Number.parseFloat(formData.height_cm) : null,
        head_circumference_cm: formData.head_circumference_cm ? Number.parseFloat(formData.head_circumference_cm) : null,
        notes: formData.notes || null,
      }

      if (editLog) {
        await api.updateGrowthLog(editLog.id, data)
        setEditLog(null)
      } else {
        await api.createGrowthLog(data)
        setAddOpen(false)
      }
    } finally {
      setBusy(false)
    }
  }

  async function deleteLog(id: string) {
    if (!confirm('Delete this growth log?')) return
    setBusy(true)
    try {
      await api.deleteGrowthLog(id)
      if (editLog?.id === id) setEditLog(null)
    } finally {
      setBusy(false)
    }
  }

  const sortedLogs = [...api.logs].sort((a, b) => b.log_date.localeCompare(a.log_date))
  const weightLogs = sortedLogs.filter((l) => l.weight_kg).sort((a, b) => a.log_date.localeCompare(b.log_date))

  return (
    <section aria-labelledby="growth-heading" className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 id="growth-heading" className="text-lg font-semibold">Growth Tracker</h2>
        <button
          type="button"
          onClick={openAdd}
          className="flex items-center gap-2 rounded-xl bg-sleep px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-sleep/90"
        >
          <Plus className="size-4" aria-hidden />
          Add Log
        </button>
      </div>

      {weightLogs.length >= 2 && <WeightChart logs={weightLogs} />}

      {sortedLogs.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          No growth logs yet. Add your first measurement.
        </p>
      ) : (
        <ul className="flex flex-col divide-y rounded-2xl border bg-card">
          {sortedLogs.map((log) => (
            <GrowthLogRow key={log.id} log={log} onEdit={() => openEdit(log)} onDelete={() => deleteLog(log.id)} />
          ))}
        </ul>
      )}

      {(addOpen || editLog) && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
          <div className="w-full max-w-md rounded-t-3xl border bg-card p-5 sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{editLog ? 'Edit' : 'Add'} Growth Log</h3>
              <button
                type="button"
                onClick={() => {
                  setAddOpen(false)
                  setEditLog(null)
                }}
                className="flex size-10 items-center justify-center rounded-xl bg-secondary"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <form onSubmit={save} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Date
                <input
                  type="date"
                  value={formData.log_date}
                  onChange={(e) => setFormData({ ...formData, log_date: e.target.value })}
                  className="h-12 rounded-xl border bg-secondary px-3 text-base text-foreground"
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Weight (kg)
                <input
                  type="number"
                  step="0.01"
                  value={formData.weight_kg}
                  onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
                  className="h-12 rounded-xl border bg-secondary px-3 font-mono text-base text-foreground"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Height (cm)
                <input
                  type="number"
                  step="0.1"
                  value={formData.height_cm}
                  onChange={(e) => setFormData({ ...formData, height_cm: e.target.value })}
                  className="h-12 rounded-xl border bg-secondary px-3 font-mono text-base text-foreground"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Head Circumference (cm)
                <input
                  type="number"
                  step="0.1"
                  value={formData.head_circumference_cm}
                  onChange={(e) => setFormData({ ...formData, head_circumference_cm: e.target.value })}
                  className="h-12 rounded-xl border bg-secondary px-3 font-mono text-base text-foreground"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Notes (optional)
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="h-20 rounded-xl border bg-secondary px-3 text-sm text-foreground resize-none"
                  maxLength={1000}
                />
              </label>
              <button
                type="submit"
                disabled={busy}
                className="h-12 rounded-xl bg-sleep px-5 font-semibold text-background disabled:opacity-60"
              >
                {busy ? 'Saving...' : 'Save'}
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

function GrowthLogRow({ log, onEdit, onDelete }: { log: GrowthLog; onEdit: () => void; onDelete: () => void }) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <li className="flex items-center gap-3 px-3 py-3">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-medium">{formatDate(log.log_date)}</span>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {log.weight_kg && (
            <span className="flex items-center gap-1">
              <Scale className="size-3" aria-hidden />
              {log.weight_kg.toFixed(2)} kg
            </span>
          )}
          {log.height_cm && (
            <span className="flex items-center gap-1">
              <Ruler className="size-3" aria-hidden />
              {log.height_cm.toFixed(1)} cm
            </span>
          )}
          {log.head_circumference_cm && (
            <span className="flex items-center gap-1">
              <Ruler className="size-3" aria-hidden />
              {log.head_circumference_cm.toFixed(1)} cm
            </span>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="flex size-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary"
      >
        <Pencil className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="flex size-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-destructive"
      >
        <Trash2 className="size-4" aria-hidden />
      </button>
    </li>
  )
}

function WeightChart({ logs }: { logs: GrowthLog[] }) {
  const weights = logs.map((l) => l.weight_kg!)
  const minWeight = Math.min(...weights) * 0.95
  const maxWeight = Math.max(...weights) * 1.05
  const range = maxWeight - minWeight

  const points = logs.map((log, i) => {
    const x = (i / (logs.length - 1)) * 100
    const y = 100 - ((log.weight_kg! - minWeight) / range) * 100
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="rounded-2xl border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-sleep">Weight Over Time</h3>
      <div className="relative h-40 w-full">
        <svg viewBox="0 0 100 100" className="h-full w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.6" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="1" />
            </linearGradient>
          </defs>
          <polyline
            points={points}
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            className="text-sleep"
          />
          {logs.map((log, i) => {
            const x = (i / (logs.length - 1)) * 100
            const y = 100 - ((log.weight_kg! - minWeight) / range) * 100
            return (
              <circle
                key={log.id}
                cx={x}
                cy={y}
                r="3"
                fill="currentColor"
                className="text-sleep"
              />
            )
          })}
        </svg>
        <div className="absolute bottom-0 left-0 text-[10px] text-muted-foreground">
          {minWeight.toFixed(2)} kg
        </div>
        <div className="absolute top-0 left-0 text-[10px] text-muted-foreground">
          {maxWeight.toFixed(2)} kg
        </div>
      </div>
    </div>
  )
}
