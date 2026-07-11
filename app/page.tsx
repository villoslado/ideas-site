'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Idea,
  Field,
  Size,
  SourceModel,
  FIELD_ORDER,
  FIELD_LABELS,
  MODEL_LABELS,
} from '@/lib/types'
import {
  hasVisitorId,
  setVisitorFromEmail,
  setVisitorSkip,
  getLikedIdeas,
  fetchLikeCounts,
  toggleLike,
} from '@/lib/likes'
import IdeaCard from '@/components/IdeaCard'
import DetailModal from '@/components/DetailModal'
import EmailModal from '@/components/EmailModal'

type FieldFilter = 'all' | Field
type ModelFilter = 'all' | SourceModel
type TopFilter = 'all' | 'self' | 'high'
type SizeFilter = 'all' | Size
type SortOption = 'default' | 'liked' | 'score'

function Select<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <label className="flex shrink-0 items-center gap-2 border-r border-neutral-200 pr-3 last:border-r-0 last:pr-0">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-sm text-neutral-800 shadow-sm focus:border-neutral-400 focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export default function Home() {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<Idea | null>(null)

  // Email prompt: shown on the first like before a visitor id exists. The
  // pending idea is liked once they submit an email or skip.
  const [emailPromptOpen, setEmailPromptOpen] = useState(false)
  const [pendingIdea, setPendingIdea] = useState<Idea | null>(null)

  // filters
  const [search, setSearch] = useState('')
  const [field, setField] = useState<FieldFilter>('all')
  const [model, setModel] = useState<ModelFilter>('all')
  const [top, setTop] = useState<TopFilter>('all')
  const [build, setBuild] = useState<SizeFilter>('all')
  const [outreach, setOutreach] = useState<SizeFilter>('all')
  const [sort, setSort] = useState<SortOption>('default')

  // Load data + like state on mount.
  useEffect(() => {
    setLikedSet(getLikedIdeas())
    fetch('/data.json')
      .then((r) => r.json())
      .then((data: Idea[]) => setIdeas(data))
      .catch((e) => console.error('Failed to load data.json', e))
    fetchLikeCounts().then(setCounts)
  }, [])

  // Apply a like/unlike optimistically and persist it.
  const doLike = async (idea: Idea) => {
    const key = idea.idea_key
    const wasLiked = likedSet.has(key)
    // Optimistic UI: flip liked state and nudge the count immediately.
    setLikedSet((prev) => {
      const next = new Set(prev)
      if (wasLiked) next.delete(key)
      else next.add(key)
      return next
    })
    setCounts((prev) => ({
      ...prev,
      [key]: Math.max(0, (prev[key] ?? 0) + (wasLiked ? -1 : 1)),
    }))
    // Persist (localStorage always, Supabase best-effort).
    await toggleLike(key)
  }

  const handleLike = async (idea: Idea) => {
    // First like ever on this device: ask for an email before recording it.
    if (!hasVisitorId()) {
      setPendingIdea(idea)
      setEmailPromptOpen(true)
      return
    }
    await doLike(idea)
  }

  const handleEmailSubmit = async (email: string) => {
    await setVisitorFromEmail(email)
    setEmailPromptOpen(false)
    if (pendingIdea) {
      await doLike(pendingIdea)
      setPendingIdea(null)
    }
  }

  const handleEmailSkip = async () => {
    setVisitorSkip()
    setEmailPromptOpen(false)
    if (pendingIdea) {
      await doLike(pendingIdea)
      setPendingIdea(null)
    }
  }

  const handleEmailClose = () => {
    setEmailPromptOpen(false)
    setPendingIdea(null)
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return ideas.filter((i) => {
      if (field !== 'all' && i.field !== field) return false
      if (model !== 'all' && i.source_model !== model) return false
      if (top === 'self' && !i.is_self_top25) return false
      if (top === 'high' && !i.is_high_conviction) return false
      if (build !== 'all' && i.build_size !== build) return false
      if (outreach !== 'all' && i.outreach_size !== outreach) return false
      if (q) {
        const hay = (
          i.product_name +
          ' ' +
          i.one_liner +
          ' ' +
          i.what_it_does +
          ' ' +
          i.buyer +
          ' ' +
          i.occupation
        ).toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [ideas, search, field, model, top, build, outreach])

  // Apply the chosen sort. 'default' preserves the original (filtered) order.
  const sorted = useMemo(() => {
    if (sort === 'default') return filtered
    const copy = [...filtered]
    if (sort === 'liked') {
      copy.sort(
        (a, b) => (counts[b.idea_key] ?? 0) - (counts[a.idea_key] ?? 0)
      )
    } else if (sort === 'score') {
      copy.sort((a, b) => b.excitement_score - a.excitement_score)
    }
    return copy
  }, [filtered, sort, counts])

  return (
    <div className="min-h-screen bg-white">
      {/* Page header */}
      <header className="border-b border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
          <div
            className="border-l-4 pl-5 sm:pl-6"
            style={{ borderColor: '#0EA5E9' }}
          >
            <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
              405 AI Business Ideas
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-neutral-600 sm:text-base">
              Three frontier AI models — Claude Fable 5, GPT-5.6 Sol, and Grok
              4.5 — each generated 135 small business software ideas targeting
              occupations where AI is changing how work gets done. The 49
              high-conviction ideas survived both self-selection and independent
              cross-evaluation by a second model.
            </p>
            <p className="mt-3 text-sm italic text-neutral-400">
              Like the ones you&apos;d build.
            </p>
          </div>
        </div>
      </header>

      {/* Sticky filter bar */}
      <div className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3">
          <div className="flex items-baseline justify-between gap-4">
            <div className="text-lg font-bold text-neutral-900">
              405 AI Business Ideas
            </div>
            <span className="text-sm text-neutral-500">
              Showing {filtered.length} of {ideas.length || 405} ideas
            </span>
          </div>

          {/* Row 1: search */}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product, idea, buyer, occupation…"
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm shadow-sm focus:border-neutral-400 focus:outline-none"
          />

          {/* Row 2: all filters on one horizontally-scrolling line */}
          <div className="flex flex-nowrap items-center gap-3 overflow-x-auto pb-1">
            <Select<FieldFilter>
              label="Field"
              value={field}
              onChange={setField}
              options={[
                { value: 'all', label: 'All' },
                ...FIELD_ORDER.map((f) => ({ value: f, label: FIELD_LABELS[f] })),
              ]}
            />
            <Select<ModelFilter>
              label="Model"
              value={model}
              onChange={setModel}
              options={[
                { value: 'all', label: 'All' },
                { value: 'fable5', label: MODEL_LABELS.fable5 },
                { value: 'grok45', label: MODEL_LABELS.grok45 },
                { value: 'gpt56sol', label: MODEL_LABELS.gpt56sol },
              ]}
            />
            <Select<TopFilter>
              label="Top 25"
              value={top}
              onChange={setTop}
              options={[
                { value: 'all', label: 'All' },
                { value: 'self', label: 'Self top 25' },
                { value: 'high', label: 'High conviction ★' },
              ]}
            />
            <Select<SizeFilter>
              label="Build"
              value={build}
              onChange={setBuild}
              options={[
                { value: 'all', label: 'All' },
                { value: 's', label: 'S (3–4 wks)' },
                { value: 'm', label: 'M (4–8 wks)' },
                { value: 'l', label: 'L (10+ wks)' },
              ]}
            />
            <Select<SizeFilter>
              label="Outreach"
              value={outreach}
              onChange={setOutreach}
              options={[
                { value: 'all', label: 'All' },
                { value: 's', label: 'S Easy' },
                { value: 'm', label: 'M Mid' },
                { value: 'l', label: 'L Hard' },
              ]}
            />
            <Select<SortOption>
              label="Sort"
              value={sort}
              onChange={setSort}
              options={[
                { value: 'default', label: 'Default' },
                { value: 'liked', label: 'Most liked' },
                { value: 'score', label: 'Highest score' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Card grid */}
      <main className="mx-auto max-w-7xl px-4 py-6">
        {filtered.length === 0 ? (
          <div className="py-24 text-center text-neutral-400">
            No ideas match these filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((idea) => (
              <IdeaCard
                key={idea.idea_key}
                idea={idea}
                likeCount={counts[idea.idea_key] ?? 0}
                liked={likedSet.has(idea.idea_key)}
                onOpen={setSelected}
                onLike={handleLike}
              />
            ))}
          </div>
        )}
      </main>

      {selected && (
        <DetailModal
          idea={selected}
          likeCount={counts[selected.idea_key] ?? 0}
          liked={likedSet.has(selected.idea_key)}
          onClose={() => setSelected(null)}
          onLike={handleLike}
        />
      )}

      {emailPromptOpen && (
        <EmailModal
          onSubmit={handleEmailSubmit}
          onSkip={handleEmailSkip}
          onClose={handleEmailClose}
        />
      )}
    </div>
  )
}
