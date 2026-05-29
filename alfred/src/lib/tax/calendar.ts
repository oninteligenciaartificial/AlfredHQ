import { addDays, isWeekend } from 'date-fns'

// NIT last digit → due day of month (SIN Bolivia rule)
// 0→13, 1→14, 2→15, 3→16, 4→17, 5→18, 6→19, 7→20, 8→21, 9→22
export function getMonthlyDueDay(nitLastDigit: number): number {
  return 13 + nitLastDigit
}

function nextWeekday(date: Date): Date {
  let d = new Date(date)
  while (isWeekend(d)) {
    d = addDays(d, 1)
  }
  return d
}

export function getMonthlyDueDate(year: number, month: number, nitLastDigit: number): Date {
  const day = getMonthlyDueDay(nitLastDigit)
  // month is 1-based
  const raw = new Date(year, month - 1, day)
  return nextWeekday(raw)
}

export type Sector =
  | 'comercio_servicios'
  | 'industrial_petroleo'
  | 'agricultura_forestal'
  | 'mineria'

export function getIUEDueDate(year: number, sector: Sector): Date {
  const map: Record<Sector, [number, number]> = {
    comercio_servicios:    [3, 30],  // April 30 (month 4, but 0-indexed = 3)
    industrial_petroleo:   [6, 28],  // July 28
    agricultura_forestal:  [9, 28],  // October 28
    mineria:               [0, 28],  // January 28
  }
  const [month0, day] = map[sector]
  // mineria IUE is due Jan 28 of the following year
  const y = sector === 'mineria' ? year + 1 : year
  return nextWeekday(new Date(y, month0, day))
}

export interface ObligationTemplate {
  tax_type: 'IVA' | 'IT' | 'RC_IVA' | 'IUE' | 'IEHD'
  period: string
  due_date: Date
}

export function generateYearlyObligations(
  year: number,
  nitLastDigit: number,
  sector: Sector,
  taxRegime: string,
): ObligationTemplate[] {
  const results: ObligationTemplate[] = []

  for (let month = 1; month <= 12; month++) {
    const dueDate = getMonthlyDueDate(year, month, nitLastDigit)
    const period = `${year}-${String(month).padStart(2, '0')}`

    // IVA: general and simplificado regimes
    if (taxRegime === 'general' || taxRegime === 'simplificado') {
      results.push({ tax_type: 'IVA', period, due_date: dueDate })
    }

    // IT: general regime
    if (taxRegime === 'general') {
      results.push({ tax_type: 'IT', period, due_date: dueDate })
    }

    // RC_IVA: rc_iva regime
    if (taxRegime === 'rc_iva') {
      results.push({ tax_type: 'RC_IVA', period, due_date: dueDate })
    }
  }

  // IUE: annual, general regime only
  if (taxRegime === 'general') {
    results.push({
      tax_type: 'IUE',
      period: String(year),
      due_date: getIUEDueDate(year, sector),
    })
  }

  return results
}

export function computeStatus(
  dueDate: Date,
  filedAt?: Date | null,
): 'upcoming' | 'due_soon' | 'overdue' | 'filed' {
  if (filedAt) return 'filed'
  const now = new Date()
  const msInDay = 1000 * 60 * 60 * 24
  const daysUntil = Math.floor((dueDate.getTime() - now.getTime()) / msInDay)
  if (daysUntil < 0) return 'overdue'
  if (daysUntil <= 14) return 'due_soon'
  return 'upcoming'
}
