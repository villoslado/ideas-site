'use client'

import { useEffect } from 'react'
import {
  Idea,
  FIELD_COLORS,
  FIELD_LABELS,
  MODEL_LABELS,
  BUILD_LABELS,
  OUTREACH_LABELS,
  scoreColor,
  judgeLabel,
} from '@/lib/types'

interface Props {
  idea: Idea
  likeCount: number
  liked: boolean
  onClose: () => void
  onLike: (idea: Idea) => void
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
        {label}
      </div>
      <div className="mt-0.5 text-sm text-neutral-800">{value}</div>
    </div>
  )
}

export default function DetailModal({
  idea,
  likeCount,
  liked,
  onClose,
  onLike,
}: Props) {
  const fieldColor = FIELD_COLORS[idea.field]

  // Close on Escape; lock background scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ height: 4, backgroundColor: fieldColor }} />

        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 transition hover:bg-neutral-200"
          aria-label="Close"
        >
          ✕
        </button>

        <div className="flex flex-col md:flex-row">
          {/* LEFT (60%) */}
          <div className="flex flex-col gap-4 p-6 md:w-3/5">
            {idea.is_high_conviction && (
              <div className="flex items-center gap-1 text-sm font-semibold text-amber-600">
                <span>★</span> HIGH CONVICTION
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold leading-tight text-neutral-900">
                {idea.product_name}
              </h2>
              <p className="mt-1 text-base text-neutral-500">{idea.one_liner}</p>
            </div>

            <p className="text-[15px] leading-relaxed text-neutral-800">
              {idea.what_it_does}
            </p>

            {idea.is_self_top25 && idea.why_top_25 && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  ★ Why {MODEL_LABELS[idea.source_model]} put it in its top 25
                </div>
                <blockquote className="mt-1 border-l-2 border-neutral-300 pl-3 text-sm italic leading-relaxed text-neutral-600">
                  {idea.why_top_25}
                </blockquote>
              </div>
            )}

            {idea.is_cross_top25 && idea.cross_why_selected && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  Also selected by {judgeLabel(idea.cross_judge_model)}
                  {idea.cross_excitement != null
                    ? ` (scored ${idea.cross_excitement}/10)`
                    : ''}
                </div>
                <blockquote className="mt-1 border-l-2 border-emerald-300 pl-3 text-sm italic leading-relaxed text-neutral-600">
                  {idea.cross_why_selected}
                </blockquote>
              </div>
            )}
          </div>

          {/* RIGHT (40%) */}
          <div className="flex flex-col gap-4 border-t border-neutral-100 bg-neutral-50 p-6 md:w-2/5 md:border-l md:border-t-0">
            <Detail
              label="Occupation"
              value={
                <>
                  {idea.occupation}
                  <span className="mt-0.5 block text-xs text-neutral-500">
                    {idea.model_consensus}
                  </span>
                </>
              }
            />
            <Detail label="Buyer" value={idea.buyer} />
            <Detail label="How they find you" value={idea.how_they_find_you} />
            <Detail label="Pricing" value={idea.pricing} />
            <Detail label="Biggest risk" value={idea.biggest_risk} />

            <div className="grid grid-cols-2 gap-3">
              <Detail
                label="Field"
                value={
                  <span
                    className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium text-white"
                    style={{ backgroundColor: fieldColor }}
                  >
                    {FIELD_LABELS[idea.field]}
                  </span>
                }
              />
              <Detail
                label="Source model"
                value={MODEL_LABELS[idea.source_model]}
              />
              <Detail label="Build time" value={BUILD_LABELS[idea.build_size]} />
              <Detail
                label="Outreach"
                value={OUTREACH_LABELS[idea.outreach_size]}
              />
            </div>

            <Detail
              label="Excitement"
              value={
                <div className="flex items-center gap-2">
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{
                      backgroundColor: scoreColor(idea.excitement_score),
                    }}
                  >
                    {idea.excitement_score}
                  </span>
                  <span className="text-xs text-neutral-500">source</span>
                  {idea.cross_excitement != null && (
                    <>
                      <span
                        className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{
                          backgroundColor: scoreColor(idea.cross_excitement),
                        }}
                      >
                        {idea.cross_excitement}
                      </span>
                      <span className="text-xs text-neutral-500">
                        {judgeLabel(idea.cross_judge_model)}
                      </span>
                    </>
                  )}
                </div>
              }
            />
          </div>
        </div>

        {/* BOTTOM: like */}
        <div className="flex flex-col items-center gap-1 border-t border-neutral-100 p-6">
          <button
            onClick={() => onLike(idea)}
            className="inline-flex items-center gap-2 rounded-full border px-6 py-2.5 text-base font-semibold transition hover:bg-rose-50"
            style={
              liked
                ? { color: '#E11D48', borderColor: '#FDA4AF' }
                : { color: '#374151', borderColor: '#E5E7EB' }
            }
          >
            <span className="text-lg">{liked ? '♥' : '♡'}</span>
            {liked ? 'Liked' : 'Like this idea'}
          </button>
          <span className="text-sm text-neutral-500">
            {likeCount} {likeCount === 1 ? 'person likes' : 'people like'} this idea
          </span>
        </div>
      </div>
    </div>
  )
}
