import { describe, it, expect } from 'vitest'
import { csvCell, toCsv, dollars } from './csv'

describe('csv cells', () => {
  it('leaves plain values alone', () => {
    expect(csvCell('Bellagio')).toBe('Bellagio')
    expect(csvCell(42)).toBe('42')
    expect(csvCell('')).toBe('')
  })

  it('quotes values containing a comma', () => {
    expect(csvCell("Mike's place, back room")).toBe('"Mike\'s place, back room"')
  })

  it('escapes embedded quotes by doubling them', () => {
    expect(csvCell('he said "nice hand"')).toBe('"he said ""nice hand"""')
  })

  it('quotes newlines so a note cannot break the row', () => {
    expect(csvCell('line one\nline two')).toBe('"line one\nline two"')
    expect(csvCell('crlf\r\nhere')).toBe('"crlf\r\nhere"')
  })
})

describe('csv document', () => {
  it('writes a BOM and CRLF rows', () => {
    const out = toCsv(['a', 'b'], [[1, 2], [3, 4]])
    expect(out.charCodeAt(0)).toBe(0xfeff)
    expect(out.slice(1)).toBe('a,b\r\n1,2\r\n3,4')
  })

  it('handles an empty result set without producing a bare BOM', () => {
    expect(toCsv(['a'], []).slice(1)).toBe('a')
  })
})

describe('dollars', () => {
  it('renders cents as a spreadsheet decimal', () => {
    expect(dollars(1250)).toBe('12.50')
    expect(dollars(5)).toBe('0.05')
    expect(dollars(0)).toBe('0.00')
    expect(dollars(100)).toBe('1.00')
  })

  it('keeps the sign outside the digits', () => {
    expect(dollars(-4500)).toBe('-45.00')
    expect(dollars(-5)).toBe('-0.05')
  })

  it('never emits a currency symbol — Excel would read it as text', () => {
    expect(dollars(123456)).toBe('1234.56')
    expect(dollars(-99)).not.toMatch(/[$,]/)
  })
})
