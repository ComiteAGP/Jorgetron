import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { calcMonth, formatEur, formatHours, type ShiftDay, type UserVariables } from '@/lib/calculations'
import { isHoliday, holidayName } from '@/lib/holidays'
import { mergeDays, type ShiftPattern, type ShiftTemplate } from '@/lib/patterns'
import { PatternsPanel } from '@/components/PatternsPanel'
import { ChevronLeft, ChevronRight, Settings, LogOut, Users, Calendar, Repeat } from 'lucide-react'
import { toast } from 'sonner'

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DOW = ['L','M','X','J','V','S','D']

export default function AppPage() {
  const { session, loading, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'calendar' | 'variables' | 'patterns' | 'admin'>('calendar')
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [shifts, setShifts] = useState<ShiftDay[]>([])
  const [vars, setVars] = useState<UserVariables | null>(null)
  const [editingDate, setEditingDate] = useState<string | null>(null)
  const [templates, setTemplates] = useState<ShiftTemplate[]>([])
  const [patterns, setPatterns] = useState<ShiftPattern[]>([])
  const [viewUserId, setViewUserId] = useState<string | null>(null)
  const [allUsers, setAllUsers] = useState<{ id: string; full_name: string }[]>([])

  useEffect(() => {
    if (!loading && !session) navigate('/login')
  }, [loading, session, navigate])

  const targetUserId = viewUserId ?? session?.user.id ?? null

  useEffect(() => {
    if (!targetUserId) return
    ;(async () => {
      const { data: v } = await supabase.from('user_variables').select('*').eq('user_id', targetUserId).maybeSingle()
      if (v) setVars(v as UserVariables)
      const from = `${year}-${String(month + 1).padStart(2, '0')}-01`
      const lastDay = new Date(year, month + 1, 0).getDate()
      const to = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
      const { data: s } = await supabase.from('shifts').select('*').eq('user_id', targetUserId).gte('shift_date', from).lte('shift_date', to)
      setShifts((s ?? []) as ShiftDay[])
    })()
  }, [targetUserId, year, month])

  useEffect(() => {
    if (!targetUserId) return
    ;(async () => {
      const [{ data: t }, { data: p }] = await Promise.all([
        supabase.from('shift_templates').select('*').eq('user_id', targetUserId).order('code'),
        supabase.from('shift_patterns').select('*').eq('user_id', targetUserId).order('date_from'),
      ])
      setTemplates((t ?? []) as ShiftTemplate[])
      setPatterns((p ?? []) as ShiftPattern[])
    })()
  }, [targetUserId])

  useEffect(() => {
    if (!isAdmin) return
    supabase.from('profiles').select('id, full_name').then(({ data }) => {
      if (data) setAllUsers(data)
    })
  }, [isAdmin])

  const tplMap = useMemo(() => new Map(templates.map((t) => [t.id, t])), [templates])

  const mergedMonth = useMemo(() => {
    const lastDay = new Date(year, month + 1, 0).getDate()
    const dates: string[] = []
    for (let d = 1; d <= lastDay; d++) dates.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
    const shiftsByDate = new Map(shifts.map((s) => [s.shift_date, s]))
    return mergeDays(dates, shiftsByDate, patterns, tplMap)
  }, [shifts, patterns, tplMap, year, month])

  const summary = useMemo(() => {
    if (!vars) return null
    return calcMonth(mergedMonth.map((m) => m.day), vars, year, month)
  }, [mergedMonth, vars, year, month])

  const editingShift = editingDate
    ? (shifts.find((s) => s.shift_date === editingDate) ?? mergedMonth.find((m) => m.day.shift_date === editingDate)?.day ?? { shift_date: editingDate })
    : null
  const editingIsAuto = editingDate ? !shifts.some((s) => s.shift_date === editingDate) && mergedMonth.some((m) => m.day.shift_date === editingDate && m.isAuto) : false
  const readOnly = !!viewUserId && viewUserId !== session?.user.id

  const onSaveShift = async (data: ShiftDay) => {
    if (!session) return
    const payload = { ...data, user_id: session.user.id }
    const { error } = await supabase.from('shifts').upsert(payload, { onConflict: 'user_id,shift_date' })
    if (error) { toast.error(error.message); return }
    toast.success('Día guardado')
    setShifts((prev) => {
      const idx = prev.findIndex((s) => s.shift_date === data.shift_date)
      if (idx >= 0) { const next = [...prev]; next[idx] = data; return next }
      return [...prev, data]
    })
    setEditingDate(null)
  }

  const onDeleteShift = async (date: string) => {
    if (!session) return
    await supabase.from('shifts').delete().eq('user_id', session.user.id).eq('shift_date', date)
    setShifts((prev) => prev.filter((s) => s.shift_date !== date))
    setEditingDate(null)
    toast.success('Día borrado')
  }

  if (loading || !session) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Cargando…</div>

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
         <Link to="/" className="flex items-center gap-3">
            <img src="/logo-ccoo.svg" alt="CCOO" style={{height:'32px'}} />
            <span style={{color:'#CC0000', fontWeight:900, fontSize:'1.2rem', fontFamily:'Arial Black, sans-serif'}}>Jorgetron</span>
          </Link>
          <nav className="flex gap-1 bg-secondary rounded-lg p-1">
            <button onClick={() => setTab('calendar')} className={`px-3 py-1.5 text-sm rounded-md transition ${tab === 'calendar' ? 'bg-card shadow-sm' : ''}`}>
              <Calendar className="h-4 w-4 inline mr-1" /> Calendario
            </button>
            <button onClick={() => setTab('patterns')} className={`px-3 py-1.5 text-sm rounded-md transition ${tab === 'patterns' ? 'bg-card shadow-sm' : ''}`}>
              <Repeat className="h-4 w-4 inline mr-1" /> Patrones
            </button>
            <button onClick={() => setTab('variables')} className={`px-3 py-1.5 text-sm rounded-md transition ${tab === 'variables' ? 'bg-card shadow-sm' : ''}`}>
              <Settings className="h-4 w-4 inline mr-1" /> Variables
            </button>
            {isAdmin && (
              <button onClick={() => setTab('admin')} className={`px-3 py-1.5 text-sm rounded-md transition ${tab === 'admin' ? 'bg-card shadow-sm' : ''}`}>
                <Users className="h-4 w-4 inline mr-1" /> Admin
              </button>
            )}
          </nav>
          <button onClick={signOut} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
            <LogOut className="h-4 w-4" /> Salir
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {tab === 'calendar' && (
          <>
            {viewUserId && (
              <div className="mb-4 flex items-center gap-2 text-sm bg-accent/10 border border-accent/30 rounded-lg px-3 py-2">
                <Users className="h-4 w-4" />
                Viendo a: <strong>{allUsers.find(u => u.id === viewUserId)?.full_name ?? '—'}</strong>
                <button onClick={() => setViewUserId(null)} className="ml-auto text-accent font-medium">Volver a mí</button>
              </div>
            )}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <button onClick={() => { const m = month - 1; if (m < 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m) }} className="p-2 hover:bg-secondary rounded-lg"><ChevronLeft className="h-4 w-4" /></button>
                <h2 className="text-xl font-bold w-44 text-center">{MONTHS[month]} {year}</h2>
                <button onClick={() => { const m = month + 1; if (m > 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m) }} className="p-2 hover:bg-secondary rounded-lg"><ChevronRight className="h-4 w-4" /></button>
              </div>
              <button onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()) }} className="text-sm text-muted-foreground hover:text-foreground">Hoy</button>
            </div>
            <div className="grid lg:grid-cols-[1fr_360px] gap-6">
              <CalendarGrid year={year} month={month} merged={mergedMonth} onPick={(d) => !readOnly && setEditingDate(d)} />
              {summary && vars && <SummaryPanel s={summary} v={vars} />}
            </div>
          </>
        )}

        {tab === 'patterns' && (
          <PatternsPanel userId={session.user.id} templates={templates} patterns={patterns} onTemplatesChange={setTemplates} onPatternsChange={setPatterns} />
        )}

        {tab === 'variables' && vars && (
          <VariablesPanel vars={vars} userId={targetUserId!} templates={templates} patterns={patterns} onSaved={(v) => setVars(v)} canEdit={isAdmin} />
        )}

        {tab === 'admin' && isAdmin && (
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4">Trabajadores</h2>
            <div className="space-y-2">
              {allUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div>{u.full_name || '(sin nombre)'}</div>
                  <button onClick={() => { setViewUserId(u.id); setTab('calendar') }} className="text-sm text-accent font-medium hover:underline">Ver turnos →</button>
                </div>
              ))}
              {allUsers.length === 0 && <p className="text-sm text-muted-foreground">No hay trabajadores aún.</p>}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Para hacer admin a un usuario, añade una fila en la tabla user_roles con role='admin'.</p>
          </div>
        )}
      </main>

      {editingShift && (
        <DayEditor shift={editingShift} isAuto={editingIsAuto} onClose={() => setEditingDate(null)} onSave={onSaveShift} onDelete={() => onDeleteShift(editingShift.shift_date)} />
      )}
    </div>
  )
}

function CalendarGrid({ year, month, merged, onPick }: { year: number; month: number; merged: { day: ShiftDay; isAuto: boolean; resolved: { color: string; code: string } | null }[]; onPick: (date: string) => void }) {
  const first = new Date(year, month, 1)
  const startDow = (first.getDay() + 6) % 7
  const lastDay = new Date(year, month + 1, 0).getDate()
  const cells: ({ date: string; day: number } | null)[] = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= lastDay; d++) cells.push({ date: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, day: d })
  const map = new Map(merged.map((m) => [m.day.shift_date, m]))

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="grid grid-cols-7 gap-1 mb-2">
        {DOW.map((d) => <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, i) => {
          if (!c) return <div key={i} />
          const m = map.get(c.date)
          const s = m?.day
          const date = new Date(c.date + 'T00:00:00')
          const isSun = date.getDay() === 0
          const isFes = isHoliday(c.date)
          const hasShift = s && (s.entry1 || s.is_vacaciones || s.is_baja)
          let bg = ''
          if (s?.is_baja) bg = 'bg-baja'
          else if (s?.is_vacaciones) bg = 'bg-vacaciones'
          else if (isFes) bg = 'bg-festivo'
          else if (isSun) bg = 'bg-sunday'
          return (
            <button key={c.date} onClick={() => onPick(c.date)} className={`relative aspect-square rounded-lg border border-border text-left p-1.5 hover:border-accent transition ${bg} ${hasShift && !m?.isAuto ? 'ring-1 ring-accent/40' : ''}`} style={m?.isAuto && m.resolved ? { borderColor: m.resolved.color, borderWidth: 2 } : undefined}>
              <div className="flex items-start justify-between">
                <div className="text-xs font-semibold">{c.day}</div>
                {m?.isAuto && m.resolved && <span className="text-[9px] font-bold text-white px-1 rounded" style={{ backgroundColor: m.resolved.color }}>{m.resolved.code}</span>}
              </div>
              {s?.is_baja ? (
                <div className="text-[10px] font-semibold mt-1">Baja</div>
              ) : s?.is_vacaciones ? (
                <>
                  <div className="text-[10px] font-semibold mt-1">Vac.</div>
                  {s.entry1 && <div className="text-[10px] text-foreground/70 leading-tight">{s.entry1}–{s.real_exit1 || s.exit1}{s.entry2 && <div>{s.entry2}–{s.real_exit2 || s.exit2}</div>}</div>}
                </>
              ) : s?.entry1 ? (
                <div className={`text-[10px] mt-1 leading-tight ${m?.isAuto ? 'text-foreground/60' : 'text-foreground/70'}`}>
                  {s.entry1}–{s.real_exit1 || s.exit1}
                  {s.entry2 && <div>{s.entry2}–{s.real_exit2 || s.exit2}</div>}
                </div>
              ) : null}
            </button>
          )
        })}
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">Los días con borde de color provienen de un patrón. Al editarlos se guarda un cambio sólo para ese día.</p>
    </div>
  )
}

function SummaryPanel({ s, v }: { s: ReturnType<typeof calcMonth>; v: UserVariables }) {
  const Row = ({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) => (
    <div className="flex justify-between items-baseline py-2 border-b border-border last:border-0">
      <div><div className="text-sm">{label}</div>{sub && <div className="text-xs text-muted-foreground">{sub}</div>}</div>
      <div className={`text-sm font-semibold tabular-nums ${accent ? 'text-accent' : ''}`}>{value}</div>
    </div>
  )
  return (
    <aside className="bg-card border border-border rounded-2xl p-5 h-fit lg:sticky lg:top-24">
      <h3 className="font-bold text-lg mb-1" style={{ fontFamily: 'Sora, sans-serif' }}>Resumen mensual</h3>
      <p className="text-xs text-muted-foreground mb-4">Jornada al {v.porcentaje_jornada}%</p>
      <div className="rounded-xl bg-primary text-primary-foreground p-4 mb-4">
        <div className="text-xs opacity-80">Total a cobrar (variables)</div>
        <div className="text-3xl font-bold tabular-nums mt-1">{formatEur(s.importeTotal)}</div>
      </div>
      <div className="mb-4">
        <Row label="Horas jornada" sub="No incluye perentorias" value={formatHours(s.horasJornada)} />
        <Row label="Objetivo mensual" value={formatHours(s.horasMensualesObjetivo)} />
        <Row label="% jornada cumplido" value={`${s.porcentajeJornadaCumplido.toFixed(1)}%`} accent />
        <Row label="Total horas (con perentorias)" value={formatHours(s.totalHoras)} />
      </div>
      <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-2 mt-6">Pluses</h4>
      <Row label="Plus domingo" sub={`${formatHours(s.horasDomingo)} × ${formatEur(v.plus_domingo)}`} value={formatEur(s.importePlusDomingo)} />
      <Row label="Plus festivo" sub={`${formatHours(s.horasFestivo)} × ${formatEur(v.plus_festivo)}`} value={formatEur(s.importePlusFestivo)} />
      <Row label="Nocturnidad" sub={`${formatHours(s.horasNocturnas)} × ${formatEur(v.plus_nocturnidad)}`} value={formatEur(s.importePlusNocturnidad)} />
      <Row label="Madrugue" sub={`${s.numMadrugues} días × ${formatEur(v.madrugue)}`} value={formatEur(s.importeMadrugue)} />
      <Row label="Jornada partida" sub={`${s.numJornadasPartidas} días × ${formatEur(v.jornada_partida)}`} value={formatEur(s.importeJornadaPartida)} />
      <Row label="Perentoria diurna" sub={`${formatHours(s.extrasDiurnas)} × ${formatEur(v.extra_diurna_perentoria)}`} value={formatEur(s.importeExtrasDiurnas)} />
      <Row label="Perentoria nocturna" sub={`${formatHours(s.extrasNocturnas)} × ${formatEur(v.extra_nocturna_perentoria)}`} value={formatEur(s.importeExtrasNocturnas)} />
      <Row label="Dietas" sub={`${s.numDietas} × ${formatEur(v.dieta)}`} value={formatEur(s.importeDietas)} />
      <Row label="Transporte" sub={`${s.diasTrabajados} días × ${formatEur(v.transporte)}`} value={formatEur(s.importeTransporte)} />
      <Row label="Turnicidad" sub={s.nivelTurnicidad > 0 ? `Nivel ${s.nivelTurnicidad} (${s.numTurnosDistintos} turnos distintos)` : `${s.numTurnosDistintos} turnos distintos`} value={formatEur(s.importeTurnicidad)} />
      {v.contrato_parcial && <Row label="Plus tiempo parcial" sub={`${s.porcentajeJornadaCumplido.toFixed(1)}% de ${formatEur(v.turnicidad_parcial)}`} value={formatEur(s.importePlusParcial)} />}
      {(v.rol_psm_dsm !== 'none' || s.psmHorasMes > 0 || s.dsmHorasMes > 0) && (
        <>
          <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-2 mt-6">PSM / DSM</h4>
          {v.rol_psm_dsm === 'psm' && <Row label="Rol base PSM" sub={`${s.porcentajeJornadaCumplido.toFixed(1)}% de ${formatEur(v.plus_psm)}/mes`} value={formatEur(s.importePsmBase)} />}
          {v.rol_psm_dsm === 'dsm' && <Row label="Rol base DSM" sub={`${s.porcentajeJornadaCumplido.toFixed(1)}% de ${formatEur(v.plus_dsm)}/mes`} value={formatEur(s.importeDsmBase)} />}
          {s.psmHorasMes > 0 && v.rol_psm_dsm !== 'psm' && <Row label="Horas PSM puntuales" sub={`${formatHours(s.psmHorasMes)} × ${formatEur(v.plus_psm / 155.63)}/h`} value={formatEur(s.importePsmDia)} />}
          {s.dsmHorasMes > 0 && v.rol_psm_dsm !== 'dsm' && <Row label="Horas DSM puntuales" sub={`${formatHours(s.dsmHorasMes)} × ${formatEur(v.rol_psm_dsm === 'psm' ? Math.max(v.plus_dsm - v.plus_psm, 0) / 155.63 : v.plus_dsm / 155.63)}/h`} value={formatEur(s.importeDsmDia)} />}
        </>
      )}
      {s.vacacionesDias > 0 && <div className="mt-3 text-xs text-muted-foreground">{s.vacacionesDias} días de vacaciones</div>}
    </aside>
  )
}

function DayEditor({ shift, isAuto, onClose, onSave, onDelete }: { shift: ShiftDay; isAuto?: boolean; onClose: () => void; onSave: (s: ShiftDay) => void; onDelete: () => void }) {
  const [form, setForm] = useState<ShiftDay>(shift)
  const upd = (k: keyof ShiftDay, v: any) => setForm((f) => ({ ...f, [k]: v }))
  const dateLabel = new Date(form.shift_date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-border">
          <h2 className="font-bold text-lg capitalize">{dateLabel}</h2>
          {holidayName(form.shift_date) && <p className="text-xs font-semibold mt-1 inline-block bg-festivo px-2 py-0.5 rounded">Festivo: {holidayName(form.shift_date)}</p>}
          {isAuto && <p className="text-xs text-muted-foreground mt-1">Día generado por un patrón. Si lo guardas, se creará un cambio sólo para este día.</p>}
        </div>
        <div className="p-5 space-y-4">
          <div className="flex gap-3 flex-wrap">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.is_vacaciones} onChange={(e) => upd('is_vacaciones', e.target.checked)} /> Vacaciones</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.is_dia_extra} onChange={(e) => upd('is_dia_extra', e.target.checked)} /> Día extra</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.is_baja} onChange={(e) => upd('is_baja', e.target.checked)} /> Baja</label>
          </div>
          {form.is_vacaciones && <p className="text-xs text-muted-foreground">En vacaciones se cobra el turno (cuenta para la jornada) pero no se generan variables.</p>}
          <div>
            <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Bloque 1</h4>
            <div className="grid grid-cols-3 gap-2">
              <TimeField label="Entrada" v={form.entry1} onChange={(v) => upd('entry1', v)} />
              <TimeField label="Salida prog." v={form.exit1} onChange={(v) => upd('exit1', v)} />
              <TimeField label="Salida real" v={form.real_exit1} onChange={(v) => upd('real_exit1', v)} />
            </div>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Bloque 2 (jornada partida)</h4>
            <div className="grid grid-cols-3 gap-2">
              <TimeField label="Entrada" v={form.entry2} onChange={(v) => upd('entry2', v)} />
              <TimeField label="Salida prog." v={form.exit2} onChange={(v) => upd('exit2', v)} />
              <TimeField label="Salida real" v={form.real_exit2} onChange={(v) => upd('real_exit2', v)} />
            </div>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">PSM / DSM (sólo este día)</h4>
            <div className="flex gap-2 flex-wrap">
              {[{ v: 'none', l: 'Ninguno' }, { v: 'psm', l: 'PSM' }, { v: 'dsm', l: 'DSM' }].map((opt) => {
                const cur = form.psm_dsm ?? 'none'
                return <button key={opt.v} type="button" onClick={() => upd('psm_dsm', opt.v as any)} className={`px-3 py-1.5 rounded-md text-xs font-medium border ${cur === opt.v ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-input'}`}>{opt.l}</button>
              })}
            </div>
            {(form.psm_dsm === 'psm' || form.psm_dsm === 'dsm') && (
              <label className="block mt-2">
                <span className="text-xs text-muted-foreground">Horas de {form.psm_dsm.toUpperCase()} (vacío = turno completo)</span>
                <input type="number" step="0.25" min="0" value={form.psm_dsm_horas ?? ''} onChange={(e) => upd('psm_dsm_horas', e.target.value === '' ? null : parseFloat(e.target.value))} className="mt-1 w-full px-2 py-1.5 rounded-md border border-input bg-background text-sm" />
              </label>
            )}
          </div>
        </div>
        <div className="p-5 border-t border-border flex gap-2 justify-between">
          <button onClick={onDelete} className="text-sm text-destructive hover:underline">Borrar</button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-secondary">Cancelar</button>
            <button onClick={() => onSave(form)} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-medium">Guardar</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function TimeField({ label, v, onChange }: { label: string; v?: string | null; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input type="time" value={v ?? ''} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full px-2 py-1.5 rounded-md border border-input bg-background text-sm" />
    </label>
  )
}

function VariablesPanel({ vars, userId, templates, patterns, onSaved, canEdit }: { vars: UserVariables; userId: string; templates: ShiftTemplate[]; patterns: ShiftPattern[]; onSaved: (v: UserVariables) => void; canEdit: boolean }) {
  const [form, setForm] = useState(vars)
  const [year, setYear] = useState(new Date().getFullYear())
  const [yearShifts, setYearShifts] = useState<ShiftDay[]>([])
  const upd = (k: keyof UserVariables, v: number) => setForm((f) => ({ ...f, [k]: v }))

 const saveField = async (patch: Partial<UserVariables>) => {
    const updated = { ...form, ...patch }
    setForm(updated)
    const { error } = await supabase.from('user_variables').update(patch).eq('user_id', userId)
    if (error) { 
      toast.error(error.message)
      setForm(form)
      return
    }
    toast.success('Guardado')
    onSaved(updated)
  }

const save = async () => {
    if (!canEdit) return
    const { contrato_parcial, rol_psm_dsm, ...sharedFields } = form
    const { error } = await supabase.from('user_variables').update(sharedFields).neq('user_id', '00000000-0000-0000-0000-000000000000')
    if (error) toast.error(error.message)
    else { toast.success('Variables guardadas para todos los trabajadores'); onSaved(form) }
  }

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.from('shifts').select('*').eq('user_id', userId).gte('shift_date', `${year}-01-01`).lte('shift_date', `${year}-12-31`)
      setYearShifts((data ?? []) as ShiftDay[])
    })()
  }, [userId, year])

  const tplMap = useMemo(() => new Map(templates.map((t) => [t.id, t])), [templates])
const yearStats = useMemo(() => {
    const map = new Map(yearShifts.map((s) => [s.shift_date, s]))
    let totalHoras = 0
    for (let m = 0; m < 12; m++) {
      const lastDay = new Date(year, m + 1, 0).getDate()
      const dates: string[] = []
      for (let d = 1; d <= lastDay; d++) dates.push(`${year}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
      const merged = mergeDays(dates, map, patterns, tplMap)
     const monthSummary = calcMonth(merged.map((mm) => mm.day), vars, year, m)
      const vacacionesHoras = monthSummary.days.filter((d) => d.isVacaciones).reduce((a, d) => a + d.workedHours, 0)
      const horasMes = vars.contrato_parcial 
        ? monthSummary.totalHoras - vacacionesHoras
        : monthSummary.horasJornada - vacacionesHoras
      totalHoras += horasMes
    }
    const objetivo = vars.jornada_anual_horas * (vars.porcentaje_jornada / 100)
    return { totalHoras, objetivo, pct: objetivo > 0 ? (totalHoras / objetivo) * 100 : 0 }
  }, [yearShifts, patterns, tplMap, vars, year])

  const groups = [
    { title: 'Pluses por hora', fields: [{ k: 'plus_domingo' as keyof UserVariables, l: 'Plus domingo' }, { k: 'plus_festivo' as keyof UserVariables, l: 'Plus festivo' }, { k: 'plus_nocturnidad' as keyof UserVariables, l: 'Plus nocturnidad' }] },
    { title: 'Pluses por día/evento', fields: [{ k: 'madrugue' as keyof UserVariables, l: 'Madrugue' }, { k: 'jornada_partida' as keyof UserVariables, l: 'Jornada partida' }, { k: 'dieta' as keyof UserVariables, l: 'Dieta' }] },
    { title: 'Horas perentorias', fields: [{ k: 'extra_diurna_perentoria' as keyof UserVariables, l: 'Perentoria diurna' }, { k: 'extra_nocturna_perentoria' as keyof UserVariables, l: 'Perentoria nocturna' }] },
    { title: 'Transporte', fields: [{ k: 'transporte' as keyof UserVariables, l: 'Transporte (€/día trabajado)' }] },
    { title: 'Turnicidad (€/mes)', fields: [{ k: 'turnicidad_2' as keyof UserVariables, l: '2 turnos distintos' }, { k: 'turnicidad_3' as keyof UserVariables, l: '3 turnos distintos' }, { k: 'turnicidad_4' as keyof UserVariables, l: '4 turnos distintos' }, { k: 'turnicidad_5' as keyof UserVariables, l: '5 turnos distintos' }, { k: 'turnicidad_parcial' as keyof UserVariables, l: 'Tiempo parcial (€/mes)' }] },
    { title: 'PSM / DSM (€/mes)', fields: [{ k: 'plus_psm' as keyof UserVariables, l: 'Plus PSM (€/mes)' }, { k: 'plus_dsm' as keyof UserVariables, l: 'Plus DSM (€/mes)' }] },
    { title: 'Jornada', fields: [{ k: 'jornada_anual_horas' as keyof UserVariables, l: 'Horas anuales' }, { k: 'salario_anual' as keyof UserVariables, l: 'Salario anual' }, { k: 'porcentaje_jornada' as keyof UserVariables, l: '% de jornada' }] },
  ]

  return (
    <div className="max-w-3xl">
      <h2 className="text-xl font-bold mb-1">Variables</h2>
      <p className="text-sm text-muted-foreground mb-4">Ajusta los precios de tus pluses y tu jornada.</p>
      {!canEdit && <div className="mb-6 rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">Sólo el administrador puede modificar los valores. Puedes consultarlos en modo lectura.</div>}
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold">Resumen anual</h3>
            <div className="flex items-center gap-1">
              <button onClick={() => setYear((y) => y - 1)} className="p-1 hover:bg-white/10 rounded"><ChevronLeft className="h-4 w-4" /></button>
              <span className="text-sm font-semibold w-12 text-center">{year}</span>
              <button onClick={() => setYear((y) => y + 1)} className="p-1 hover:bg-white/10 rounded"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div><div className="text-xs opacity-80">Horas trabajadas</div><div className="text-lg font-bold">{formatHours(yearStats.totalHoras)}</div></div>
            <div><div className="text-xs opacity-80">Jornada anual</div><div className="text-lg font-bold">{formatHours(yearStats.objetivo)}</div></div>
            <div><div className="text-xs opacity-80">% cumplido</div><div className="text-lg font-bold">{yearStats.pct.toFixed(1)}%</div></div>
          </div>
          <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white" style={{ width: `${Math.min(yearStats.pct, 100)}%` }} />
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-bold mb-3">Tipo de contrato</h3>
          <div className="flex gap-2">
            {[{ v: false, l: 'Tiempo completo' }, { v: true, l: 'Tiempo parcial' }].map((opt) => (
              <button key={String(opt.v)} type="button" disabled={false} onClick={() => saveField({ contrato_parcial: opt.v })} className={`px-4 py-2 rounded-lg text-sm font-medium border disabled:opacity-60 disabled:cursor-not-allowed ${form.contrato_parcial === opt.v ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-input'}`}>{opt.l}</button>
            ))}
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-bold mb-3">Rol PSM / DSM</h3>
          <div className="flex gap-2 flex-wrap">
            {[{ v: 'none', l: 'Ninguno' }, { v: 'psm', l: 'PSM (175 €/mes)' }, { v: 'dsm', l: 'DSM (300 €/mes)' }].map((opt) => (
              <button key={opt.v} type="button" disabled={false} onClick={() => saveField({ rol_psm_dsm: opt.v as any })} className={`px-4 py-2 rounded-lg text-sm font-medium border disabled:cursor-not-allowed ${(form.rol_psm_dsm ?? 'none') === opt.v ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-input'}`}>{opt.l}</button>
            ))}
          </div>
        </div>
        {groups.map((g) => (
          <div key={g.title} className="bg-card border border-border rounded-2xl p-5">
            <h3 className="font-bold mb-3">{g.title}</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {g.fields.map((f) => (
                <label key={f.k} className="block">
                  <span className="text-xs text-muted-foreground">{f.l}</span>
                  <input type="number" step="0.01" value={form[f.k] as number} readOnly={!canEdit} onChange={(e) => upd(f.k, parseFloat(e.target.value) || 0)} className="mt-1 w-full px-2 py-1.5 rounded-md border border-input bg-background text-sm disabled:opacity-70 disabled:cursor-not-allowed" />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      {canEdit && <button onClick={save} className="mt-6 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium">Guardar cambios</button>}
    </div>
  )
}
