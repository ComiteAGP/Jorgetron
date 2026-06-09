export const HOLIDAYS_BY_YEAR: Record<number, Record<string, string>> = {
  2026: {
    "2026-01-01": "Año Nuevo",
    "2026-01-06": "Epifanía del Señor",
    "2026-02-28": "Día de Andalucía",
    "2026-04-02": "Jueves Santo",
    "2026-04-03": "Viernes Santo",
    "2026-05-01": "Fiesta del Trabajo",
    "2026-08-15": "Asunción de la Virgen",
    "2026-08-19": "Incorporación de Málaga a la Corona de Castilla",
    "2026-09-08": "Nuestra Señora de la Victoria",
    "2026-10-12": "Fiesta Nacional de España",
    "2026-11-02": "Traslado de Todos los Santos",
    "2026-12-07": "Traslado del Día de la Constitución",
    "2026-12-08": "Inmaculada Concepción",
    "2026-12-25": "Navidad",
  },
}

export function isHoliday(date: string): boolean {
  const year = parseInt(date.slice(0, 4), 10)
  return !!HOLIDAYS_BY_YEAR[year]?.[date]
}

export function holidayName(date: string): string | null {
  const year = parseInt(date.slice(0, 4), 10)
  return HOLIDAYS_BY_YEAR[year]?.[date] ?? null
}
