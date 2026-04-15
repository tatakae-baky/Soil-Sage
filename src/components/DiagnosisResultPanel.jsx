/**
 * Renders a persisted diagnosis document: structured `result`, disclaimer, and model id.
 * Shared by the upload flow (`DiagnosePage`) and the saved-record view (`DiagnosisDetailPage`).
 *
 * @param {object} props
 * @param {string} [props.title] Section heading
 * @param {Record<string, unknown>} props.diagnosis API `diagnosis` object (`result`, `disclaimer`, `model`)
 * @param {import('react').ReactNode} [props.afterDisclaimer] Extra row(s) below the model line (e.g. nav links)
 */
export function DiagnosisResultPanel({ title = 'Diagnosis result', diagnosis, afterDisclaimer }) {
  const r = diagnosis?.result || {}
  const issues = Array.isArray(r.likelyIssues) ? r.likelyIssues : []
  const highCount = issues.filter((x) => x.confidence === 'high').length
  /** Simple severity ribbon driven by model confidence — not a clinical score. */
  const severity =
    highCount >= 2 ? 'high' : highCount === 1 || issues.some((x) => x.confidence === 'medium') ? 'medium' : 'low'
  const severityStyles = {
    high: 'border-l-amber-500 bg-amber-50/90 text-amber-950',
    medium: 'border-l-amber-400 bg-amber-50/50 text-amber-950',
    low: 'border-l-emerald-500 bg-emerald-50/60 text-emerald-950',
  }
  const actions = Array.isArray(r.recommendedActions) ? r.recommendedActions : []
  const preventionTips = Array.isArray(r.preventionTips)
    ? r.preventionTips
    : typeof r.preventionTips === 'string' && r.preventionTips
      ? [r.preventionTips]
      : []

  return (
    <section className="overflow-hidden rounded-2xl border border-border-light bg-surface shadow-card">
      <div className="border-b border-border-light px-6 py-4">
        <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
      </div>

      {r.summary && (
        <div className={`border-l-4 px-6 py-5 ${severityStyles[severity]}`}>
          <p className="text-[11px] font-bold uppercase tracking-wide text-text-secondary/90">Summary</p>
          <p className="mt-2 text-sm font-medium leading-relaxed text-text-primary md:text-[15px]">{r.summary}</p>
        </div>
      )}

      <div className="space-y-6 px-6 py-6">
        {issues.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
              Likely issues
            </h3>
            <ol className="mt-3 space-y-3">
              {issues.map((issue, i) => (
                <li
                  key={i}
                  className="flex gap-3 rounded-xl border border-border-light bg-zinc-50/80 px-4 py-3"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-brand ring-1 ring-border">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-text-primary">{issue.name}</p>
                    <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-text-secondary">
                      Confidence: {issue.confidence}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-text-secondary">{issue.evidence}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {Array.isArray(r.unlikelyButSerious) && r.unlikelyButSerious.length > 0 && (
          <div className="rounded-xl border border-red-200 bg-red-50/50 px-4 py-4">
            <h3 className="text-sm font-semibold text-red-900">Unlikely but serious — rule out</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-900/90">
              {r.unlikelyButSerious.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </div>
        )}

        {actions.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
              Recommended actions
            </h3>
            <ul className="mt-3 space-y-2">
              {actions.map((a, i) => (
                <li
                  key={i}
                  className="flex gap-3 rounded-xl border border-border-light bg-white px-4 py-3 shadow-sm"
                >
                  <span
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-brand text-[10px] font-bold text-brand"
                    aria-hidden
                  >
                    ✓
                  </span>
                  <div>
                    <p className="font-semibold text-text-primary">{a.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-text-secondary">{a.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {Array.isArray(r.needsMoreInfo) && r.needsMoreInfo.length > 0 && (
          <div className="rounded-xl border border-dashed border-border bg-surface-secondary/50 px-4 py-4">
            <h3 className="text-sm font-semibold text-text-primary">Needs more information</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-text-secondary">
              {r.needsMoreInfo.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </div>
        )}

        {preventionTips.length > 0 && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 px-4 py-4">
            <h3 className="text-sm font-semibold text-emerald-900">Prevention &amp; follow-up</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-emerald-900/90">
              {preventionTips.map((line, i) => (
                <li key={i}>{typeof line === 'string' ? line : JSON.stringify(line)}</li>
              ))}
            </ul>
          </div>
        )}

        {r.safetyNotes ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <span className="font-semibold">Safety: </span>
            {r.safetyNotes}
          </p>
        ) : null}
      </div>

      <div className="border-t border-border-light bg-zinc-50/80 px-6 py-4">
        {diagnosis.disclaimer && (
          <p className="text-xs leading-relaxed text-text-secondary">{diagnosis.disclaimer}</p>
        )}
        <p className="mt-2 text-[11px] text-text-secondary">Model: {diagnosis.model}</p>
        {afterDisclaimer}
      </div>
    </section>
  )
}
