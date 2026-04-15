import { useRef, useState, useMemo, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { DiagnosisResultPanel } from '../components/DiagnosisResultPanel'
import { diagnosesApi, landsApi } from '../lib/api'

const LOAD_STEPS = ['Uploading images…', 'AI analysing photos…', 'Generating report…']

/**
 * Soil/crop AI diagnosis — multipart upload; image previews, stepped loading overlay,
 * results stored server-side with optional land context.
 */
export function DiagnosePage() {
  const qc = useQueryClient()
  const submitLockRef = useRef(false)
  const [notes, setNotes] = useState('')
  const [landId, setLandId] = useState('')
  const [files, setFiles] = useState([])
  const [localError, setLocalError] = useState('')
  /** Cycles while the create mutation is in flight (UX feedback during slow Gemini calls). */
  const [loadStepIndex, setLoadStepIndex] = useState(0)

  const previewUrls = useMemo(() => files.map((f) => ({ url: URL.createObjectURL(f), name: f.name })), [files])

  useEffect(() => {
    return () => {
      previewUrls.forEach((p) => URL.revokeObjectURL(p.url))
    }
  }, [previewUrls])

  const landsQ = useQuery({
    queryKey: ['lands', 'mine'],
    queryFn: () => landsApi.mine(),
  })

  const createMut = useMutation({
    mutationFn: (formData) => diagnosesApi.create(formData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['diagnoses'] })
      qc.invalidateQueries({ queryKey: ['notifications'] })
      setFiles([])
      setNotes('')
      setLandId('')
      setLocalError('')
    },
    onError: (e) => setLocalError(e.message),
    onSettled: () => {
      submitLockRef.current = false
    },
  })

  useEffect(() => {
    if (!createMut.isPending) {
      setLoadStepIndex(0)
      return
    }
    const id = setInterval(() => {
      setLoadStepIndex((i) => (i + 1) % LOAD_STEPS.length)
    }, 2200)
    return () => clearInterval(id)
  }, [createMut.isPending])

  function onFileChange(e) {
    const picked = Array.from(e.target.files || []).slice(0, 3)
    setFiles(picked)
    setLocalError('')
  }

  function removePreviewAt(index) {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  function handleSubmit(e) {
    e.preventDefault()
    setLocalError('')
    if (createMut.isPending || submitLockRef.current) return
    if (!files.length) {
      setLocalError('Please choose at least one image.')
      return
    }
    submitLockRef.current = true
    const fd = new FormData()
    for (const f of files) {
      fd.append('images', f)
    }
    if (notes.trim()) fd.append('notes', notes.trim())
    if (landId) fd.append('landId', landId)
    createMut.mutate(fd)
  }

  const last = createMut.data?.diagnosis

  return (
    <div className="relative space-y-8">
      {createMut.isPending && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/45 p-6 backdrop-blur-sm"
          role="alertdialog"
          aria-busy="true"
          aria-live="polite"
          aria-label="Diagnosis in progress"
        >
          <div className="max-w-sm rounded-2xl border border-white/20 bg-white px-8 py-8 text-center shadow-2xl">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-brand border-t-transparent" />
            <p className="mt-5 text-base font-semibold text-text-primary">{LOAD_STEPS[loadStepIndex]}</p>
            <p className="mt-2 text-sm text-text-secondary">
              This can take 15–45 seconds. Please keep this tab open.
            </p>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Soil / crop diagnosis</h1>
        <p className="mt-1 max-w-2xl text-sm text-text-secondary">
          Upload clear photos (leaf close-ups, wide canopy shots, or soil surface). The AI returns
          suggestions only — not a lab test. See the disclaimer on every result.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-border-light bg-surface p-6 shadow-card"
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              Images (1–3, JPEG/PNG/WebP, max 6 MB each)
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={onFileChange}
              className="w-full text-sm text-text-primary file:mr-3 file:rounded-lg file:border-0 file:bg-text-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
            />
            {previewUrls.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {previewUrls.map((p, i) => (
                  <div key={`${p.name}-${i}`} className="group relative">
                    <img
                      src={p.url}
                      alt={p.name}
                      className="h-24 w-24 rounded-lg border border-border object-cover shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removePreviewAt(i)}
                      className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-white opacity-0 transition group-hover:opacity-100"
                      aria-label={`Remove ${p.name}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              Optional: link to my land record
            </label>
            <select
              value={landId}
              onChange={(e) => setLandId(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-brand/30"
            >
              <option value="">— None —</option>
              {(landsQ.data?.lands || []).map((l) => (
                <option key={l._id} value={l._id}>
                  {(l.title || 'Untitled').slice(0, 48)}
                  {l.cropType ? ` · ${l.cropType}` : ''}
                </option>
              ))}
            </select>
            {landsQ.isLoading && (
              <p className="mt-1 text-xs text-text-secondary">Loading your lands…</p>
            )}
          </div>
        </div>

        <div className="mt-6">
          <label className="mb-1 block text-sm font-medium text-text-primary">
            Notes for the AI (symptoms, weather, irrigation, etc.)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-border px-3 py-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-brand/30"
            placeholder="e.g. Yellow spots appeared after last week’s rain…"
          />
        </div>

        {(localError || createMut.error) && (
          <p className="mt-4 text-sm text-error">{localError || createMut.error?.message}</p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={createMut.isPending}
            className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
          >
            {createMut.isPending ? 'Working…' : 'Run diagnosis'}
          </button>
          <Link
            to="/app"
            className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-text-primary transition hover:bg-surface-secondary"
          >
            Back to dashboard
          </Link>
        </div>
      </form>

      {last && (
        <DiagnosisResultPanel
          title="Latest result"
          diagnosis={last}
          afterDisclaimer={
            <p className="mt-3 text-xs text-text-secondary">
              <Link to={`/app/diagnose/${last._id}`} className="font-semibold text-brand hover:underline">
                Open saved copy
              </Link>
              {' · '}
              <Link to="/app" className="font-semibold text-brand hover:underline">
                Dashboard lists all runs
              </Link>
            </p>
          }
        />
      )}
    </div>
  )
}
