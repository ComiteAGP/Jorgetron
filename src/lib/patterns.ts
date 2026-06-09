import type { ShiftDay } from './calculations'

export interface ShiftTemplate {
  id: string; user_id: string; code: string; label: string
  entry1: string | null; exit1: string | null; entry2: string | null; exit2: string | null; color: string
}

export interface ShiftPattern {
  id: string; user_id: string; name: string; start_date: string
  date_from: string; date_to: string | null; sequence: string[]
  weekday_overrides?: Record<string, string> | null
}

export interface ResolvedShift {
  templateId: string; code: string; label: string; color: string
  entry1: string | null; exit1: string | null; entry2: string | null; exit2: string | null
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000)
}

export function findPatternFor(date: string, patterns: ShiftPattern[]): ShiftPattern | null {
  return patterns.find((p) => date >= p.date_from && (!p.date_to || date <= p.date_to)) ?? null
}

export function resolveShiftForDate(date: string, patterns: ShiftPattern[], templatesById: Map<string, ShiftTemplate>): ResolvedShift | null {
  const p = findPatternFor(date, patterns)
  if (!p || p.sequence.length === 0) return null
  const dow = new Date(date + 'T00:00:00').getDay()
  const ov = p.weekday_overrides?.[String(dow)]
  let tid: string | undefined
  if (ov) { tid = ov } else {
    const offset = daysBetween(p.start_date, date)
    const len = p.sequence.length
    tid = p.sequence[((offset % len) + len) % len]
  }
  const t = tid ? templatesById.get(tid) : undefined
  if (!t) return null
  return { templateId: t.id, code: t.code, label: t.label, color: t.color, entry1: t.entry1, exit1: t.exit1, entry2: t.entry2, exit2: t.exit2 }
}

export function resolvedToShiftDay(date: string, r: ResolvedShift): ShiftDay {
  return { shift_date: date, entry1: r.entry1, exit1: r.exit1, real_exit1: r.exit1, entry2: r.entry2, exit2: r.exit2, real_exit2: r.exit2 }
}

export function mergeDays(dates: string[], shiftsByDate: Map<string, ShiftDay>, patterns: ShiftPattern[], templatesById: Map<string, ShiftTemplate>): { day: ShiftDay; isAuto: boolean; resolved: ResolvedShift | null }[] {
  return dates.map((date) => {
    const override = shiftsByDate.get(date)
    if (override) return { day: override, isAuto: false, resolved: null }
    const resolved = resolveShiftForDate(date, patterns, templatesById)
    if (resolved) return { day: resolvedToShiftDay(date, resolved), isAuto: true, resolved }
    return { day: { shift_date: date }, isAuto: false, resolved: null }
  })
}

export interface PatternBlock { days: number; templateId: string }
export function expandBlocks(blocks: PatternBlock[]): string[] {
  const out: string[] = []
  for (const b of blocks) for (let i = 0; i < b.days; i++) out.push(b.templateId)
  return out
}
