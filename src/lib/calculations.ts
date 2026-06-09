import { isHoliday } from './holidays'

export type PsmDsmRole = 'none' | 'psm' | 'dsm'

export interface ShiftDay {
  shift_date: string
  entry1?: string | null
  exit1?: string | null
  real_exit1?: string | null
  entry2?: string | null
  exit2?: string | null
  real_exit2?: string | null
  is_festivo?: boolean
  is_vacaciones?: boolean
  is_dia_extra?: boolean
  is_baja?: boolean
  psm_dsm?: PsmDsmRole
  psm_dsm_horas?: number | null
}

export interface UserVariables {
  plus_domingo: number
  plus_festivo: number
  plus_nocturnidad: number
  madrugue: number
  jornada_partida: number
  extra_nocturna_perentoria: number
  extra_diurna_perentoria: number
  extra_nocturna: number
  extra_diurna: number
  dieta: number
  transporte: number
  jornada_anual_horas: number
  salario_anual: number
  porcentaje_jornada: number
  turnicidad_2: number
  turnicidad_3: number
  turnicidad_4: number
  turnicidad_5: number
  turnicidad_parcial: number
  contrato_parcial: boolean
  rol_psm_dsm: PsmDsmRole
  plus_psm: number
  plus_dsm: number
}

export const HORAS_MES_REFERENCIA = 155.63

export interface DayCalculation {
  date: string
  isSunday: boolean
  isFestivo: boolean
  isVacaciones: boolean
  workedHours: number
  nightHours: number
  extrasDiurnas: number
  extrasNocturnas: number
  plusDomingoHoras: number
  plusFestivoHoras: number
  madrugue: boolean
  jornadaPartida: boolean
  partidaMayor2h: boolean
  dieta: boolean
  totalHoras: number
  psmHoras: number
  dsmHoras: number
}

function parseTime(t?: string | null): number | null {
  if (!t) return null
  const s = t.trim()
  if (!s) return null
  if (s.includes(':')) {
    const [h, m] = s.split(':').map((x) => parseInt(x, 10))
    if (isNaN(h) || isNaN(m)) return null
    return h * 60 + m
  }
  const n = parseInt(s, 10)
  if (isNaN(n)) return null
  return Math.floor(n / 100) * 60 + (n % 100)
}

function diffMin(start: number, end: number): number {
  if (end < start) end += 24 * 60
  return end - start
}

function nightMinutesInRange(startMin: number, endMin: number): number {
  if (endMin <= startMin) endMin += 24 * 60
  let night = 0
  const ranges = [[-2 * 60, 6 * 60], [22 * 60, 30 * 60], [46 * 60, 54 * 60]]
  for (const [a, b] of ranges) {
    const lo = Math.max(startMin, a)
    const hi = Math.min(endMin, b)
    if (hi > lo) night += hi - lo
  }
  return night
}

export function calcDay(day: ShiftDay): DayCalculation {
  const date = new Date(day.shift_date + 'T00:00:00')
  const isSunday = date.getDay() === 0
  const isFestivo = !!day.is_festivo || isHoliday(day.shift_date)
  const isVacaciones = !!day.is_vacaciones
  const isBaja = !!day.is_baja

  if (isBaja) {
    return { date: day.shift_date, isSunday, isFestivo, isVacaciones: false, workedHours: 0, nightHours: 0, extrasDiurnas: 0, extrasNocturnas: 0, plusDomingoHoras: 0, plusFestivoHoras: 0, madrugue: false, jornadaPartida: false, partidaMayor2h: false, dieta: false, totalHoras: 0, psmHoras: 0, dsmHoras: 0 }
  }

  if (isVacaciones) {
    let vacMin = 0
    const e1 = parseTime(day.entry1); const s1 = parseTime(day.exit1)
    if (e1 !== null && s1 !== null) vacMin += diffMin(e1, s1)
    const e2 = parseTime(day.entry2); const s2 = parseTime(day.exit2)
    if (e2 !== null && s2 !== null) vacMin += diffMin(e2, s2)
    const vacH = vacMin / 60
    return { date: day.shift_date, isSunday, isFestivo, isVacaciones, workedHours: vacH, nightHours: 0, extrasDiurnas: 0, extrasNocturnas: 0, plusDomingoHoras: 0, plusFestivoHoras: 0, madrugue: false, jornadaPartida: false, partidaMayor2h: false, dieta: false, totalHoras: vacH, psmHoras: 0, dsmHoras: 0 }
  }

  let workedMin = 0, nightMin = 0, extraDiurnaMin = 0, extraNocturnaMin = 0
  let firstEntry: number | null = null, lastExit: number | null = null
  let block1End: number | null = null, block2Start: number | null = null

  const e1 = parseTime(day.entry1), s1 = parseTime(day.exit1), r1 = parseTime(day.real_exit1)
  if (e1 !== null && s1 !== null) {
    workedMin += diffMin(e1, s1); nightMin += nightMinutesInRange(e1, s1)
    firstEntry = e1; block1End = s1; lastExit = r1 ?? s1
    if (r1 !== null && r1 !== s1) {
      const et = diffMin(s1, r1); const en = nightMinutesInRange(s1, r1)
      extraNocturnaMin += en; extraDiurnaMin += et - en
    }
  }

  const e2 = parseTime(day.entry2), s2 = parseTime(day.exit2), r2 = parseTime(day.real_exit2)
  if (e2 !== null && s2 !== null) {
    workedMin += diffMin(e2, s2); nightMin += nightMinutesInRange(e2, s2)
    if (firstEntry === null) firstEntry = e2
    block2Start = e2; lastExit = r2 ?? s2
    if (r2 !== null && r2 !== s2) {
      const et = diffMin(s2, r2); const en = nightMinutesInRange(s2, r2)
      extraNocturnaMin += en; extraDiurnaMin += et - en
    }
  }

  const workedHours = workedMin / 60
  const nightHours = nightMin / 60
  let extrasDiurnas = extraDiurnaMin / 60
  let extrasNocturnas = extraNocturnaMin / 60
  let finalWorked = workedHours

  if (day.is_dia_extra) {
    extrasDiurnas += workedHours - nightHours
    extrasNocturnas += nightHours
    finalWorked = 0
  }

  const totalHoras = finalWorked + extrasDiurnas + extrasNocturnas
  const plusDomingoHoras = isSunday ? totalHoras : 0
  const plusFestivoHoras = (!isSunday && isFestivo) ? totalHoras : 0
  const madrugue = firstEntry !== null && firstEntry >= 2 * 60 && firstEntry <= 6 * 60 + 55

  let jornadaPartida = false, partidaMayor2h = false
  if (block1End !== null && block2Start !== null) {
    jornadaPartida = true
    partidaMayor2h = (block2Start - block1End) > 2 * 60
  }

  let dieta = false
  if (firstEntry !== null && lastExit !== null && totalHoras >= 6) {
    const endEff = lastExit < firstEntry ? lastExit + 24 * 60 : lastExit
    if ((firstEntry <= 14 * 60 && endEff >= 16 * 60) || (firstEntry <= 21 * 60 && endEff >= 23 * 60)) dieta = true
  }

  let psmHoras = 0, dsmHoras = 0
  if (day.psm_dsm === 'psm') psmHoras = day.psm_dsm_horas ?? totalHoras
  else if (day.psm_dsm === 'dsm') dsmHoras = day.psm_dsm_horas ?? totalHoras

  return { date: day.shift_date, isSunday, isFestivo, isVacaciones, workedHours: finalWorked, nightHours, extrasDiurnas, extrasNocturnas, plusDomingoHoras, plusFestivoHoras, madrugue, jornadaPartida, partidaMayor2h, dieta, totalHoras, psmHoras, dsmHoras }
}

export interface MonthSummary {
  days: DayCalculation[]
  totalHoras: number; horasJornada: number; horasNocturnas: number
  horasDomingo: number; horasFestivo: number; extrasDiurnas: number; extrasNocturnas: number
  numMadrugues: number; numJornadasPartidas: number; numPartidasMayor2: number
  numDietas: number; diasTrabajados: number; numTurnosDistintos: number; nivelTurnicidad: number
  importePlusParcial: number; rolPsmDsm: PsmDsmRole; psmHorasMes: number; dsmHorasMes: number
  importePsmBase: number; importeDsmBase: number; importePsmDia: number; importeDsmDia: number
  importePsmDsmTotal: number; vacacionesDias: number
  importePlusDomingo: number; importePlusFestivo: number; importePlusNocturnidad: number
  importeMadrugue: number; importeJornadaPartida: number; importeExtrasDiurnas: number
  importeExtrasNocturnas: number; importeDietas: number; importeTransporte: number
  importeTurnicidad: number; importeTotal: number
  porcentajeJornadaCumplido: number; horasMensualesObjetivo: number
}

export function calcMonth(shifts: ShiftDay[], vars: UserVariables, _year: number, _month0: number): MonthSummary {
  const days = shifts.map(calcDay)
  const sum = (fn: (d: DayCalculation) => number) => days.reduce((a, d) => a + fn(d), 0)

  const horasJornada = sum((d) => d.workedHours)
  const totalHoras = horasJornada + sum((d) => d.extrasDiurnas + d.extrasNocturnas)
  const horasNocturnas = sum((d) => d.nightHours)
  const horasDomingo = sum((d) => d.plusDomingoHoras)
  const horasFestivo = sum((d) => d.plusFestivoHoras)
  const extrasDiurnas = sum((d) => d.extrasDiurnas)
  const extrasNocturnas = sum((d) => d.extrasNocturnas)
  const numMadrugues = days.filter((d) => d.madrugue).length
  const numJornadasPartidas = days.filter((d) => d.jornadaPartida).length
  const numPartidasMayor2 = days.filter((d) => d.partidaMayor2h).length
  const numDietas = days.filter((d) => d.dieta).length
  const vacacionesDias = days.filter((d) => d.isVacaciones).length

  const diasTrabajadosShifts = shifts.filter((s, i) => {
    const d = days[i]
    if (d.isVacaciones) return false
    return !!((s.entry1 && s.exit1) || (s.entry2 && s.exit2))
  })
  const diasTrabajados = diasTrabajadosShifts.length

  const turnosSet = new Set<string>()
  for (const s of diasTrabajadosShifts) {
    turnosSet.add([s.entry1 ?? '', s.exit1 ?? '', s.entry2 ?? '', s.exit2 ?? ''].join('|'))
  }
  const numTurnosDistintos = turnosSet.size
  let nivelTurnicidad = 0, importeTurnicidad = 0
  if (numTurnosDistintos >= 5) { nivelTurnicidad = 5; importeTurnicidad = vars.turnicidad_5 }
  else if (numTurnosDistintos === 4) { nivelTurnicidad = 4; importeTurnicidad = vars.turnicidad_4 }
  else if (numTurnosDistintos === 3) { nivelTurnicidad = 3; importeTurnicidad = vars.turnicidad_3 }
  else if (numTurnosDistintos === 2) { nivelTurnicidad = 2; importeTurnicidad = vars.turnicidad_2 }

  const horasMensualesObjetivo = HORAS_MES_REFERENCIA * (vars.porcentaje_jornada / 100)
  const porcentajeJornadaCumplido = horasMensualesObjetivo > 0 ? (horasJornada / horasMensualesObjetivo) * 100 : 0
  const ratioCumplido = Math.min(porcentajeJornadaCumplido / 100, 1)

  const importePlusDomingo = horasDomingo * vars.plus_domingo
  const importePlusFestivo = horasFestivo * vars.plus_festivo
  const importePlusNocturnidad = horasNocturnas * vars.plus_nocturnidad
  const importeMadrugue = numMadrugues * vars.madrugue
  const importeJornadaPartida = numJornadasPartidas * vars.jornada_partida
  const importeExtrasDiurnas = extrasDiurnas * vars.extra_diurna_perentoria
  const importeExtrasNocturnas = extrasNocturnas * vars.extra_nocturna_perentoria
  const importeDietas = numDietas * vars.dieta
  const importeTransporte = diasTrabajados * vars.transporte
  const importePlusParcial = (!!vars.contrato_parcial && diasTrabajadosShifts.length > 0) ? vars.turnicidad_parcial * ratioCumplido : 0

  const rolPsmDsm: PsmDsmRole = (vars.rol_psm_dsm ?? 'none') as PsmDsmRole
  const trabajaAlgo = diasTrabajadosShifts.length > 0
  const importePsmBase = (rolPsmDsm === 'psm' && trabajaAlgo) ? (vars.plus_psm ?? 0) * ratioCumplido : 0
  const importeDsmBase = (rolPsmDsm === 'dsm' && trabajaAlgo) ? (vars.plus_dsm ?? 0) * ratioCumplido : 0
  const tarifaHoraPsm = (vars.plus_psm ?? 0) / HORAS_MES_REFERENCIA
  const tarifaHoraDsm = (vars.plus_dsm ?? 0) / HORAS_MES_REFERENCIA
  const psmHorasMes = sum((d) => d.psmHoras)
  const dsmHorasMes = sum((d) => d.dsmHoras)
  const importePsmDia = rolPsmDsm === 'psm' ? 0 : psmHorasMes * tarifaHoraPsm
  const importeDsmDia = rolPsmDsm === 'dsm' ? 0 : dsmHorasMes * tarifaHoraDsm
  const importePsmDsmTotal = importePsmBase + importeDsmBase + importePsmDia + importeDsmDia

  const importeTotal = importePlusDomingo + importePlusFestivo + importePlusNocturnidad + importeMadrugue + importeJornadaPartida + importeExtrasDiurnas + importeExtrasNocturnas + importeDietas + importeTransporte + importeTurnicidad + importePlusParcial + importePsmDsmTotal

  return { days, totalHoras, horasJornada, horasNocturnas, horasDomingo, horasFestivo, extrasDiurnas, extrasNocturnas, numMadrugues, numJornadasPartidas, numPartidasMayor2, numDietas, diasTrabajados, numTurnosDistintos, nivelTurnicidad, vacacionesDias, importePlusDomingo, importePlusFestivo, importePlusNocturnidad, importeMadrugue, importeJornadaPartida, importeExtrasDiurnas, importeExtrasNocturnas, importeDietas, importeTransporte, importeTurnicidad, importePlusParcial, rolPsmDsm, psmHorasMes, dsmHorasMes, importePsmBase, importeDsmBase, importePsmDia, importeDsmDia, importePsmDsmTotal, importeTotal, porcentajeJornadaCumplido, horasMensualesObjetivo }
}

export function formatHours(h: number): string {
  const sign = h < 0 ? '-' : ''
  const abs = Math.abs(h)
  const hh = Math.floor(abs)
  const mm = Math.round((abs - hh) * 60)
  return `${sign}${hh}h ${mm.toString().padStart(2, '0')}m`
}

export function formatEur(n: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n)
}
