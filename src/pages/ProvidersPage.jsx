import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { LandMapPicker } from '../components/LandMapPicker'
import { providersApi } from '../lib/api'

const DEFAULT_CENTER = { lat: '23.8103', lng: '90.4125' }

const CATEGORY_LABELS = {
  seeds: 'Seeds',
  fertilizer: 'Fertilizer',
  pesticide: 'Pesticide',
  tools: 'Tools',
  extension: 'Extension',
  general: 'General',
}

/**
 * Nearby agronomic stores / extension points (Module 2).
 * Search center from map; optional category filters; respects `?lat=&lng=` from diagnosis deep links.
 */
export function ProvidersPage() {
  const [searchParams] = useSearchParams()
  const qpLat = searchParams.get('lat')
  const qpLng = searchParams.get('lng')

  const [draft, setDraft] = useState({
    lat: qpLat || DEFAULT_CENTER.lat,
    lng: qpLng || DEFAULT_CENTER.lng,
    maxKm: '50',
  })
  const [selectedCats, setSelectedCats] = useState(() => new Set())
  const [search, setSearch] = useState(null)

  /** Sync URL query once when opening from a diagnosis with linked land coordinates */
  useEffect(() => {
    if (qpLat && qpLng) {
      setDraft((d) => ({ ...d, lat: qpLat, lng: qpLng }))
      setSearch({ lat: Number(qpLat), lng: Number(qpLng), maxKm: 50, categories: '' })
    }
  }, [qpLat, qpLng])

  const categoriesParam = useMemo(() => {
    if (selectedCats.size === 0) return ''
    return [...selectedCats].join(',')
  }, [selectedCats])

  const nearbyQ = useQuery({
    queryKey: ['providers', 'nearby', search?.lat, search?.lng, search?.maxKm, search?.categories],
    queryFn: () =>
      providersApi.nearby({
        lat: search.lat,
        lng: search.lng,
        maxKm: search.maxKm,
        ...(search.categories ? { categories: search.categories } : {}),
      }),
    enabled: Boolean(search),
  })

  function runSearch() {
    const lat = Number(draft.lat)
    const lng = Number(draft.lng)
    const maxKm = Math.min(Number(draft.maxKm) || 50, 200)
    if (Number.isNaN(lat) || Number.isNaN(lng)) return
    setSearch({
      lat,
      lng,
      maxKm,
      categories: categoriesParam,
    })
  }

  function toggleCat(key) {
    setSelectedCats((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const providers = nearbyQ.data?.providers || []

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.44px] text-[#222222]">
            Nearby solution providers
          </h1>
          <p className="mt-1 max-w-xl text-[14px] text-[#6a6a6a]">
            Agronomic suppliers and extension-style help points (admin-seeded). Set the map
            center and search radius, then filter by category.
          </p>
        </div>
        <Link
          to="/app/diagnose"
          className="rounded-[8px] border border-[#dddddd] px-4 py-2 text-[14px] font-medium text-[#222222] transition hover:bg-[#f2f2f2]"
        >
          New diagnosis
        </Link>
      </div>

      <section className="rounded-[20px] border border-[#ebebeb] bg-white p-6 shadow-card">
        <h2 className="text-[16px] font-semibold text-[#222222]">Search center</h2>
        <p className="mt-1 text-[13px] text-[#6a6a6a]">
          Click the map to move the pin (same as Lands). Opens from a saved diagnosis with a
          linked land when coordinates exist.
        </p>
        <div className="mt-4 h-[280px] overflow-hidden rounded-[14px] border border-[#ebebeb]">
          <LandMapPicker
            lat={draft.lat}
            lng={draft.lng}
            onChange={(la, ln) => setDraft((d) => ({ ...d, lat: la, lng: ln }))}
          />
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-[12px] font-medium text-[#6a6a6a]">Radius (km)</label>
            <input
              value={draft.maxKm}
              onChange={(e) => setDraft((d) => ({ ...d, maxKm: e.target.value }))}
              className="w-24 rounded-[8px] border border-[#dddddd] px-3 py-2 text-[14px]"
            />
          </div>
          <button
            type="button"
            onClick={runSearch}
            className="rounded-[8px] bg-[#ff385c] px-5 py-2.5 text-[14px] font-medium text-white transition hover:bg-[#e00b41]"
          >
            Search nearby
          </button>
        </div>

        <div className="mt-6">
          <p className="text-[13px] font-medium text-[#222222]">Categories (optional)</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => toggleCat(key)}
                className={`rounded-full px-3 py-1 text-[12px] font-medium transition ${
                  selectedCats.has(key)
                    ? 'bg-[#222222] text-white'
                    : 'border border-[#dddddd] bg-[#f7f7f7] text-[#222222]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {nearbyQ.isLoading && <p className="text-[14px] text-[#6a6a6a]">Loading providers…</p>}
      {nearbyQ.isError && (
        <p className="text-[14px] text-[#c13515]">{nearbyQ.error.message}</p>
      )}

      {search && !nearbyQ.isLoading && providers.length === 0 && (
        <p className="text-[14px] text-[#6a6a6a]">
          No providers in range. Ask an admin to add locations, or run the seed script in dev.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {providers.map((p) => (
          <article
            key={p._id}
            className="rounded-[20px] border border-[#ebebeb] bg-white p-5 shadow-card"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-[16px] font-semibold text-[#222222]">{p.name}</h3>
              <span className="shrink-0 rounded-[14px] bg-[#f2f2f2] px-2 py-0.5 text-[11px] font-semibold text-[#222222]">
                ~{p.distanceKm} km
              </span>
            </div>
            {p.description ? (
              <p className="mt-2 text-[13px] text-[#6a6a6a]">{p.description}</p>
            ) : null}
            <p className="mt-2 text-[12px] text-[#6a6a6a]">
              {(p.categories || []).map((c) => CATEGORY_LABELS[c] || c).join(' · ')}
            </p>
            {p.phone ? (
              <p className="mt-2 text-[13px] text-[#222222]">
                <span className="font-medium">Phone: </span>
                {p.phone}
              </p>
            ) : null}
            {p.website ? (
              <a
                href={p.website}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block text-[13px] font-medium text-[#ff385c] underline"
              >
                Website
              </a>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  )
}
