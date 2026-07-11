export type SourceModel = 'fable5' | 'grok45' | 'gpt56sol'
export type Size = 's' | 'm' | 'l'
export type Field =
  | 'construction'
  | 'legal'
  | 'insurance'
  | 'medical'
  | 'finance'
  | 'operations'
  | 'other'

export interface Idea {
  idea_key: string
  source_model: SourceModel
  product_name: string
  one_liner: string
  what_it_does: string
  buyer: string
  how_they_find_you: string
  pricing: string
  biggest_risk: string
  excitement_score: number
  occupation: string
  model_consensus: string
  idea_number: number
  field: Field
  build_size: Size
  outreach_size: Size
  is_self_top25: boolean
  why_top_25: string | null
  is_cross_top25: boolean
  cross_judge_model: string | null
  cross_excitement: number | null
  cross_why_selected: string | null
  is_high_conviction: boolean
}

// Accent color per field (hex, used inline so Tailwind purging never drops them).
export const FIELD_COLORS: Record<Field, string> = {
  construction: '#F59E0B', // amber
  legal: '#EF4444', // red
  insurance: '#0EA5E9', // sky
  medical: '#10B981', // emerald
  finance: '#8B5CF6', // violet
  operations: '#F97316', // orange
  other: '#6B7280', // gray
}

export const FIELD_LABELS: Record<Field, string> = {
  construction: 'Construction',
  legal: 'Legal',
  insurance: 'Insurance',
  medical: 'Medical',
  finance: 'Finance',
  operations: 'Operations',
  other: 'Other',
}

export const FIELD_ORDER: Field[] = [
  'construction',
  'legal',
  'insurance',
  'medical',
  'finance',
  'operations',
  'other',
]

export const MODEL_LABELS: Record<SourceModel, string> = {
  fable5: 'Fable 5',
  grok45: 'Grok 4.5',
  gpt56sol: 'GPT-5.6 Sol',
}

// Raw judge_model values (as stored in the cross files) -> friendly labels.
export const JUDGE_LABELS: Record<string, string> = {
  'claude-fable-5': 'Fable 5',
  'grok-4.5': 'Grok 4.5',
  'gpt-5.6-sol': 'GPT-5.6 Sol',
}

export const BUILD_LABELS: Record<Size, string> = {
  s: 'S · 3–4 wks',
  m: 'M · 4–8 wks',
  l: 'L · 10+ wks',
}

export const OUTREACH_LABELS: Record<Size, string> = {
  s: 'Easy',
  m: 'Mid',
  l: 'Hard',
}

// Excitement score -> circle color: 10 gold, 9 blue, 8 teal, 7 and below gray.
export function scoreColor(score: number): string {
  if (score >= 10) return '#EAB308' // gold
  if (score === 9) return '#3B82F6' // blue
  if (score === 8) return '#14B8A6' // teal
  return '#9CA3AF' // gray
}

export function judgeLabel(raw: string | null): string {
  if (!raw) return ''
  return JUDGE_LABELS[raw] ?? raw
}
