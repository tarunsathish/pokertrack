// CSV formatting for spreadsheet export. Pure string work, kept in the engine
// so it can be tested without Dexie — the same reason the session math lives here.
import type { Cents } from './money'

/** RFC-4180 quoting: wrap when the value could break a cell, double inner quotes. */
export function csvCell(v: string | number): string {
  const s = String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * Rows to a CSV document. Leads with a UTF-8 BOM because Excel assumes the
 * system codepage without it, which mangles venue names carrying accents or a
 * £/€ sign. CRLF line endings for the same reason.
 */
export function toCsv(headers: string[], rows: (string | number)[][]): string {
  return '﻿' + [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n')
}

/**
 * Cents to a plain spreadsheet decimal: "12.50", never "$12.50" (which Excel
 * reads as text) and never 1250 (which silently inflates every figure 100x).
 */
export function dollars(cents: Cents): string {
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`
}
