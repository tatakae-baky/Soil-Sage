import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { landsApi, rentalsApi } from '../lib/api'
import { useHasRole } from '../hooks/useHasRole'
import { LandMapPicker } from '../components/LandMapPicker'
import { distanceKm } from '../lib/geo'

const DEFAULT_MAX_KM = 100

/**
 * Rentals hub — loads every public rental listing, then optional text + distance filters;
 * tap a card to request. Outgoing/incoming lists below.
 */
export function RentalsPage() {
  const qc = useQueryClient()
  const isOwner = useHasRole('land_owner')

  /** Free-text filter on title / description / soil / crop / owner name. */
  const [textFilter, setTextFilter] = useState('')
  /** Draft coords for the map before user applies the distance filter. */
  const [draftLat, setDraftLat] = useState('')
  const [draftLng, setDraftLng] = useState('')
  /**
   * When set, the grid only shows lands within `maxKm` of this point (client-side).
   * `null` means “show all” (still subject to text filter).
   */
  const [refPoint, setRefPoint] = useState(null)
  const [maxKm, setMaxKm] = useState(DEFAULT_MAX_KM)
  const [geoHint, setGeoHint] = useState('')
  const [showLocationPanel, setShowLocationPanel] = useState(false)

  const [selectedLand, setSelectedLand] = useState(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [landIdManual, setLandIdManual] = useState('')
  const [message, setMessage] = useState('')
  const [formError, setFormError] = useState('')

  const outgoing = useQuery({
    queryKey: ['rentals', 'outgoing'],
    queryFn: () => rentalsApi.outgoing(),
  })

  const incoming = useQuery({
    queryKey: ['rentals', 'incoming'],
    queryFn: () => rentalsApi.incoming(),
    enabled: isOwner,
  })

  const allQ = useQuery({
    queryKey: ['lands', 'for-rent'],
    queryFn: () => landsApi.forRent(),
  })

  const createMut = useMutation({
    mutationFn: (body) => rentalsApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rentals'] })
      setSelectedLand(null)
      setLandIdManual('')
      setMessage('')
      setFormError('')
    },
    onError: (e) => setFormError(e.message),
  })

  const decideMut = useMutation({
    mutationFn: ({ id, status }) => rentalsApi.decide(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rentals'] }),
  })

  /** Browser geolocation → becomes the reference point for distance filtering. */
  function useMyLocation() {
    setGeoHint('')
    if (!navigator.geolocation) {
      setGeoHint('Geolocation is not supported. Use the map below.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const la = pos.coords.latitude
        const ln = pos.coords.longitude
        setDraftLat(String(la))
        setDraftLng(String(ln))
        setRefPoint({ la, ln })
        setGeoHint('Filtering by your current location.')
        setShowLocationPanel(true)
      },
      () => {
        setGeoHint('Could not read your location. Allow permission or pick a point on the map.')
      },
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 60_000 },
    )
  }

  /** Use map / manual lat-lng as the distance filter centre. */
  function applyLocationFilter() {
    setGeoHint('')
    const la = parseFloat(draftLat)
    const ln = parseFloat(draftLng)
    if (Number.isNaN(la) || Number.isNaN(ln)) {
      setGeoHint('Pick a point on the map or enter valid latitude and longitude.')
      return
    }
    setRefPoint({ la, ln })
    setGeoHint(`Showing lands within ${maxKm} km of the pin.`)
  }

  function clearLocationFilter() {
    setRefPoint(null)
    setGeoHint('')
  }

  const rawLands = allQ.data?.lands || []

  /**
   * Text + optional distance filter; when a reference point exists, sort nearest first.
   */
  const filteredLands = useMemo(() => {
    const q = textFilter.trim().toLowerCase()
    let list = rawLands.map((land) => {
      const la = land.location?.coordinates?.[1]
      const ln = land.location?.coordinates?.[0]
      let dist = null
      if (refPoint && la != null && ln != null) {
        dist = distanceKm(refPoint.la, refPoint.ln, la, ln)
      }
      return { land, dist }
    })

    if (q) {
      list = list.filter(({ land }) => {
        const blob = [
          land.title,
          land.description,
          land.size,
          land.soilCondition,
          land.cropType,
          land.ownerId?.name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return blob.includes(q)
      })
    }

    if (refPoint) {
      list = list.filter(({ dist }) => dist != null && dist <= maxKm)
      list.sort((a, b) => (a.dist ?? 1e9) - (b.dist ?? 1e9))
    }

    return list
  }, [rawLands, textFilter, refPoint, maxKm])

  function openRequestForLand(land) {
    setSelectedLand(land)
    setLandIdManual('')
    setShowAdvanced(false)
    setFormError('')
    setMessage('')
  }

  function handleSendRequest(e) {
    e.preventDefault()
    setFormError('')
    const id = selectedLand?._id || landIdManual.trim()
    if (!id) return setFormError('Choose a land from the list or enter a land ID.')
    createMut.mutate({ landId: id, message })
  }

  const statusBadge = (s) => {
    const map = {
      pending: 'bg-amber-50 text-amber-700',
      approved: 'bg-green-50 text-green-700',
      rejected: 'bg-red-50 text-error',
    }
    return `inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${map[s] || 'bg-zinc-100 text-text-secondary'}`
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Rentals</h1>
        <p className="mt-1 max-w-2xl text-sm text-text-secondary">
          Every plot listed for rent loads here. Narrow results with search or an optional distance
          filter, then send a request with a message. Your outgoing requests appear below.
        </p>
      </div>

      {/* ── Discover listings ── */}
      <section className="rounded-2xl border border-border-light bg-surface p-6 shadow-card">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-lg font-semibold text-text-primary">Available lands for rent</h2>
          {allQ.data?.lands && (
            <p className="text-xs font-medium text-text-secondary">
              {filteredLands.length} shown
              {filteredLands.length !== rawLands.length ? ` of ${rawLands.length}` : ''}
            </p>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <label className="block min-w-[200px] flex-1 text-sm font-medium text-text-primary">
            Search
            <input
              type="search"
              value={textFilter}
              onChange={(e) => setTextFilter(e.target.value)}
              placeholder="Title, soil, crop, owner…"
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/30"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowLocationPanel((v) => !v)}
              className="self-end rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-primary transition hover:bg-surface-secondary"
            >
              {showLocationPanel ? 'Hide location filter' : 'Filter by location'}
            </button>
            {refPoint && (
              <button
                type="button"
                onClick={clearLocationFilter}
                className="self-end rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-primary transition hover:bg-surface-secondary"
              >
                Show all distances
              </button>
            )}
          </div>
        </div>

        {showLocationPanel && (
          <div className="mt-4 rounded-xl border border-border-light bg-surface-secondary/40 p-4">
            <p className="text-sm text-text-secondary">
              Optional: set a reference point to only show listings within a radius, sorted nearest
              first.
            </p>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <label className="text-sm font-medium text-text-primary">
                Within (km)
                <select
                  value={String(maxKm)}
                  onChange={(e) => setMaxKm(Number(e.target.value))}
                  className="mt-1 block rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/30"
                >
                  {[25, 50, 100, 150, 200].map((k) => (
                    <option key={k} value={k}>
                      {k} km
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={useMyLocation}
                className="rounded-lg bg-text-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-brand"
              >
                Use my location
              </button>
              <button
                type="button"
                onClick={applyLocationFilter}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-primary transition hover:bg-surface"
              >
                Apply map pin
              </button>
            </div>
            {geoHint && <p className="mt-2 text-sm text-amber-800">{geoHint}</p>}
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-text-primary">Map pin</p>
              <LandMapPicker
                lat={draftLat}
                lng={draftLng}
                onChange={(la, ln) => {
                  setDraftLat(la)
                  setDraftLng(ln)
                }}
              />
              <p className="mt-2 text-xs text-text-secondary">
                Drag the pin or click the map, then tap &quot;Apply map pin&quot;.
              </p>
            </div>
          </div>
        )}

        {allQ.isLoading && <p className="mt-4 text-sm text-text-secondary">Loading listings…</p>}
        {allQ.error && <ErrBox msg={allQ.error.message} />}

        {!allQ.isLoading && !allQ.error && rawLands.length === 0 && (
          <p className="mt-4 text-sm text-text-secondary">No rental listings yet.</p>
        )}

        {!allQ.isLoading && rawLands.length > 0 && filteredLands.length === 0 && (
          <p className="mt-4 text-sm text-text-secondary">
            No lands match your filters. Clear search or widen the distance.
          </p>
        )}

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredLands.map(({ land, dist }) => (
            <article
              key={land._id}
              className="flex flex-col rounded-xl border border-border-light bg-surface-secondary/50 p-4 shadow-card"
            >
              <h3 className="text-base font-semibold text-text-primary">
                {land.title?.trim() || 'Untitled listing'}
              </h3>
              {dist != null && (
                <span className="mt-1 inline-flex w-fit rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-text-primary ring-1 ring-border">
                  ~{dist.toFixed(1)} km away
                </span>
              )}
              <dl className="mt-2 space-y-1 text-xs text-text-secondary">
                {land.size && (
                  <div>
                    <dt className="inline font-medium text-text-primary">Size: </dt>
                    <dd className="inline">{land.size}</dd>
                  </div>
                )}
                {land.soilCondition && (
                  <div>
                    <dt className="inline font-medium text-text-primary">Soil: </dt>
                    <dd className="inline">{land.soilCondition}</dd>
                  </div>
                )}
                <div>
                  <dt className="inline font-medium text-text-primary">Owner: </dt>
                  <dd className="inline">{land.ownerId?.name || '—'}</dd>
                </div>
              </dl>
              <button
                type="button"
                onClick={() => openRequestForLand(land)}
                className="mt-4 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
              >
                Request rental
              </button>
            </article>
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            setShowAdvanced((v) => !v)
            setFormError('')
          }}
          className="mt-6 text-sm font-medium text-brand underline"
        >
          {showAdvanced ? 'Hide' : 'Have a land ID?'} advanced
        </button>
        {showAdvanced && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              setSelectedLand(null)
              if (!landIdManual.trim()) {
                setFormError('Enter a land ID.')
                return
              }
              setFormError('')
            }}
            className="mt-3 rounded-xl border border-dashed border-border bg-surface-secondary/30 p-4"
          >
            <label className="mb-1 block text-sm font-medium text-text-primary">Land ID</label>
            <input
              value={landIdManual}
              onChange={(e) => setLandIdManual(e.target.value)}
              placeholder="Paste MongoDB ObjectId"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/30"
            />
            <button
              type="submit"
              className="mt-3 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface"
            >
              Use this ID for request
            </button>
          </form>
        )}
      </section>

      {/* ── Request panel (slide-over style card) ── */}
      {(selectedLand || (showAdvanced && landIdManual.trim())) && (
        <form
          onSubmit={handleSendRequest}
          className="rounded-2xl border-2 border-brand/30 bg-white p-6 shadow-hover"
        >
          <h2 className="text-lg font-semibold text-text-primary">Send rental request</h2>
          {selectedLand && (
            <p className="mt-2 text-sm text-text-secondary">
              <span className="font-medium text-text-primary">{selectedLand.title || 'Plot'}</span>
              {' · '}
              <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs">{selectedLand._id}</code>
            </p>
          )}
          {!selectedLand && landIdManual.trim() && (
            <p className="mt-2 text-sm text-text-secondary">
              Land ID: <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs">{landIdManual.trim()}</code>
            </p>
          )}
          <label className="mt-4 block text-sm font-medium text-text-primary">Message (optional)</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/30"
            placeholder="Introduce yourself and how you plan to use the land…"
          />
          {formError && <p className="mt-2 text-sm text-error">{formError}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={createMut.isPending}
              className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
            >
              {createMut.isPending ? 'Sending…' : 'Send request'}
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedLand(null)
                setLandIdManual('')
                setFormError('')
              }}
              className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-text-primary hover:bg-surface-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ── Outgoing ── */}
      <section>
        <h2 className="text-lg font-semibold text-text-primary">My outgoing requests</h2>
        {outgoing.isLoading && <p className="mt-2 text-sm text-text-secondary">Loading…</p>}
        {outgoing.error && <ErrBox msg={outgoing.error.message} />}
        <div className="mt-3 space-y-3">
          {(outgoing.data?.requests || []).map((r) => (
            <div key={r._id} className="rounded-xl border border-border-light bg-surface p-4 shadow-card">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-text-primary">
                  Land: {r.landId?.title || r.landId?._id || '—'}
                </p>
                <span className={statusBadge(r.status)}>{r.status}</span>
              </div>
              {r.message && <p className="mt-1 text-xs text-text-secondary">{r.message}</p>}
              {r.agreementNote && <p className="mt-1 text-xs text-text-secondary">Agreement: {r.agreementNote}</p>}
              <p className="mt-1 text-xs text-text-secondary">Owner: {r.ownerId?.name || '—'}</p>
            </div>
          ))}
          {(outgoing.data?.requests || []).length === 0 && !outgoing.isLoading && (
            <p className="text-sm text-text-secondary">No outgoing requests yet.</p>
          )}
        </div>
      </section>

      {isOwner && (
        <section>
          <h2 className="text-lg font-semibold text-text-primary">Incoming requests (as land owner)</h2>
          {incoming.isLoading && <p className="mt-2 text-sm text-text-secondary">Loading…</p>}
          {incoming.error && <ErrBox msg={incoming.error.message} />}
          <div className="mt-3 space-y-3">
            {(incoming.data?.requests || []).map((r) => (
              <div key={r._id} className="rounded-xl border border-border-light bg-surface p-4 shadow-card">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-text-primary">From: {r.requesterId?.name || '—'}</p>
                  <span className={statusBadge(r.status)}>{r.status}</span>
                </div>
                <p className="mt-1 text-xs text-text-secondary">Land: {r.landId?.title || r.landId?._id || '—'}</p>
                {r.message && <p className="mt-1 text-xs text-text-secondary">{r.message}</p>}
                {r.status === 'pending' && (
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => decideMut.mutate({ id: r._id, status: 'approved' })}
                      disabled={decideMut.isPending}
                      className="rounded-lg bg-text-primary px-4 py-2 text-xs font-medium text-white hover:bg-brand disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => decideMut.mutate({ id: r._id, status: 'rejected' })}
                      disabled={decideMut.isPending}
                      className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-error hover:bg-red-50 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
            {(incoming.data?.requests || []).length === 0 && !incoming.isLoading && (
              <p className="text-sm text-text-secondary">No incoming requests.</p>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

function ErrBox({ msg }) {
  return (
    <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-error">
      {msg}
    </div>
  )
}
