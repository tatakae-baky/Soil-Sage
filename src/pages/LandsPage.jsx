import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { landsApi } from '../lib/api'
import { useHasRole } from '../hooks/useHasRole'
import { LandMapPicker } from '../components/LandMapPicker'
import { distanceKm } from '../lib/geo'

const EMPTY = {
  title: '',
  description: '',
  size: '',
  soilCondition: '',
  cropType: '',
  lat: '',
  lng: '',
  availableForRent: false,
}

/**
 * Land management — Leaflet + OpenStreetMap pin; nearby rental listings and owners in radius.
 */
export function LandsPage() {
  const qc = useQueryClient()
  const isFarmer = useHasRole('farmer')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...EMPTY })
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')

  /* ── Nearby: map picks center; user sets radius and clicks Search ── */
  const [nearbyDraft, setNearbyDraft] = useState({ lat: '', lng: '', maxKm: '50' })
  const [nearbySearch, setNearbySearch] = useState(null)

  const nearbyQ = useQuery({
    queryKey: ['lands', 'nearby', nearbySearch?.lat, nearbySearch?.lng, nearbySearch?.maxKm],
    queryFn: () =>
      landsApi.nearby({
        lat: nearbySearch.lat,
        lng: nearbySearch.lng,
        maxKm: nearbySearch.maxKm,
      }),
    enabled: Boolean(nearbySearch),
  })

  const nearbyOwnersQ = useQuery({
    queryKey: [
      'lands',
      'nearbyOwners',
      nearbySearch?.lat,
      nearbySearch?.lng,
      nearbySearch?.maxKm,
    ],
    queryFn: () =>
      landsApi.nearbyOwners({
        lat: nearbySearch.lat,
        lng: nearbySearch.lng,
        maxKm: nearbySearch.maxKm,
      }),
    enabled: Boolean(nearbySearch),
  })

  const myLandsQ = useQuery({
    queryKey: ['lands', 'mine'],
    queryFn: () => landsApi.mine(),
  })

  const createMut = useMutation({
    mutationFn: (data) => landsApi.create(data),
    /**
     * API returns the new document so we can show Land ID immediately; renters need this on Rentals.
     */
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['lands'] })
      const land = res?.land
      if (land?._id) {
        setEditingId(land._id)
        setForm({
          title: land.title || '',
          description: land.description || '',
          size: land.size || '',
          soilCondition: land.soilCondition || '',
          cropType: land.cropType || '',
          lat: land.location?.coordinates?.[1]?.toString() || '',
          lng: land.location?.coordinates?.[0]?.toString() || '',
          availableForRent: land.availableForRent || false,
        })
        setShowForm(true)
      } else {
        setShowForm(false)
        setEditingId(null)
        setForm({ ...EMPTY })
      }
      setError('')
    },
    onError: (e) => setError(e.message),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => landsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lands'] })
      setEditingId(null)
      setForm({ ...EMPTY })
      setError('')
    },
    onError: (e) => setError(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: (id) => landsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lands'] }),
  })

  function set(field, value) {
    setForm((p) => ({ ...p, [field]: value }))
  }

  function setLocation(lat, lng) {
    setForm((p) => ({ ...p, lat, lng }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const la = parseFloat(form.lat)
    const ln = parseFloat(form.lng)
    if (Number.isNaN(la) || Number.isNaN(ln)) {
      setError('Please pick a location on the map (or enter latitude and longitude).')
      return
    }
    const payload = {
      title: form.title,
      description: form.description,
      size: form.size,
      soilCondition: form.soilCondition,
      cropType: form.cropType,
      coordinates: [ln, la],
      availableForRent: form.availableForRent,
    }
    if (editingId) {
      updateMut.mutate({ id: editingId, data: payload })
    } else {
      createMut.mutate(payload)
    }
  }

  function startEdit(land) {
    setEditingId(land._id)
    setForm({
      title: land.title || '',
      description: land.description || '',
      size: land.size || '',
      soilCondition: land.soilCondition || '',
      cropType: land.cropType || '',
      lat: land.location?.coordinates?.[1]?.toString() || '',
      lng: land.location?.coordinates?.[0]?.toString() || '',
      availableForRent: land.availableForRent || false,
    })
    setShowForm(true)
    setError('')
  }

  function cancelForm() {
    setShowForm(false)
    setEditingId(null)
    setForm({ ...EMPTY })
    setError('')
  }

  function runNearbySearch() {
    const la = parseFloat(nearbyDraft.lat)
    const ln = parseFloat(nearbyDraft.lng)
    const mk = Math.min(200, Math.max(1, parseFloat(nearbyDraft.maxKm) || 50))
    if (Number.isNaN(la) || Number.isNaN(ln)) {
      return
    }
    setNearbySearch({ lat: String(la), lng: String(ln), maxKm: String(mk) })
  }

  function setNearbyLocation(lat, lng) {
    setNearbyDraft((p) => ({ ...p, lat, lng }))
  }

  const lands = myLandsQ.data?.lands || []
  const nearby = nearbyQ.data?.lands || []

  const searchCenter = useMemo(() => {
    if (!nearbySearch) return null
    const la = parseFloat(nearbySearch.lat)
    const ln = parseFloat(nearbySearch.lng)
    if (Number.isNaN(la) || Number.isNaN(ln)) return null
    return { la, ln }
  }, [nearbySearch])

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-[22px] font-semibold tracking-[-0.44px] text-[#222222]">
          My lands
        </h1>
        {isFarmer && !showForm && (
          <button
            type="button"
            onClick={() => {
              setShowForm(true)
              setEditingId(null)
              setForm({ ...EMPTY })
            }}
            className="rounded-[8px] bg-[#222222] px-5 py-2.5 text-[14px] font-medium text-white transition hover:bg-[#3d7a52]"
          >
            + Add land
          </button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-[20px] border border-[#ebebeb] bg-white p-6 shadow-card"
        >
          <h2 className="text-[16px] font-semibold text-[#222222]">
            {editingId ? 'Edit land' : 'Register new land'}
          </h2>
          {!editingId && (
            <p className="mt-2 text-[13px] text-[#6a6a6a]">
              A Land ID is created when you save. Copy it from here or from your land card to paste on
              the Rentals page when requesting or sharing a plot.
            </p>
          )}
          {editingId && (
            <div className="mt-4 rounded-[8px] border border-[#ebebeb] bg-[#fafafa] px-4 py-3">
              <p className="text-[14px] font-medium text-[#222222]">Land ID</p>
              <p className="mt-1 text-[12px] text-[#6a6a6a]">
                Use this value in <strong className="font-medium text-[#222222]">Rentals → Request land rental</strong>.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <code className="max-w-full break-all rounded bg-white px-2 py-1.5 text-[12px] text-[#222222]">
                  {editingId}
                </code>
                <button
                  type="button"
                  onClick={() => copyText(editingId)}
                  className="rounded-[8px] border border-[#dddddd] bg-white px-3 py-1.5 text-[12px] font-medium text-[#222222] transition hover:bg-[#f2f2f2]"
                >
                  Copy ID
                </button>
              </div>
            </div>
          )}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input label="Title" value={form.title} onChange={(v) => set('title', v)} />
            <Input label="Size (e.g. 5 acres, 2 hectares)" value={form.size} onChange={(v) => set('size', v)} />
            <Input label="Soil condition" value={form.soilCondition} onChange={(v) => set('soilCondition', v)} />
            <Input label="Crop type" value={form.cropType} onChange={(v) => set('cropType', v)} />
          </div>

          <div className="mt-5">
            <p className="mb-2 text-[14px] font-medium text-[#222222]">Land location</p>
            <LandMapPicker
              lat={form.lat}
              lng={form.lng}
              onChange={setLocation}
              disabled={createMut.isPending || updateMut.isPending}
            />
            <div className="mt-2 flex flex-wrap gap-4 text-[13px] text-[#6a6a6a]">
              <span>
                Latitude:{' '}
                <strong className="text-[#222222]">{form.lat || '—'}</strong>
              </span>
              <span>
                Longitude:{' '}
                <strong className="text-[#222222]">{form.lng || '—'}</strong>
              </span>
            </div>
          </div>

          <div className="mt-4">
            <Input label="Description" value={form.description} onChange={(v) => set('description', v)} multiline />
          </div>
          <label className="mt-4 flex items-center gap-2 text-[14px] text-[#222222]">
            <input
              type="checkbox"
              checked={form.availableForRent}
              onChange={(e) => set('availableForRent', e.target.checked)}
              className="accent-[#3d7a52]"
            />
            Available for rent (requires approved land owner account)
          </label>
          {error && <p className="mt-3 text-[14px] text-[#c13515]">{error}</p>}
          <div className="mt-5 flex gap-3">
            <button
              type="submit"
              disabled={createMut.isPending || updateMut.isPending}
              className="rounded-[8px] bg-[#3d7a52] px-5 py-2.5 text-[14px] font-medium text-white transition hover:bg-[#2a5c3b] disabled:opacity-50"
            >
              {editingId ? 'Save changes' : 'Create land'}
            </button>
            <button
              type="button"
              onClick={cancelForm}
              className="rounded-[8px] border border-[#dddddd] px-5 py-2.5 text-[14px] font-medium text-[#222222] transition hover:bg-[#f2f2f2]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {myLandsQ.isLoading && <p className="text-[14px] text-[#6a6a6a]">Loading…</p>}
      {myLandsQ.error && <ErrorBox msg={myLandsQ.error.message} />}

      {lands.length === 0 && !myLandsQ.isLoading ? (
        <p className="text-[14px] text-[#6a6a6a]">No lands registered yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lands.map((land) => (
            <div key={land._id} className="rounded-[20px] border border-[#ebebeb] bg-white p-5 shadow-card">
              <h3 className="text-[16px] font-semibold text-[#222222]">
                {land.title || 'Untitled plot'}
              </h3>
              <p className="mt-1 text-[13px] text-[#6a6a6a]">
                {land.size && `${land.size} · `}
                {land.soilCondition && `Soil: ${land.soilCondition} · `}
                {land.cropType && `Crop: ${land.cropType}`}
              </p>
              <p className="mt-1 text-[13px] text-[#6a6a6a]">
                Coords: {land.location?.coordinates?.[1]?.toFixed(4)},{' '}
                {land.location?.coordinates?.[0]?.toFixed(4)}
              </p>
              <span
                className={`mt-2 inline-block rounded-[14px] px-2.5 py-0.5 text-[12px] font-semibold ${
                  land.availableForRent
                    ? 'bg-green-50 text-green-700'
                    : 'bg-[#f2f2f2] text-[#6a6a6a]'
                }`}
              >
                {land.availableForRent ? 'For rent' : 'Not listed'}
              </span>
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#ebebeb] pt-3">
                <span className="text-[12px] text-[#6a6a6a]">
                  Land ID:{' '}
                  <code className="rounded bg-[#fafafa] px-1.5 py-0.5 text-[11px] text-[#222222]">
                    {land._id}
                  </code>
                </span>
                <button
                  type="button"
                  onClick={() => copyText(land._id)}
                  className="rounded-[8px] border border-[#dddddd] px-3 py-1 text-[12px] font-medium text-[#222222] transition hover:bg-[#f2f2f2]"
                >
                  Copy
                </button>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(land)}
                  className="rounded-[8px] border border-[#dddddd] px-3 py-1.5 text-[13px] font-medium text-[#222222] transition hover:bg-[#f2f2f2]"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Remove this land?')) deleteMut.mutate(land._id)
                  }}
                  className="rounded-[8px] border border-[#dddddd] px-3 py-1.5 text-[13px] font-medium text-[#c13515] transition hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Nearby available lands ── */}
      <section className="rounded-[20px] border border-[#ebebeb] bg-white p-6 shadow-card">
        <h2 className="text-[20px] font-semibold tracking-[-0.18px] text-[#222222]">
          Browse nearby available lands
        </h2>
        <p className="mt-1 text-[14px] text-[#6a6a6a]">
          Drop a pin for your reference point, choose search radius, then search
          for plots listed for rent.
        </p>

        <div className="mt-4">
          <p className="mb-2 text-[14px] font-medium text-[#222222]">
            Reference location (OpenStreetMap + Leaflet)
          </p>
          <LandMapPicker
            lat={nearbyDraft.lat}
            lng={nearbyDraft.lng}
            onChange={setNearbyLocation}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-4">
          <div className="w-40">
            <label className="mb-1 block text-[14px] font-medium text-[#222222]">
              Radius (km)
            </label>
            <input
              type="number"
              min={1}
              max={200}
              value={nearbyDraft.maxKm}
              onChange={(e) =>
                setNearbyDraft((p) => ({ ...p, maxKm: e.target.value }))
              }
              className="w-full rounded-[8px] border border-[#dddddd] px-3 py-2.5 text-[14px] text-[#222222] outline-none transition focus:border-[#222222] focus:ring-2 focus:ring-[#222222]"
            />
          </div>
          <button
            type="button"
            onClick={runNearbySearch}
            className="rounded-[8px] bg-[#222222] px-6 py-2.5 text-[14px] font-medium text-white transition hover:bg-[#3d7a52]"
          >
            Search
          </button>
        </div>

        {nearbyQ.isLoading && (
          <p className="mt-4 text-[14px] text-[#6a6a6a]">Searching…</p>
        )}
        {nearbyQ.error && <ErrorBox msg={nearbyQ.error.message} />}

        {nearbySearch &&
          nearby.length === 0 &&
          !nearbyQ.isLoading &&
          !nearbyQ.error && (
            <p className="mt-4 text-[14px] text-[#6a6a6a]">
              No available lands in this radius. Try a larger radius or move the
              pin.
            </p>
          )}

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {nearby.map((land) => {
            const la = land.location?.coordinates?.[1]
            const ln = land.location?.coordinates?.[0]
            const dist =
              searchCenter &&
              la != null &&
              ln != null &&
              !Number.isNaN(la) &&
              !Number.isNaN(ln)
                ? distanceKm(searchCenter.la, searchCenter.ln, la, ln)
                : null

            return (
              <article
                key={land._id}
                className="flex flex-col rounded-[20px] border border-[#ebebeb] bg-[#fafafa] p-5 shadow-card"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-[16px] font-semibold leading-tight text-[#222222]">
                    {land.title?.trim() || 'Untitled listing'}
                  </h3>
                  {dist != null && (
                    <span className="shrink-0 rounded-[14px] bg-white px-2 py-0.5 text-[11px] font-semibold text-[#222222] shadow-sm">
                      ~{dist.toFixed(1)} km
                    </span>
                  )}
                </div>

                {land.size && (
                  <p className="mt-2 text-[14px] font-medium text-[#222222]">
                    Size: {land.size}
                  </p>
                )}

                <dl className="mt-2 space-y-1 text-[13px] text-[#6a6a6a]">
                  <div>
                    <dt className="inline font-medium text-[#222222]">Soil: </dt>
                    <dd className="inline">{land.soilCondition || '—'}</dd>
                  </div>
                  <div>
                    <dt className="inline font-medium text-[#222222]">Crop: </dt>
                    <dd className="inline">{land.cropType || '—'}</dd>
                  </div>
                  <div>
                    <dt className="inline font-medium text-[#222222]">Owner: </dt>
                    <dd className="inline">
                      {land.ownerId?._id ? (
                        <Link
                          to={`/app/users/${land.ownerId._id}`}
                          className="font-medium text-[#3d7a52] underline hover:text-[#2a5c3b]"
                        >
                          {land.ownerId?.name || 'View profile'}
                        </Link>
                      ) : (
                        (land.ownerId?.name || '—')
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline font-medium text-[#222222]">Location: </dt>
                    <dd className="inline font-mono text-[12px]">
                      {la != null && ln != null
                        ? `${la.toFixed(5)}, ${ln.toFixed(5)}`
                        : '—'}
                    </dd>
                  </div>
                </dl>

                {land.description && (
                  <p className="mt-3 line-clamp-3 text-[13px] leading-[1.4] text-[#6a6a6a]">
                    {land.description}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#ebebeb] pt-3">
                  <span className="text-[12px] text-[#6a6a6a]">
                    ID:{' '}
                    <code className="rounded bg-white px-1.5 py-0.5 text-[11px] text-[#222222]">
                      {land._id}
                    </code>
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText(land._id)}
                    className="rounded-[8px] border border-[#dddddd] px-3 py-1 text-[12px] font-medium text-[#222222] transition hover:bg-white"
                  >
                    Copy ID
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-[#6a6a6a]">
                  Use this ID when sending a rental request on the Rentals page.
                </p>
              </article>
            )
          })}
        </div>

        {nearbySearch && (
          <div className="mt-10 border-t border-[#ebebeb] pt-8">
            <h3 className="text-[18px] font-semibold text-[#222222]">
              Farmers / owners with land in this radius
            </h3>
            <p className="mt-1 text-[14px] text-[#6a6a6a]">
              Includes parcels not listed for rent. Open a profile to see which plots are
              available for rental.
            </p>
            {nearbyOwnersQ.isLoading && (
              <p className="mt-3 text-[14px] text-[#6a6a6a]">Loading owners…</p>
            )}
            {nearbyOwnersQ.error && (
              <ErrorBox msg={nearbyOwnersQ.error.message} />
            )}
            <ul className="mt-4 space-y-3">
              {(nearbyOwnersQ.data?.owners || []).map((row) => (
                <li
                  key={row.owner._id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[#ebebeb] bg-[#fafafa] px-4 py-3"
                >
                  <Link
                    to={`/app/users/${row.owner._id}`}
                    className="text-[15px] font-semibold text-[#3d7a52] underline"
                  >
                    {row.owner.name}
                  </Link>
                  <span className="text-[13px] text-[#6a6a6a]">
                    {row.landCountInRadius} parcel(s) here
                    {row.rentableLandCountInRadius > 0
                      ? ` · ${row.rentableLandCountInRadius} listed for rent`
                      : ''}
                  </span>
                </li>
              ))}
            </ul>
            {nearbySearch &&
              !nearbyOwnersQ.isLoading &&
              (nearbyOwnersQ.data?.owners || []).length === 0 &&
              !nearbyOwnersQ.error && (
                <p className="mt-3 text-[14px] text-[#6a6a6a]">
                  No land parcels found in this radius (try a wider search).
                </p>
              )}
          </div>
        )}
      </section>
    </div>
  )
}

function copyText(text) {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(() => {})
  }
}

function Input({ label, multiline, onChange, ...props }) {
  const cls =
    'w-full rounded-[8px] border border-[#dddddd] px-3 py-2.5 text-[14px] text-[#222222] outline-none transition focus:border-[#222222] focus:ring-2 focus:ring-[#222222]'
  return (
    <div>
      {label && (
        <label className="mb-1 block text-[14px] font-medium text-[#222222]">
          {label}
        </label>
      )}
      {multiline ? (
        <textarea
          rows={3}
          {...props}
          onChange={(e) => onChange(e.target.value)}
          className={cls}
        />
      ) : (
        <input
          {...props}
          onChange={(e) => onChange(e.target.value)}
          className={cls}
        />
      )}
    </div>
  )
}

function ErrorBox({ msg }) {
  return (
    <div className="rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-[#c13515]">
      {msg}
    </div>
  )
}
