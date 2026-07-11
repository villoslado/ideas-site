'use client'

import { useEffect, useMemo, useState } from 'react'
import { Idea } from '@/lib/types'
import { hashEmail, getVisitorId } from '@/lib/likes'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

interface Props {
  ideas: Idea[]
  onOpenIdea: (idea: Idea) => void
  onClose: () => void
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_EMAILS = 10

const GOLD = '#F59E0B' // section 1 — everyone agrees
const BLUE = '#0EA5E9' // section 2 — most popular
const ORANGE = '#F7931A' // primary CTA

// One idea_key -> the set of participant hashes that liked it.
type Overlap = {
  entries: { idea: Idea; count: number; hashes: Set<string> }[]
  youHash: string | null
  total: number // Y — number of people in the group (unique hashes)
  votersWithLikes: number // how many of them have any likes at all
}

function ResultCard({
  idea,
  count,
  total,
  accent,
  onOpen,
}: {
  idea: Idea
  count: number
  total: number
  accent: string
  onOpen: (idea: Idea) => void
}) {
  return (
    <button
      onClick={() => onOpen(idea)}
      className="flex w-full items-stretch gap-3 overflow-hidden rounded-lg border border-neutral-200 bg-white text-left shadow-sm transition hover:border-neutral-300 hover:shadow"
    >
      <div style={{ width: 4, backgroundColor: accent }} />
      <div className="flex flex-1 flex-col gap-0.5 py-2.5 pr-3">
        <div className="text-sm font-semibold leading-tight text-neutral-900">
          {idea.product_name}
        </div>
        <div className="line-clamp-1 text-xs text-neutral-500">
          {idea.one_liner}
        </div>
        <div
          className="mt-0.5 text-xs font-semibold"
          style={{ color: accent }}
        >
          {count} of {total} people
        </div>
      </div>
    </button>
  )
}

export default function CofounderModal({ ideas, onOpenIdea, onClose }: Props) {
  const [step, setStep] = useState<'input' | 'results'>('input')
  const [emails, setEmails] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [inputError, setInputError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [queryError, setQueryError] = useState<string | null>(null)
  const [overlap, setOverlap] = useState<Overlap | null>(null)
  const [showOnlyYou, setShowOnlyYou] = useState(false)

  // The current device's stored identity (hash) — folded into the overlap as
  // "You". We never have the raw email (only its hash is stored), so there is
  // nothing to pre-fill into the text input.
  const youHash = useMemo(() => getVisitorId(), [])

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

  const ideasByKey = useMemo(() => {
    const m = new Map<string, Idea>()
    for (const i of ideas) m.set(i.idea_key, i)
    return m
  }, [ideas])

  const addEmail = () => {
    const e = input.trim().toLowerCase()
    if (!e) return
    if (!EMAIL_RE.test(e)) {
      setInputError("That doesn't look like an email address.")
      return
    }
    if (emails.includes(e)) {
      setInputError('You already added that email.')
      return
    }
    if (emails.length >= MAX_EMAILS) {
      setInputError(`That's the max — up to ${MAX_EMAILS} emails.`)
      return
    }
    setEmails((prev) => [...prev, e])
    setInput('')
    setInputError(null)
  }

  const removeEmail = (e: string) =>
    setEmails((prev) => prev.filter((x) => x !== e))

  const findOverlap = async () => {
    if (loading) return
    setQueryError(null)
    if (!isSupabaseConfigured) {
      setQueryError('Voting is not connected right now — try again later.')
      return
    }
    setLoading(true)
    try {
      // Hash each friend's email client-side; raw emails never leave the browser.
      const friendHashes = await Promise.all(emails.map(hashEmail))
      const allHashes = [...new Set([...(youHash ? [youHash] : []), ...friendHashes])]

      const { data, error } = await supabase
        .from('likes')
        .select('idea_key, visitor_id')
        .in('visitor_id', allHashes)
      if (error) throw error

      const rows = (data ?? []) as { idea_key: string; visitor_id: string }[]
      const byIdea = new Map<string, Set<string>>()
      const voters = new Set<string>()
      for (const row of rows) {
        voters.add(row.visitor_id)
        let set = byIdea.get(row.idea_key)
        if (!set) {
          set = new Set()
          byIdea.set(row.idea_key, set)
        }
        set.add(row.visitor_id)
      }

      const entries = [...byIdea.entries()]
        .map(([key, hashes]) => ({
          idea: ideasByKey.get(key),
          count: hashes.size,
          hashes,
        }))
        .filter((e): e is { idea: Idea; count: number; hashes: Set<string> } =>
          Boolean(e.idea)
        )

      setOverlap({
        entries,
        youHash,
        total: allHashes.length,
        votersWithLikes: voters.size,
      })
      setShowOnlyYou(false)
      setStep('results')
    } catch {
      setQueryError('Could not reach the vote database. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // --- Derived result sections (only meaningful in the results step) ---
  const sections = useMemo(() => {
    if (!overlap) return null
    const { entries, youHash: you, total } = overlap
    const rank = (
      a: { count: number; idea: Idea },
      b: { count: number; idea: Idea }
    ) => b.count - a.count || b.idea.excitement_score - a.idea.excitement_score

    const everyone = entries.filter((e) => e.count === total).sort(rank)
    const popular = entries.filter((e) => e.count >= 2).sort(rank)
    const onlyYou = you
      ? entries
          .filter((e) => e.count === 1 && e.hashes.has(you))
          .map((e) => e.idea)
          .sort((a, b) => b.excitement_score - a.excitement_score)
      : []
    return { everyone, popular, onlyYou }
  }, [overlap])

  const groupSize = overlap?.total ?? 0

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ height: 4, backgroundColor: ORANGE }} className="rounded-t-2xl" />
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 transition hover:bg-neutral-200"
          aria-label="Close"
        >
          ✕
        </button>

        <div className="p-6 sm:p-8">
          {step === 'input' ? (
            <>
              <h2 className="text-xl font-bold tracking-tight text-neutral-900">
                Find your co-founder
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                Enter the emails of friends who voted. We&apos;ll show you which
                ideas you all liked — and who to build with.
              </p>

              <div className="mt-5 flex gap-2">
                <input
                  type="email"
                  value={input}
                  autoFocus
                  onChange={(e) => {
                    setInput(e.target.value)
                    if (inputError) setInputError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addEmail()
                    }
                  }}
                  placeholder="friend@email.com"
                  className="flex-grow rounded-lg border border-neutral-200 px-3 py-2 text-sm shadow-sm focus:border-neutral-400 focus:outline-none"
                />
                <button
                  onClick={addEmail}
                  className="shrink-0 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
                >
                  Add email
                </button>
              </div>
              {inputError && (
                <p className="mt-1.5 text-xs text-rose-500">{inputError}</p>
              )}

              {/* Email tags */}
              {(youHash || emails.length > 0) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {youHash && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
                      You
                    </span>
                  )}
                  {emails.map((e) => (
                    <span
                      key={e}
                      className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700"
                    >
                      {e}
                      <button
                        onClick={() => removeEmail(e)}
                        className="text-neutral-400 transition hover:text-neutral-700"
                        aria-label={`Remove ${e}`}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-2 text-xs text-neutral-400">
                {emails.length}/{MAX_EMAILS} emails added. Emails are hashed on
                your device — we never send or store them.
              </p>

              {queryError && (
                <p className="mt-3 text-sm text-rose-500">{queryError}</p>
              )}

              <button
                onClick={findOverlap}
                disabled={emails.length === 0 || loading}
                className="mt-5 w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                style={{ backgroundColor: ORANGE }}
              >
                {loading ? 'Finding overlap…' : 'Find overlap →'}
              </button>
            </>
          ) : (
            <>
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-xl font-bold tracking-tight text-neutral-900">
                  Your group&apos;s overlap
                </h2>
                <button
                  onClick={() => setStep('input')}
                  className="shrink-0 text-sm font-medium text-neutral-400 transition hover:text-neutral-700"
                >
                  ← Edit emails
                </button>
              </div>
              <p className="mt-1 text-sm text-neutral-500">
                Comparing {groupSize} {groupSize === 1 ? 'person' : 'people'}. We
                only show counts — never who liked what.
              </p>

              {overlap && overlap.votersWithLikes === 0 ? (
                <div className="mt-8 rounded-xl bg-neutral-50 p-8 text-center text-sm text-neutral-500">
                  Looks like your friends haven&apos;t voted yet — share the link
                  and come back!
                </div>
              ) : (
                sections && (
                  <div className="mt-6 flex flex-col gap-7">
                    {/* Global "no overlap" banner when nobody shares an idea. */}
                    {sections.popular.length === 0 &&
                      sections.everyone.length === 0 && (
                        <div className="rounded-xl bg-neutral-50 p-6 text-center text-sm text-neutral-500">
                          No overlap yet — but great minds think differently.
                          Check back as more people vote.
                        </div>
                      )}

                    {/* SECTION 1 — Everyone agrees */}
                    <section>
                      <h3
                        className="text-xs font-bold uppercase tracking-wide"
                        style={{ color: GOLD }}
                      >
                        ★ Everyone agrees
                      </h3>
                      {sections.everyone.length > 0 ? (
                        <div className="mt-2 flex flex-col gap-2">
                          {sections.everyone.map((e) => (
                            <ResultCard
                              key={e.idea.idea_key}
                              idea={e.idea}
                              count={e.count}
                              total={groupSize}
                              accent={GOLD}
                              onOpen={onOpenIdea}
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-neutral-400">
                          No ideas liked by everyone yet
                        </p>
                      )}
                    </section>

                    {/* SECTION 2 — Most popular in your group (only 3+ people) */}
                    {groupSize >= 3 && sections.popular.length > 0 && (
                      <section>
                        <h3
                          className="text-xs font-bold uppercase tracking-wide"
                          style={{ color: BLUE }}
                        >
                          Most popular in your group
                        </h3>
                        <div className="mt-2 flex flex-col gap-2">
                          {sections.popular.map((e) => (
                            <ResultCard
                              key={e.idea.idea_key}
                              idea={e.idea}
                              count={e.count}
                              total={groupSize}
                              accent={BLUE}
                              onOpen={onOpenIdea}
                            />
                          ))}
                        </div>
                      </section>
                    )}

                    {/* SECTION 3 — Only you liked this (collapsible) */}
                    {sections.onlyYou.length > 0 && (
                      <section>
                        <button
                          onClick={() => setShowOnlyYou((v) => !v)}
                          className="flex w-full items-center justify-between text-xs font-bold uppercase tracking-wide text-neutral-400 transition hover:text-neutral-600"
                        >
                          <span>
                            Only you liked this ({sections.onlyYou.length})
                          </span>
                          <span>{showOnlyYou ? '▲' : '▼'}</span>
                        </button>
                        {showOnlyYou && (
                          <div className="mt-2 flex flex-col gap-2">
                            {sections.onlyYou.map((idea) => (
                              <ResultCard
                                key={idea.idea_key}
                                idea={idea}
                                count={1}
                                total={groupSize}
                                accent="#D4D4D4"
                                onOpen={onOpenIdea}
                              />
                            ))}
                          </div>
                        )}
                      </section>
                    )}
                  </div>
                )
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
