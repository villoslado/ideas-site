import { supabase, isSupabaseConfigured } from './supabase'

const VISITOR_KEY = 'visitor_id'
const LIKED_KEY = 'liked_ideas'

/** Stable per-browser visitor id, generated once and persisted in localStorage. */
export function getVisitorId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem(VISITOR_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(VISITOR_KEY, id)
  }
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

  if (isSupabaseConfigured) {
    const visitorId = getVisitorId()
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
