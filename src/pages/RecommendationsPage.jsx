import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { recommendationsApi, landsApi } from '../lib/api'

const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter', 'Year-round']

export function RecommendationsPage() {
  const qc = useQueryClient()

  const [cropType, setCropType] = useState('')
  const [soilType, setSoilType] = useState('')
  const [region, setRegion] = useState('')
  const [season, setSeason] = useState('')
  const [notes, setNotes] = useState('')
  const [landId, setLandId] = useState('')
  const [formError, setFormError] = useState('')

  const landsQ = useQuery({
    queryKey: ['lands', 'mine'],
    queryFn: () => landsApi.mine(),
  })

  const listQ = useQuery({
    queryKey: ['recommendations'],
    queryFn: () => recommendationsApi.list(),
  })

  const createMut = useMutation({
    mutationFn: () =>
      recommendationsApi.create({
        cropType: cropType.trim(),
        soilType: soilType.trim(),
        region: region.trim(),
        season,
        notes: notes.trim(),
        ...(landId ? { landId } : {}),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recommendations'] })
      setCropType('')
      setSoilType('')
      setRegion('')
      setSeason('')
      setNotes('')
      setLandId('')
      setFormError('')
    },
    onError: (e) => setFormError(e.message),
  })

  const recommendations = listQ.data?.recommendations || []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[22px] font-semibold tracking-[-0.44px] text-[#222222]">
          Crop recommendations
        </h1>
        <p className="mt-1 text-[14px] text-[#6a6a6a]">
          Get AI-powered crop suggestions based on your land and conditions.
        </p>
      </div>

      {/* ── Request form ── */}
      <section className="rounded-[20px] border border-[#ebebeb] bg-white p-6 shadow-card">
        <h2 className="text-[17px] font-semibold text-[#222222]">New recommendation</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            createMut.mutate()
          }}
          className="mt-4 space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[13px] font-medium text-[#222222]">
                Current / desired crop (optional)
              </label>
              <input
                value={cropType}
                onChange={(e) => setCropType(e.target.value)}
                placeholder="e.g. Rice, Wheat…"
                className="w-full rounded-[8px] border border-[#dddddd] px-3 py-2 text-[14px] text-[#222222] outline-none focus:border-[#222222] focus:ring-2 focus:ring-[#222222]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-medium text-[#222222]">
                Soil type (optional)
              </label>
              <input
                value={soilType}
                onChange={(e) => setSoilType(e.target.value)}
                placeholder="e.g. Loamy, Clay…"
                className="w-full rounded-[8px] border border-[#dddddd] px-3 py-2 text-[14px] text-[#222222] outline-none focus:border-[#222222] focus:ring-2 focus:ring-[#222222]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-medium text-[#222222]">
                Region / location (optional)
              </label>
              <input
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="e.g. Dhaka, Punjab…"
                className="w-full rounded-[8px] border border-[#dddddd] px-3 py-2 text-[14px] text-[#222222] outline-none focus:border-[#222222] focus:ring-2 focus:ring-[#222222]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-medium text-[#222222]">
                Season (optional)
              </label>
              <select
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                className="w-full rounded-[8px] border border-[#dddddd] px-3 py-2 text-[14px] text-[#222222] outline-none focus:border-[#222222]"
              >
                <option value="">Not specified</option>
                {SEASONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(landsQ.data?.lands?.length ?? 0) > 0 && (
            <div>
              <label className="mb-1 block text-[13px] font-medium text-[#222222]">
                Link to a land record (optional)
              </label>
              <select
                value={landId}
                onChange={(e) => setLandId(e.target.value)}
                className="w-full max-w-sm rounded-[8px] border border-[#dddddd] px-3 py-2 text-[14px] text-[#222222] outline-none focus:border-[#222222]"
              >
                <option value="">None</option>
                {(landsQ.data?.lands || []).map((l) => (
                  <option key={l._id} value={l._id}>
                    {l.title || 'Untitled'} {l.cropType ? `(${l.cropType})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-[13px] font-medium text-[#222222]">
              Additional notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any specific requirements, constraints, or goals…"
              rows={3}
              maxLength={1000}
              className="w-full rounded-[8px] border border-[#dddddd] px-3 py-2 text-[14px] text-[#222222] outline-none focus:border-[#222222] focus:ring-2 focus:ring-[#222222] resize-none"
            />
          </div>

          {formError && (
            <p className="rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-[#c13515]">
              {formError}
            </p>
          )}

          <button
            type="submit"
            disabled={createMut.isPending}
            className="rounded-[8px] bg-[#3d7a52] px-6 py-2.5 text-[14px] font-medium text-white hover:bg-[#2a5c3b] disabled:opacity-50"
          >
            {createMut.isPending ? 'Getting recommendations…' : 'Get recommendations'}
          </button>
        </form>
      </section>

      {/* ── History list ── */}
      <section>
        <h2 className="text-[18px] font-semibold text-[#222222]">Your recommendations</h2>
        {listQ.isLoading && <p className="mt-2 text-[14px] text-[#6a6a6a]">Loading…</p>}
        {listQ.error && (
          <p className="mt-2 text-[13px] text-[#c13515]">{listQ.error.message}</p>
        )}
        {!listQ.isLoading && recommendations.length === 0 && (
          <p className="mt-2 text-[14px] text-[#6a6a6a]">No recommendations yet.</p>
        )}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {recommendations.map((r) => (
            <Link
              key={r._id}
              to={`/app/recommendations/${r._id}`}
              className="block rounded-[16px] border border-[#ebebeb] bg-white p-5 shadow-card transition hover:border-[#222222]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-[#222222]">
                    {r.recommendedCrops?.map((c) => c.name).join(', ') || 'Recommendation'}
                  </p>
                  {(r.cropType || r.region || r.season) && (
                    <p className="mt-1 truncate text-[12px] text-[#6a6a6a]">
                      {[r.cropType, r.region, r.season].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                <span className="shrink-0 rounded-full bg-green-50 px-2.5 py-0.5 text-[11px] font-semibold text-green-700">
                  {r.recommendedCrops?.length ?? 0} crops
                </span>
              </div>
              <p className="mt-3 text-[11px] text-[#6a6a6a]">
                {new Date(r.createdAt).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
