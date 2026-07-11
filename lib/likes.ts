import { supabase, isSupabaseConfigured } from './supabase'

const VISITOR_KEY = 'visitor_id'
const LIKED_KEY = 'liked_ideas'
const VISITOR_EMAIL_KEY = 'visitor_email'

/**
 * The visitor id for this browser, or null if none is set yet. This is the
 * SHA-256 hash of the voter's email (same email → same hash → same id on any
 * device) or a random per-device id if they skipped the email prompt.
 */
export function getVisitorId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(VISITOR_KEY)
}

/** Whether this browser has a visitor id (i.e. the email prompt is answered). */
export function hasVisitorId(): boolean {
  return Boolean(getVisitorId())
}

/** Lowercase SHA-256 hex digest of `input`, via the Web Crypto API. */
async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * The canonical email → visitor_id hash. Normalizes case/whitespace, then
 * SHA-256s. This is the SAME value stored as `visitor_id` in the likes table,
 * so hashing an email here reproduces exactly what that person's likes are
 * keyed under. The raw email never leaves the browser.
 */
export function hashEmail(email: string): Promise<string> {
  return sha256Hex(email.trim().toLowerCase())
}

/**
 * Record a visitor id in the voters table (best-effort, dedup on visitor_id).
 * When a raw email is available it's stored alongside the hash so results can be
 * shared back to voters by email.
 */
async function registerVoter(visitorId: string, email?: string) {
  if (!isSupabaseConfigured) return
  const row: { visitor_id: string; email?: string } = { visitor_id: visitorId }
  if (email) row.email = email
  try {
    await supabase
      .from('voters')
      .upsert(row, { onConflict: 'visitor_id', ignoreDuplicates: true })
  } catch {
    // Network/permission failure — not fatal to liking.
  }
}

/**
 * Derive the visitor id from an email by hashing it (SHA-256). The hash keys the
 * visitor's likes; the raw email is also stored in the voters table so results
 * can be shared back by email. Normalizes case/whitespace so the same email
 * always yields the same id.
 */
export async function setVisitorFromEmail(email: string): Promise<string> {
  const rawEmail = email.trim()
  const hash = await hashEmail(email)
  localStorage.setItem(VISITOR_KEY, hash)
  // Remember the raw email locally so we can show a masked hint of it.
  localStorage.setItem(VISITOR_EMAIL_KEY, rawEmail)
  await registerVoter(hash, rawEmail)
  return hash
}

/** The raw email this visitor entered, or null if they skipped. Client-only. */
export function getVisitorEmail(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(VISITOR_EMAIL_KEY)
}

/**
 * Skip the email prompt: mint a random per-device visitor id so likes still
 * dedupe on this browser and we don't ask again. Not shareable across devices.
 */
export function setVisitorSkip(): string {
  const id = crypto.randomUUID()
  localStorage.setItem(VISITOR_KEY, id)
  registerVoter(id)
  return id
}

/** The set of idea_keys this browser has liked. */
export function getLikedIdeas(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(LIKED_KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

function saveLikedIdeas(liked: Set<string>) {
  localStorage.setItem(LIKED_KEY, JSON.stringify([...liked]))
}

/**
 * Fetch like counts per idea_key. Sums rows client-side (no SQL group-by needed).
 * Returns an empty map if Supabase isn't configured or the call fails.
 */
export async function fetchLikeCounts(): Promise<Record<string, number>> {
  if (!isSupabaseConfigured) return {}
  try {
    const { data, error } = await supabase.from('likes').select('idea_key')
    if (error || !data) return {}
    const counts: Record<string, number> = {}
    for (const row of data as { idea_key: string }[]) {
      counts[row.idea_key] = (counts[row.idea_key] ?? 0) + 1
    }
    return counts
  } catch {
    return {}
  }
}

/**
 * Toggle a like for an idea. Updates localStorage immediately (optimistic) and
 * best-effort syncs to Supabase. Returns the new liked state for this browser.
 */
export async function toggleLike(ideaKey: string): Promise<boolean> {
  const liked = getLikedIdeas()
  const nowLiked = !liked.has(ideaKey)

  if (nowLiked) liked.add(ideaKey)
  else liked.delete(ideaKey)
  saveLikedIdeas(liked)

  const visitorId = getVisitorId()
  if (isSupabaseConfigured && visitorId) {
    try {
      if (nowLiked) {
        await supabase
          .from('likes')
          .upsert(
            { idea_key: ideaKey, visitor_id: visitorId },
            { onConflict: 'idea_key,visitor_id', ignoreDuplicates: true }
          )
      } else {
        await supabase
          .from('likes')
          .delete()
          .eq('idea_key', ideaKey)
          .eq('visitor_id', visitorId)
      }
    } catch {
      // Network/permission failure — localStorage still reflects the change.
    }
  }

  return nowLiked
}
