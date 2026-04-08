import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryApi } from '../lib/api'

const CATEGORIES = ['crop', 'seed', 'fertilizer', 'pesticide', 'tool']
const EMPTY_ITEM = { category: 'crop', name: '', quantity: '', unit: '', notes: '' }

/**
 * Full inventory — add items, log usage, view history, delete.
 */
export function InventoryPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_ITEM })
  const [editingId, setEditingId] = useState(null)
  const [usageTarget, setUsageTarget] = useState(null)
  const [usageDelta, setUsageDelta] = useState('')
  const [usageReason, setUsageReason] = useState('')
  const [historyTarget, setHistoryTarget] = useState(null)
  const [formError, setFormError] = useState('')

  const itemsQ = useQuery({
    queryKey: ['inventory', 'items'],
    queryFn: () => inventoryApi.items(),
  })

  const historyQ = useQuery({
    queryKey: ['inventory', 'usage', historyTarget],
    queryFn: () => inventoryApi.usageHistory(historyTarget),
    enabled: Boolean(historyTarget),
  })

  const createMut = useMutation({
    mutationFn: (b) => inventoryApi.create(b),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] })
      resetForm()
    },
    onError: (e) => setFormError(e.message),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => inventoryApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] })
      resetForm()
    },
    onError: (e) => setFormError(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: (id) => inventoryApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
  })

  const usageMut = useMutation({
    mutationFn: ({ id, delta, reason }) =>
      inventoryApi.logUsage(id, { delta, reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] })
      setUsageTarget(null)
      setUsageDelta('')
      setUsageReason('')
    },
  })

  function resetForm() {
    setShowForm(false)
    setEditingId(null)
    setForm({ ...EMPTY_ITEM })
    setFormError('')
  }

  function startEdit(item) {
    setEditingId(item._id)
    setForm({
      category: item.category,
      name: item.name,
      quantity: String(item.quantity),
      unit: item.unit || '',
      notes: item.notes || '',
    })
    setShowForm(true)
    setFormError('')
  }

  function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    const payload = {
      category: form.category,
      name: form.name,
      quantity: parseFloat(form.quantity) || 0,
      unit: form.unit,
      notes: form.notes,
    }
    if (editingId) {
      updateMut.mutate({ id: editingId, data: payload })
    } else {
      createMut.mutate(payload)
    }
  }

  const items = itemsQ.data?.items || []
  const history = historyQ.data?.history || []

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-[22px] font-semibold tracking-[-0.44px] text-[#222222]">
          Inventory
        </h1>
        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setForm({ ...EMPTY_ITEM }) }}
            className="rounded-[8px] bg-[#222222] px-5 py-2.5 text-[14px] font-medium text-white transition hover:bg-[#ff385c]"
          >
            + Add item
          </button>
        )}
      </div>

      {/* ── Create / Edit form ── */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-[20px] border border-[#ebebeb] bg-white p-6 shadow-card">
          <h2 className="text-[16px] font-semibold text-[#222222]">
            {editingId ? 'Edit item' : 'Add inventory item'}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[14px] font-medium text-[#222222]">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                className="w-full rounded-[8px] border border-[#dddddd] px-3 py-2.5 text-[14px] text-[#222222] outline-none focus:border-[#222222] focus:ring-2 focus:ring-[#222222]"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <Inp label="Name" required value={form.name} onChange={(v) => setForm((p) => ({ ...p, name: v }))} />
            <Inp label="Quantity" type="number" min="0" step="any" required value={form.quantity} onChange={(v) => setForm((p) => ({ ...p, quantity: v }))} />
            <Inp label="Unit (e.g. kg, pcs)" value={form.unit} onChange={(v) => setForm((p) => ({ ...p, unit: v }))} />
          </div>
          <div className="mt-4">
            <Inp label="Notes" value={form.notes} onChange={(v) => setForm((p) => ({ ...p, notes: v }))} />
          </div>
          {formError && <p className="mt-3 text-[14px] text-[#c13515]">{formError}</p>}
          <div className="mt-5 flex gap-3">
            <button type="submit" disabled={createMut.isPending || updateMut.isPending} className="rounded-[8px] bg-[#ff385c] px-5 py-2.5 text-[14px] font-medium text-white transition hover:bg-[#e00b41] disabled:opacity-50">
              {editingId ? 'Save' : 'Add'}
            </button>
            <button type="button" onClick={resetForm} className="rounded-[8px] border border-[#dddddd] px-5 py-2.5 text-[14px] font-medium text-[#222222] transition hover:bg-[#f2f2f2]">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ── Usage log popup ── */}
      {usageTarget && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const d = parseFloat(usageDelta)
            if (isNaN(d) || d === 0) return
            usageMut.mutate({ id: usageTarget, delta: d, reason: usageReason })
          }}
          className="rounded-[20px] border border-[#ebebeb] bg-white p-6 shadow-card"
        >
          <h2 className="text-[16px] font-semibold text-[#222222]">
            Log usage / restock
          </h2>
          <p className="mt-1 text-[13px] text-[#6a6a6a]">
            Use negative for consumption, positive for restock.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Inp label="Delta" type="number" step="any" required value={usageDelta} onChange={setUsageDelta} />
            <Inp label="Reason" value={usageReason} onChange={setUsageReason} />
          </div>
          {usageMut.error && <p className="mt-3 text-[14px] text-[#c13515]">{usageMut.error.message}</p>}
          <div className="mt-5 flex gap-3">
            <button type="submit" disabled={usageMut.isPending} className="rounded-[8px] bg-[#ff385c] px-5 py-2.5 text-[14px] font-medium text-white transition hover:bg-[#e00b41] disabled:opacity-50">
              Log
            </button>
            <button type="button" onClick={() => setUsageTarget(null)} className="rounded-[8px] border border-[#dddddd] px-5 py-2.5 text-[14px] font-medium text-[#222222] transition hover:bg-[#f2f2f2]">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ── Items grid ── */}
      {itemsQ.isLoading && <p className="text-[14px] text-[#6a6a6a]">Loading…</p>}
      {itemsQ.error && <ErrBox msg={itemsQ.error.message} />}
      {items.length === 0 && !itemsQ.isLoading ? (
        <p className="text-[14px] text-[#6a6a6a]">No inventory items yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const catColors = {
              crop: 'bg-green-50 text-green-700',
              seed: 'bg-amber-50 text-amber-700',
              fertilizer: 'bg-blue-50 text-blue-700',
              pesticide: 'bg-red-50 text-[#c13515]',
              tool: 'bg-purple-50 text-purple-700',
            }
            return (
              <div key={item._id} className="rounded-[20px] border border-[#ebebeb] bg-white p-5 shadow-card">
                <div className="flex items-start justify-between">
                  <h3 className="text-[16px] font-semibold text-[#222222]">{item.name}</h3>
                  <span className={`rounded-[14px] px-2.5 py-0.5 text-[12px] font-semibold ${catColors[item.category] || 'bg-[#f2f2f2] text-[#6a6a6a]'}`}>
                    {item.category}
                  </span>
                </div>
                <p className="mt-2 text-[14px] font-medium text-[#222222]">
                  {item.quantity} {item.unit}
                </p>
                {item.notes && (
                  <p className="mt-1 text-[13px] text-[#6a6a6a]">{item.notes}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <SmBtn onClick={() => startEdit(item)}>Edit</SmBtn>
                  <SmBtn onClick={() => { setUsageTarget(item._id); setUsageDelta(''); setUsageReason('') }}>Log usage</SmBtn>
                  <SmBtn onClick={() => setHistoryTarget((p) => p === item._id ? null : item._id)}>History</SmBtn>
                  <SmBtn danger onClick={() => { if (confirm('Delete this item?')) deleteMut.mutate(item._id) }}>Delete</SmBtn>
                </div>
                {historyTarget === item._id && (
                  <div className="mt-3 max-h-40 space-y-1 overflow-auto border-t border-[#ebebeb] pt-2">
                    {historyQ.isLoading && <p className="text-[12px] text-[#6a6a6a]">Loading…</p>}
                    {history.length === 0 && !historyQ.isLoading && <p className="text-[12px] text-[#6a6a6a]">No history.</p>}
                    {history.map((h) => (
                      <p key={h._id} className="text-[12px] text-[#222222]">
                        <span className={h.delta >= 0 ? 'text-green-700' : 'text-[#c13515]'}>
                          {h.delta >= 0 ? '+' : ''}{h.delta}
                        </span>
                        {' → '}{h.quantityAfter} {item.unit}
                        {h.reason && ` (${h.reason})`}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Shared helpers ── */
function Inp({ label, onChange, ...props }) {
  return (
    <div>
      {label && <label className="mb-1 block text-[14px] font-medium text-[#222222]">{label}</label>}
      <input
        {...props}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-[8px] border border-[#dddddd] px-3 py-2.5 text-[14px] text-[#222222] outline-none transition focus:border-[#222222] focus:ring-2 focus:ring-[#222222]"
      />
    </div>
  )
}

function SmBtn({ children, danger, ...props }) {
  return (
    <button
      className={`rounded-[8px] border border-[#dddddd] px-3 py-1.5 text-[13px] font-medium transition hover:bg-[#f2f2f2] ${danger ? 'text-[#c13515] hover:bg-red-50' : 'text-[#222222]'}`}
      {...props}
    >
      {children}
    </button>
  )
}

function ErrBox({ msg }) {
  return <div className="rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-[#c13515]">{msg}</div>
}
