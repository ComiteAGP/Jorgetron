import { useMemo, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { Plus, Trash2, ChevronUp, ChevronDown, Pencil, X } from 'lucide-react'
import type { ShiftTemplate, ShiftPattern, PatternBlock } from '@/lib/patterns'
import { expandBlocks } from '@/lib/patterns'

interface Props {
  userId: string
  templates: ShiftTemplate[]
  patterns: ShiftPattern[]
  onTemplatesChange: (t: ShiftTemplate[]) => void
  onPatternsChange: (p: ShiftPattern[]) => void
}

const DEFAULT_TEMPLATES: Omit<ShiftTemplate, 'id' | 'user_id'>[] = [
  { code: 'M', label: 'Mañana', entry1: '06:00', exit1: '14:00', entry2: null, exit2: null, color: '#fbbf24' },
  { code: 'T', label: 'Tarde', entry1: '14:00', exit1: '22:00', entry2: null, exit2: null, color: '#f97316' },
  { code: 'N', label: 'Noche', entry1: '22:00', exit1: '06:00', entry2: null, exit2: null, color: '#6366f1' },
  { code: 'D', label: 'Descanso', entry1: null, exit1: null, entry2: null, exit2: null, color: '#94a3b8' },
]

export function PatternsPanel({ userId, templates, patterns, onTemplatesChange, onPatternsChange }: Props) {
  const [editingTemplate, setEditingTemplate] = useState<Partial<ShiftTemplate> | null>(null)
  const [editingPattern, setEditingPattern] = useState<Partial<ShiftPattern> & { _blocks?: PatternBlock[] } | null>(null)

  const saveTemplate = async (t: Partial<ShiftTemplate>) => {
    if (!t.code || !t.label) { toast.error('Código y nombre son obligatorios'); return }
    if (t.id) {
      const { data, error } = await supabase.from('shift_templates').update({ code: t.code, label: t.label, entry1: t.entry1 || null, exit1: t.exit1 || null, entry2: t.entry2 || null, exit2: t.exit2 || null, color: t.color }).eq('id', t.id).select().single()
      if (error) { toast.error(error.message); return }
      onTemplatesChange(templates.map((x) => x.id === t.id ? (data as ShiftTemplate) : x))
    } else {
      const { data, error } = await supabase.from('shift_templates').insert({ user_id: userId, code: t.code, label: t.label, entry1: t.entry1 || null, exit1: t.exit1 || null, entry2: t.entry2 || null, exit2: t.exit2 || null, color: t.color ?? '#3b82f6' }).select().single()
      if (error) { toast.error(error.message); return }
      onTemplatesChange([...templates, data as ShiftTemplate])
    }
    toast.success('Turno guardado'); setEditingTemplate(null)
  }

  const deleteTemplate = async (id: string) => {
    const { error } = await supabase.from('shift_templates').delete().eq('id', id)
    if (error) { toast.error('No se puede borrar: está usado en algún patrón'); return }
    onTemplatesChange(templates.filter((x) => x.id !== id)); toast.success('Turno borrado')
  }

  const createDefaults = async () => {
    const rows = DEFAULT_TEMPLATES.map((t) => ({ ...t, user_id: userId }))
    const { data, error } = await supabase.from('shift_templates').insert(rows).select()
    if (error) { toast.error(error.message); return }
    onTemplatesChange([...templates, ...(data as ShiftTemplate[])]); toast.success('Turnos creados')
  }

  const savePattern = async (p: Partial<ShiftPattern> & { _blocks?: PatternBlock[] }) => {
    if (!p.name || !p.start_date || !p.date_from) { toast.error('Faltan campos obligatorios'); return }
    const sequence = p._blocks ? expandBlocks(p._blocks) : p.sequence
    if (!sequence || sequence.length === 0) { toast.error('La secuencia no puede estar vacía'); return }
    const payload = { name: p.name, start_date: p.start_date, date_from: p.date_from, date_to: p.date_to || null, sequence, weekday_overrides: p.weekday_overrides ?? {} }
    if (p.id) {
      const { data, error } = await supabase.from('shift_patterns').update(payload).eq('id', p.id).select().single()
      if (error) { toast.error(error.message); return }
      onPatternsChange(patterns.map((x) => x.id === p.id ? (data as ShiftPattern) : x))
    } else {
      const { data, error } = await supabase.from('shift_patterns').insert({ ...payload, user_id: userId }).select().single()
      if (error) { toast.error(error.message); return }
      onPatternsChange([...patterns, data as ShiftPattern])
    }
    toast.success('Patrón guardado'); setEditingPattern(null)
  }

  const deletePattern = async (id: string) => {
    if (!confirm('¿Borrar este patrón? Los días marcados a mano se conservan.')) return
    const { error } = await supabase.from('shift_patterns').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    onPatternsChange(patterns.filter((x) => x.id !== id)); toast.success('Patrón borrado')
  }

  const tplMap = useMemo(() => new Map(templates.map((t) => [t.id, t])), [templates])

  return (
    <div className="max-w-4xl space-y-8">
      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xl font-bold">Mis turnos</h2>
            <p className="text-sm text-muted-foreground">Define los horarios que luego usarás en los patrones.</p>
          </div>
          <div className="flex gap-2">
            {templates.length === 0 && (
              <button onClick={createDefaults} className="px-3 py-2 text-sm rounded-lg border border-border hover:bg-secondary">Crear turnos por defecto</button>
            )}
            <button onClick={() => setEditingTemplate({ code: '', label: '', color: '#3b82f6' })} className="px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-medium inline-flex items-center gap-1">
              <Plus className="h-4 w-4" /> Nuevo turno
            </button>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl divide-y divide-border">
          {templates.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Aún no tienes turnos. Crea los presets o añade los tuyos.</div>}
          {templates.map((t) => (
            <div key={t.id} className="flex items-center gap-3 p-3">
              <span className="w-8 h-8 rounded-md flex items-center justify-center font-bold text-white text-sm" style={{ backgroundColor: t.color }}>{t.code}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium">{t.label}</div>
                <div className="text-xs text-muted-foreground">{t.entry1 ? `${t.entry1}–${t.exit1 ?? '?'}` : 'Sin horario (descanso)'}{t.entry2 ? ` · ${t.entry2}–${t.exit2 ?? '?'}` : ''}</div>
              </div>
              <button onClick={() => setEditingTemplate(t)} className="p-2 hover:bg-secondary rounded-md"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => deleteTemplate(t.id)} className="p-2 hover:bg-secondary rounded-md text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xl font-bold">Mis patrones</h2>
            <p className="text-sm text-muted-foreground">Patrones rotativos que rellenan el calendario automáticamente.</p>
          </div>
          <button onClick={() => setEditingPattern({ name: '', start_date: '', date_from: '', date_to: '', _blocks: [] })} disabled={templates.length === 0} className="px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-medium inline-flex items-center gap-1 disabled:opacity-50">
            <Plus className="h-4 w-4" /> Nuevo patrón
          </button>
        </div>
        {templates.length === 0 && <p className="text-sm text-muted-foreground mb-3">Primero crea tus turnos arriba.</p>}
        <div className="bg-card border border-border rounded-2xl divide-y divide-border">
          {patterns.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Sin patrones. Crea uno para auto-rellenar tu cuadrante.</div>}
          {patterns.map((p) => (
            <div key={p.id} className="p-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.date_from} → {p.date_to || '∞'} · Inicio ciclo: {p.start_date} · {p.sequence.length} días</div>
                </div>
                <button onClick={() => setEditingPattern(patternToEditor(p, tplMap))} className="p-2 hover:bg-secondary rounded-md"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => deletePattern(p.id)} className="p-2 hover:bg-secondary rounded-md text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {p.sequence.map((tid, i) => {
                  const t = tplMap.get(tid)
                  return <span key={i} className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded" style={{ backgroundColor: t?.color ?? '#94a3b8' }}>{t?.code ?? '?'}</span>
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {editingTemplate && <TemplateEditor value={editingTemplate} onSave={saveTemplate} onClose={() => setEditingTemplate(null)} />}
      {editingPattern && <PatternEditor value={editingPattern} templates={templates} onSave={savePattern} onClose={() => setEditingPattern(null)} />}
    </div>
  )
}

function patternToEditor(p: ShiftPattern, tplMap: Map<string, ShiftTemplate>): Partial<ShiftPattern> & { _blocks: PatternBlock[] } {
  const blocks: PatternBlock[] = []
  for (const tid of p.sequence) {
    const last = blocks[blocks.length - 1]
    if (last && last.templateId === tid) last.days++
    else blocks.push({ days: 1, templateId: tid })
  }
  void tplMap
  return { ...p, _blocks: blocks }
}

function TemplateEditor({ value, onSave, onClose }: { value: Partial<ShiftTemplate>; onSave: (v: Partial<ShiftTemplate>) => void; onClose: () => void }) {
  const [f, setF] = useState(value)
  const upd = (k: keyof ShiftTemplate, v: any) => setF((x) => ({ ...x, [k]: v }))
  return (
    <Modal title={f.id ? 'Editar turno' : 'Nuevo turno'} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Código (M, T, N…)"><input value={f.code ?? ''} onChange={(e) => upd('code', e.target.value.toUpperCase().slice(0, 4))} className={inputCls} /></Field>
        <Field label="Color"><input type="color" value={f.color ?? '#3b82f6'} onChange={(e) => upd('color', e.target.value)} className="w-full h-9 rounded-md border border-input" /></Field>
        <Field label="Nombre"><input value={f.label ?? ''} onChange={(e) => upd('label', e.target.value)} className={inputCls} /></Field>
      </div>
      <div className="mt-4">
        <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Bloque 1</h4>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Entrada"><input type="time" value={f.entry1 ?? ''} onChange={(e) => upd('entry1', e.target.value)} className={inputCls} /></Field>
          <Field label="Salida"><input type="time" value={f.exit1 ?? ''} onChange={(e) => upd('exit1', e.target.value)} className={inputCls} /></Field>
        </div>
      </div>
      <div className="mt-3">
        <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Bloque 2 (opcional, jornada partida)</h4>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Entrada"><input type="time" value={f.entry2 ?? ''} onChange={(e) => upd('entry2', e.target.value)} className={inputCls} /></Field>
          <Field label="Salida"><input type="time" value={f.exit2 ?? ''} onChange={(e) => upd('exit2', e.target.value)} className={inputCls} /></Field>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Deja todos los horarios vacíos para un día de descanso.</p>
      <FooterButtons onClose={onClose} onSave={() => onSave(f)} />
    </Modal>
  )
}

function PatternEditor({ value, templates, onSave, onClose }: { value: Partial<ShiftPattern> & { _blocks?: PatternBlock[] }; templates: ShiftTemplate[]; onSave: (v: Partial<ShiftPattern> & { _blocks?: PatternBlock[] }) => void; onClose: () => void }) {
  const [f, setF] = useState(value)
  const [blocks, setBlocks] = useState<PatternBlock[]>(value._blocks ?? [])

  const setBlock = (i: number, patch: Partial<PatternBlock>) => setBlocks((bs) => bs.map((b, j) => j === i ? { ...b, ...patch } : b))
  const move = (i: number, dir: -1 | 1) => setBlocks((bs) => { const j = i + dir; if (j < 0 || j >= bs.length) return bs; const c = [...bs]; [c[i], c[j]] = [c[j], c[i]]; return c })
  const addBlock = () => setBlocks((bs) => [...bs, { days: 1, templateId: templates[0]?.id ?? '' }])
  const removeBlock = (i: number) => setBlocks((bs) => bs.filter((_, j) => j !== i))

  const applyPreset = (preset: '6x3' | '4x4' | 'clear') => {
    const find = (code: string) => templates.find((t) => t.code === code)?.id
    if (preset === '6x3') { const m = find('M') ?? templates[0]?.id; const d = find('D') ?? templates[0]?.id; if (m && d) setBlocks([{ days: 6, templateId: m }, { days: 3, templateId: d }]) }
    else if (preset === '4x4') { const m = find('M') ?? templates[0]?.id; const t = find('T') ?? templates[0]?.id; if (m && t) setBlocks([{ days: 4, templateId: m }, { days: 4, templateId: t }]) }
    else setBlocks([])
  }

  const totalDays = blocks.reduce((a, b) => a + b.days, 0)

  return (
    <Modal title={f.id ? 'Editar patrón' : 'Nuevo patrón'} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nombre"><input value={f.name ?? ''} onChange={(e) => setF((x) => ({ ...x, name: e.target.value }))} className={`${inputCls} col-span-2`} /></Field>
        <Field label="Fecha inicio del ciclo"><input type="date" value={f.start_date ?? ''} onChange={(e) => setF((x) => ({ ...x, start_date: e.target.value }))} className={inputCls} /></Field>
        <Field label="Aplicar desde"><input type="date" value={f.date_from ?? ''} onChange={(e) => setF((x) => ({ ...x, date_from: e.target.value }))} className={inputCls} /></Field>
        <Field label="Aplicar hasta (opcional)"><input type="date" value={f.date_to ?? ''} onChange={(e) => setF((x) => ({ ...x, date_to: e.target.value }))} className={inputCls} /></Field>
      </div>
      <div className="mt-5 flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold">Secuencia ({totalDays} días)</h4>
          <p className="text-xs text-muted-foreground">Define bloques consecutivos. Se repiten en bucle.</p>
        </div>
        <div className="flex gap-1 text-xs">
          <button onClick={() => applyPreset('6x3')} className="px-2 py-1 border border-border rounded hover:bg-secondary">6x3</button>
          <button onClick={() => applyPreset('4x4')} className="px-2 py-1 border border-border rounded hover:bg-secondary">4x4 M/T</button>
          <button onClick={() => applyPreset('clear')} className="px-2 py-1 border border-border rounded hover:bg-secondary">Limpiar</button>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {blocks.map((b, i) => (
          <div key={i} className="flex items-center gap-2 border border-border rounded-lg p-2">
            <input type="number" min={1} value={b.days} onChange={(e) => setBlock(i, { days: Math.max(1, parseInt(e.target.value) || 1) })} className="w-16 px-2 py-1 rounded-md border border-input bg-background text-sm" />
            <span className="text-xs text-muted-foreground">días de</span>
            <select value={b.templateId} onChange={(e) => setBlock(i, { templateId: e.target.value })} className="flex-1 px-2 py-1 rounded-md border border-input bg-background text-sm">
              {templates.map((t) => <option key={t.id} value={t.id}>{t.code} — {t.label}</option>)}
            </select>
            <button onClick={() => move(i, -1)} className="p-1 hover:bg-secondary rounded"><ChevronUp className="h-4 w-4" /></button>
            <button onClick={() => move(i, 1)} className="p-1 hover:bg-secondary rounded"><ChevronDown className="h-4 w-4" /></button>
            <button onClick={() => removeBlock(i)} className="p-1 hover:bg-secondary rounded text-destructive"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        <button onClick={addBlock} className="w-full py-2 border border-dashed border-border rounded-lg text-sm text-muted-foreground hover:bg-secondary inline-flex items-center justify-center gap-1">
          <Plus className="h-4 w-4" /> Añadir bloque
        </button>
      </div>
      <div className="mt-5">
        <h4 className="text-sm font-bold">Excepciones por día de la semana</h4>
        <p className="text-xs text-muted-foreground mb-2">Si eliges un turno aquí, se usará ese día en lugar del de la rotación.</p>
        <div className="space-y-1">
          {['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map((name, dow) => {
            const ov = (f.weekday_overrides ?? {}) as Record<string, string>
            const val = ov[String(dow)] ?? ''
            return (
              <div key={dow} className="flex items-center gap-2">
                <span className="w-24 text-xs">{name}</span>
                <select value={val} onChange={(e) => setF((x) => { const next = { ...((x.weekday_overrides ?? {}) as Record<string, string>) }; if (e.target.value) next[String(dow)] = e.target.value; else delete next[String(dow)]; return { ...x, weekday_overrides: next } })} className="flex-1 px-2 py-1 rounded-md border border-input bg-background text-sm">
                  <option value="">— Seguir rotación —</option>
                  {templates.map((t) => <option key={t.id} value={t.id}>{t.code} — {t.label}</option>)}
                </select>
              </div>
            )
          })}
        </div>
      </div>
      <FooterButtons onClose={onClose} onSave={() => onSave({ ...f, _blocks: blocks })} />
    </Modal>
  )
}

const inputCls = 'w-full px-2 py-1.5 rounded-md border border-input bg-background text-sm'
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-xs text-muted-foreground">{label}</span><div className="mt-1">{children}</div></label>
}
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h2 className="font-bold text-lg">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-secondary rounded-md"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
function FooterButtons({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  return (
    <div className="mt-5 flex justify-end gap-2">
      <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-secondary">Cancelar</button>
      <button onClick={onSave} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-medium">Guardar</button>
    </div>
  )
}
