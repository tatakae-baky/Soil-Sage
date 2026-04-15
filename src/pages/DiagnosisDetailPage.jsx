import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { DiagnosisResultPanel } from '../components/DiagnosisResultPanel'
import { diagnosesApi } from '../lib/api'

/**
 * Read-only view for a single saved diagnosis (dashboard / notification deep links).
 */
export function DiagnosisDetailPage() {
  const { diagnosisId } = useParams()

  const q = useQuery({
    queryKey: ['diagnoses', 'one', diagnosisId],
    queryFn: () => diagnosesApi.getOne(diagnosisId),
    enabled: Boolean(diagnosisId),
  })

  const d = q.data?.diagnosis
  const land = d?.landId && typeof d.landId === 'object' ? d.landId : null
  const coords = land?.location?.coordinates
  const providersTo =
    coords?.length === 2
      ? `/app/providers?lat=${encodeURIComponent(coords[1])}&lng=${encodeURIComponent(coords[0])}`
      : '/app/providers'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.44px] text-[#222222]">
            Saved diagnosis
          </h1>
          {d?.createdAt && (
            <p className="mt-1 text-[14px] text-[#6a6a6a]">
              {new Date(d.createdAt).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to={providersTo}
            className="rounded-[8px] border border-[#ff385c] px-4 py-2 text-[14px] font-medium text-[#ff385c] transition hover:bg-red-50"
          >
            Find nearby stores / services
          </Link>
          <Link
            to="/app/diagnose"
            className="rounded-[8px] bg-[#ff385c] px-4 py-2 text-[14px] font-medium text-white transition hover:bg-[#e00b41]"
          >
            New diagnosis
          </Link>
          <Link
            to="/app"
            className="rounded-[8px] border border-[#dddddd] px-4 py-2 text-[14px] font-medium text-[#222222] transition hover:bg-[#f2f2f2]"
          >
            Dashboard
          </Link>
        </div>
      </div>

      {q.isLoading && <p className="text-[14px] text-[#6a6a6a]">Loading…</p>}
      {q.isError && (
        <p className="rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-800">
          {q.error instanceof Error ? q.error.message : 'Could not load this diagnosis.'}
        </p>
      )}

      {d && (
        <>
          {d.landId && typeof d.landId === 'object' && (
            <div className="rounded-[14px] border border-[#ebebeb] bg-[#fafafa] px-4 py-3 text-[14px] text-[#222222]">
              <span className="font-medium">Linked land: </span>
              {(d.landId.title || 'Untitled').slice(0, 80)}
              {d.landId.cropType ? ` · ${d.landId.cropType}` : ''}
            </div>
          )}
          {d.notes ? (
            <div className="rounded-[14px] border border-[#ebebeb] bg-white px-4 py-3 text-[14px] text-[#222222]">
              <span className="font-medium">Your notes: </span>
              {d.notes}
            </div>
          ) : null}
          <DiagnosisResultPanel
            diagnosis={d}
            afterDisclaimer={
              <p className="mt-3 text-[13px] text-[#6a6a6a]">
                This is a saved report — there is no live chat. Run a{' '}
                <Link to="/app/diagnose" className="font-medium text-[#ff385c] underline">
                  new diagnosis
                </Link>{' '}
                with fresh photos if conditions change.
              </p>
            }
          />
        </>
      )}
    </div>
  )
}
