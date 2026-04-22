import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { recommendationsApi } from '../lib/api'

export function RecommendationDetailPage() {
  const { recommendationId } = useParams()

  const q = useQuery({
    queryKey: ['recommendations', recommendationId],
    queryFn: () => recommendationsApi.get(recommendationId),
    enabled: Boolean(recommendationId),
  })

  if (q.isLoading) {
    return <p className="text-[14px] text-[#6a6a6a]">Loading…</p>
  }

  if (q.error) {
    return (
      <div className="rounded-[20px] border border-[#ebebeb] bg-white p-6 shadow-card">
        <p className="text-[14px] text-[#c13515]">{q.error.message}</p>
        <Link
          to="/app/recommendations"
          className="mt-4 inline-block text-[14px] font-medium text-[#3d7a52]"
        >
          Back to recommendations
        </Link>
      </div>
    )
  }

  const rec = q.data?.recommendation
  if (!rec) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.44px] text-[#222222]">
            Crop recommendation
          </h1>
          <p className="mt-1 text-[13px] text-[#6a6a6a]">
            {new Date(rec.createdAt).toLocaleString()}
            {rec.model && (
              <span className="ml-2 rounded-full bg-[#f2f2f2] px-2 py-0.5 text-[11px] font-medium text-[#6a6a6a]">
                {rec.model}
              </span>
            )}
          </p>
        </div>
        <Link
          to="/app/recommendations"
          className="text-[14px] font-medium text-[#3d7a52] underline"
        >
          Back
        </Link>
      </div>

      {/* Context */}
      {(rec.cropType || rec.soilType || rec.region || rec.season || rec.notes) && (
        <section className="rounded-[16px] border border-[#ebebeb] bg-[#fafafa] p-4">
          <h2 className="text-[14px] font-semibold text-[#6a6a6a] uppercase tracking-wide">
            Your inputs
          </h2>
          <dl className="mt-3 grid gap-2 sm:grid-cols-2">
            {rec.cropType && (
              <>
                <dt className="text-[12px] font-medium text-[#6a6a6a]">Crop</dt>
                <dd className="text-[13px] text-[#222222]">{rec.cropType}</dd>
              </>
            )}
            {rec.soilType && (
              <>
                <dt className="text-[12px] font-medium text-[#6a6a6a]">Soil type</dt>
                <dd className="text-[13px] text-[#222222]">{rec.soilType}</dd>
              </>
            )}
            {rec.region && (
              <>
                <dt className="text-[12px] font-medium text-[#6a6a6a]">Region</dt>
                <dd className="text-[13px] text-[#222222]">{rec.region}</dd>
              </>
            )}
            {rec.season && (
              <>
                <dt className="text-[12px] font-medium text-[#6a6a6a]">Season</dt>
                <dd className="text-[13px] text-[#222222]">{rec.season}</dd>
              </>
            )}
            {rec.notes && (
              <>
                <dt className="text-[12px] font-medium text-[#6a6a6a] sm:col-span-2">Notes</dt>
                <dd className="text-[13px] text-[#222222] sm:col-span-2 leading-relaxed">
                  {rec.notes}
                </dd>
              </>
            )}
          </dl>
        </section>
      )}

      {/* Recommended crops */}
      <section>
        <h2 className="text-[18px] font-semibold text-[#222222]">Recommended crops</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {(rec.recommendedCrops || []).map((crop, i) => (
            <div
              key={i}
              className="rounded-[16px] border border-[#ebebeb] bg-white p-5 shadow-card"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-800">
                  {i + 1}
                </span>
                <h3 className="text-[16px] font-semibold text-[#222222]">{crop.name}</h3>
              </div>
              {crop.reasoning && (
                <p className="mt-3 text-[13px] text-[#6a6a6a] leading-relaxed">{crop.reasoning}</p>
              )}
              {crop.careNotes && (
                <div className="mt-3 rounded-[8px] bg-amber-50 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                    Care notes
                  </p>
                  <p className="mt-1 text-[12px] text-amber-900 leading-relaxed">{crop.careNotes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Rotation & tips */}
      {(rec.rotationAdvice || rec.seasonalTips || rec.generalNotes) && (
        <section className="space-y-4">
          {rec.rotationAdvice && (
            <div className="rounded-[16px] border border-[#ebebeb] bg-white p-5 shadow-card">
              <h3 className="text-[15px] font-semibold text-[#222222]">Crop rotation advice</h3>
              <p className="mt-2 text-[13px] text-[#6a6a6a] leading-relaxed">{rec.rotationAdvice}</p>
            </div>
          )}
          {rec.seasonalTips && (
            <div className="rounded-[16px] border border-[#ebebeb] bg-white p-5 shadow-card">
              <h3 className="text-[15px] font-semibold text-[#222222]">Seasonal tips</h3>
              <p className="mt-2 text-[13px] text-[#6a6a6a] leading-relaxed">{rec.seasonalTips}</p>
            </div>
          )}
          {rec.generalNotes && (
            <div className="rounded-[16px] border border-[#ebebeb] bg-white p-5 shadow-card">
              <h3 className="text-[15px] font-semibold text-[#222222]">General notes</h3>
              <p className="mt-2 text-[13px] text-[#6a6a6a] leading-relaxed">{rec.generalNotes}</p>
            </div>
          )}
        </section>
      )}

      {/* Disclaimer */}
      {rec.disclaimer && (
        <p className="rounded-[8px] border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-800 leading-relaxed">
          <strong>Disclaimer:</strong> {rec.disclaimer}
        </p>
      )}
    </div>
  )
}
