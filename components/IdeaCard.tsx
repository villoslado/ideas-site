'use client'

import {
  Idea,
  FIELD_COLORS,
  FIELD_LABELS,
  MODEL_LABELS,
  BUILD_LABELS,
  OUTREACH_LABELS,
  scoreColor,
} from '@/lib/types'

interface Props {
  idea: Idea
  likeCount: number
  liked: boolean
  onOpen: (idea: Idea) => void
  onLike: (idea: Idea) => void
}

function Tag({
  children,
  color,
}: {
  children: React.ReactNode
  color?: string
}) {
  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium"
      style={
        color
          ? { borderColor: color, color }
          : { borderColor: '#E5E7EB', color: '#6B7280' }
      }
    >
      {children}
    </span>
  )
}

export default function IdeaCard({
  idea,
  likeCount,
  liked,
  onOpen,
  onLike,
}: Props) {
  const fieldColor = FIELD_COLORS[idea.field]

  return (
    <div
      onClick={() => onOpen(idea)}
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      {/* field color bar */}
      <div style={{ height: 3, backgroundColor: fieldColor }} />

      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* high-conviction / self top-25 badges */}
        {idea.is_high_conviction ? (
          <div className="flex items-center gap-1 text-xs font-semibold text-amber-600">
            <span>★</span> HIGH CONVICTION
          </div>
        ) : idea.is_self_top25 ? (
          <div className="text-xs font-semibold text-neutral-500">★ Top 25</div>
        ) : null}

        {/* name + score */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold leading-tight text-neutral-900">
            {idea.product_name}
          </h3>
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ backgroundColor: scoreColor(idea.excitement_score) }}
            title={`Excitement ${idea.excitement_score}/10`}
          >
            {idea.excitement_score}
          </span>
        </div>

        <p className="text-sm leading-snug text-neutral-500">{idea.one_liner}</p>

        <div className="flex flex-col gap-1 text-sm text-neutral-700">
          <div className="truncate" title={idea.buyer}>
            🏢 {idea.buyer}
          </div>
          <div className="truncate" title={idea.pricing}>
            💰 {idea.pricing}
          </div>
        </div>

        {/* tags */}
        <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
          <Tag color={fieldColor}>{FIELD_LABELS[idea.field]}</Tag>
          <Tag>{MODEL_LABELS[idea.source_model]}</Tag>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Tag>Build: {BUILD_LABELS[idea.build_size]}</Tag>
          <Tag>Outreach: {OUTREACH_LABELS[idea.outreach_size]}</Tag>
        </div>

        {/* footer: like + view */}
        <div className="mt-1 flex items-center justify-between border-t border-neutral-100 pt-3">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onLike(idea)
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-2.5 py-1 text-sm transition hover:border-rose-300 hover:bg-rose-50"
            style={liked ? { color: '#E11D48', borderColor: '#FDA4AF' } : {}}
            aria-label={liked ? 'Unlike' : 'Like'}
          >
            <span>{liked ? '♥' : '♡'}</span>
            <span>{likeCount}</span>
          </button>
          <span className="text-sm font-medium text-neutral-400 group-hover:text-neutral-700">
            View details →
          </span>
        </div>
      </div>
    </div>
  )
}
