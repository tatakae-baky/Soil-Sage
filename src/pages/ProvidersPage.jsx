import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { providersApi } from '../lib/api'

const CATEGORY_LABELS = {
  seeds: 'Seeds',
  fertilizer: 'Fertilizer',
  pesticide: 'Pesticide',
  tools: 'Tools',
  extension: 'Extension',
  general: 'General',
}

const CATEGORY_COLORS = {
  seeds: 'bg-green-100 text-green-800',
  fertilizer: 'bg-yellow-100 text-yellow-800',
  pesticide: 'bg-red-100 text-red-800',
  tools: 'bg-blue-100 text-blue-800',
  extension: 'bg-purple-100 text-purple-800',
  general: 'bg-gray-100 text-gray-700',
}

export function ProvidersPage() {
  const [nameFilter, setNameFilter] = useState('')
  const [selectedCats, setSelectedCats] = useState(() => new Set())

  const providersQ = useQuery({
    queryKey: ['providers', 'list'],
    queryFn: () => providersApi.list(),
  })

  function toggleCat(key) {
    setSelectedCats((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const filtered = useMemo(() => {
    const all = providersQ.data?.providers || []
    const name = nameFilter.trim().toLowerCase()
    return all.filter((p) => {
      const matchesName = !name || p.name.toLowerCase().includes(name)
      const matchesCat =
        selectedCats.size === 0 || (p.categories || []).some((c) => selectedCats.has(c))
      return matchesName && matchesCat
    })
  }, [providersQ.data, nameFilter, selectedCats])

  const total = providersQ.data?.providers?.length ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold tracking-[-0.44px] text-[#222222]">
          Solution providers
        </h1>
        <p className="mt-1 max-w-xl text-[14px] text-[#6a6a6a]">
          Agronomic suppliers and extension help points. Search by name or filter by category.
        </p>
      </div>

      {/* ── Filters ── */}
      <div className="rounded-[16px] border border-border-light bg-white p-5 shadow-card space-y-4">
        <input
          type="search"
          placeholder="Search by name…"
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
          className="w-full rounded-sm border border-[#dddddd] px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
        <div className="flex flex-wrap gap-2">
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => toggleCat(key)}
              className={`rounded-full px-3 py-1 text-[12px] font-medium transition ${
                selectedCats.has(key)
                  ? 'bg-[#222222] text-white'
                  : 'border border-[#dddddd] bg-[#f7f7f7] text-[#222222] hover:bg-[#efefef]'
              }`}
            >
              {label}
            </button>
          ))}
          {selectedCats.size > 0 && (
            <button
              type="button"
              onClick={() => setSelectedCats(new Set())}
              className="rounded-full px-3 py-1 text-[12px] font-medium text-[#6a6a6a] underline hover:text-[#222222]"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Status line ── */}
      {providersQ.isLoading && (
        <p className="text-[14px] text-[#6a6a6a]">Loading providers…</p>
      )}
      {providersQ.isError && (
        <p className="text-[14px] text-error">{providersQ.error.message}</p>
      )}
      {!providersQ.isLoading && !providersQ.isError && (
        <p className="text-[13px] text-[#6a6a6a]">
          {filtered.length === total
            ? `${total} provider${total !== 1 ? 's' : ''}`
            : `${filtered.length} of ${total} provider${total !== 1 ? 's' : ''} match`}
        </p>
      )}

      {/* ── Provider cards ── */}
      {!providersQ.isLoading && filtered.length === 0 && (
        <p className="text-[14px] text-[#6a6a6a]">No providers match your filters.</p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((p) => (
          <article
            key={p._id}
            className="rounded-[20px] border border-border-light bg-white p-5 shadow-card"
          >
            <h3 className="text-[16px] font-semibold text-[#222222]">{p.name}</h3>

            {p.description ? (
              <p className="mt-2 text-[13px] text-[#6a6a6a]">{p.description}</p>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-1.5">
              {(p.categories || []).map((c) => (
                <span
                  key={c}
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${CATEGORY_COLORS[c] || 'bg-gray-100 text-gray-700'}`}
                >
                  {CATEGORY_LABELS[c] || c}
                </span>
              ))}
            </div>

            <div className="mt-3 space-y-1">
              {p.phone ? (
                <p className="text-[13px] text-[#222222]">
                  <span className="font-medium">Phone: </span>
                  <a href={`tel:${p.phone}`} className="hover:underline">
                    {p.phone}
                  </a>
                </p>
              ) : null}
              {p.website ? (
                <a
                  href={p.website}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block text-[13px] font-medium text-brand underline"
                >
                  Visit website
                </a>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

