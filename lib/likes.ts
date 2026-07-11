import { supabase, isSupabaseConfigured } from './supabase'

const VISITOR_KEY = 'visitor_id'
const LIKED_KEY = 'liked_ideas'

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

/** Record a visitor id in the voters table (best-effort, dedup on visitor_id). */
async function registerVoter(visitorId: string) {
  if (!isSupabaseConfigured) return
  try {
    await supabase
      .from('voters')
      .upsert({ visitor_id: visitorId }, { onConflict: 'visitor_id', ignoreDuplicates: true })
  } catch {
    // Network/permission failure — not fatal to liking.
  }
}

/**
 * Derive the visitor id from an email by hashing it (SHA-256). The raw email is
 * never stored — only the hash is persisted locally and registered as a voter.
 * Normalizes case/whitespace so the same email always yields the same id.
 */
export async function setVisitorFromEmail(email: string): Promise<string> {
  const hash = await sha256Hex(email.trim().toLowerCase())
  localStorage.setItem(VISITOR_KEY, hash)
  await registerVoter(hash)
  return hash
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
