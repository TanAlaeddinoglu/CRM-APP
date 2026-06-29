import { describe, it, expect } from 'vitest'
import {
  extractList, buildUserLabel, normalizeParams,
  formatCurrency, formatPercent, formatMetric, renderCellValue,
  formatShortDate, compactCurrency,
} from '../../src/utils/reportUtils.js'

describe('reportUtils', () => {
  describe('extractList()', () => {
    it('returns the array directly when data is an array', () => {
      expect(extractList([1, 2, 3])).toEqual([1, 2, 3])
    })

    it('extracts results from paginated response', () => {
      expect(extractList({ results: ['a', 'b'], count: 2 })).toEqual(['a', 'b'])
    })

    it('returns empty array for null', () => {
      expect(extractList(null)).toEqual([])
    })

    it('returns empty array for undefined', () => {
      expect(extractList(undefined)).toEqual([])
    })

    it('returns empty array for non-list object without results', () => {
      expect(extractList({ data: 'something' })).toEqual([])
    })

    it('returns empty array for empty results', () => {
      expect(extractList({ results: [] })).toEqual([])
    })
  })

  describe('buildUserLabel()', () => {
    it('returns full name with username in parens', () => {
      expect(buildUserLabel({ first_name: 'Ali', last_name: 'Veli', username: 'aveli' }))
        .toBe('Ali Veli (aveli)')
    })

    it('returns just username when no name', () => {
      expect(buildUserLabel({ first_name: '', last_name: '', username: 'aveli' }))
        .toBe('aveli')
    })

    it('handles first_name only', () => {
      expect(buildUserLabel({ first_name: 'Ali', last_name: '', username: 'ali' }))
        .toBe('Ali (ali)')
    })

    it('handles last_name only', () => {
      expect(buildUserLabel({ first_name: '', last_name: 'Veli', username: 'veli' }))
        .toBe('Veli (veli)')
    })
  })

  describe('normalizeParams()', () => {
    it('removes empty strings', () => {
      const result = normalizeParams({ name: '', age: 25 })
      expect(result).not.toHaveProperty('name')
      expect(result.age).toBe(25)
    })

    it('removes null values', () => {
      const result = normalizeParams({ a: null, b: 'ok' })
      expect(result).not.toHaveProperty('a')
      expect(result.b).toBe('ok')
    })

    it('removes undefined values', () => {
      const result = normalizeParams({ x: undefined, y: 1 })
      expect(result).not.toHaveProperty('x')
    })

    it('strips preset when date_from is set', () => {
      const result = normalizeParams({ preset: '7d', date_from: '2024-01-01' })
      expect(result).not.toHaveProperty('preset')
      expect(result.date_from).toBe('2024-01-01')
    })

    it('strips preset when date_to is set', () => {
      const result = normalizeParams({ preset: '30d', date_to: '2024-12-31' })
      expect(result).not.toHaveProperty('preset')
    })

    it('keeps preset when no date_from or date_to', () => {
      const result = normalizeParams({ preset: '7d' })
      expect(result.preset).toBe('7d')
    })

    it('keeps 0 and false values', () => {
      const result = normalizeParams({ count: 0, flag: false })
      expect(result.count).toBe(0)
      expect(result.flag).toBe(false)
    })
  })

  describe('formatCurrency()', () => {
    it('returns dash for null', () => {
      expect(formatCurrency(null)).toBe('-')
    })

    it('returns dash for undefined', () => {
      expect(formatCurrency(undefined)).toBe('-')
    })

    it('returns dash for empty string', () => {
      expect(formatCurrency('')).toBe('-')
    })

    it('formats number with Turkish lira symbol', () => {
      const result = formatCurrency(1000)
      expect(result).toContain('₺')
      expect(result).toContain('1')
    })

    it('handles string numbers', () => {
      const result = formatCurrency('500')
      expect(result).toContain('₺')
    })
  })

  describe('formatPercent()', () => {
    it('returns dash for null', () => {
      expect(formatPercent(null)).toBe('-')
    })

    it('returns dash for empty string', () => {
      expect(formatPercent('')).toBe('-')
    })

    it('formats value with percent symbol', () => {
      const result = formatPercent(75)
      expect(result).toContain('%')
    })

    it('handles string numbers', () => {
      const result = formatPercent('42.5')
      expect(result).toContain('%')
    })
  })

  describe('formatMetric()', () => {
    it('returns dash for null value', () => {
      expect(formatMetric('Gelir', null)).toBe('-')
    })

    it('returns dash for empty string value', () => {
      expect(formatMetric('Tutar', '')).toBe('-')
    })

    it('formats as currency when label contains "Gelir"', () => {
      const result = formatMetric('Toplam Gelir', 5000)
      expect(result).toContain('₺')
    })

    it('formats as currency when label contains "Tutar"', () => {
      const result = formatMetric('Ödeme Tutar', 200)
      expect(result).toContain('₺')
    })

    it('formats as currency when label contains "Kalan"', () => {
      const result = formatMetric('Kalan Tutar', 300)
      expect(result).toContain('₺')
    })

    it('formats as percent when label contains "%"', () => {
      const result = formatMetric('Başarı %', 80)
      expect(result).toContain('%')
    })

    it('returns raw value for unrecognized labels', () => {
      expect(formatMetric('Randevu Sayısı', 42)).toBe(42)
    })

    it('formats "Tahsilat Oranı %" as percent not currency', () => {
      const result = formatMetric('Tahsilat Oranı %', 45.38)
      expect(result).toContain('%')
      expect(result).not.toContain('₺')
    })

    it('formats "Toplam Ciro" as currency', () => {
      const result = formatMetric('Toplam Ciro', 108000)
      expect(result).toContain('₺')
      expect(result).not.toContain('%')
    })

    it('formats "Bakiye" label as currency', () => {
      const result = formatMetric('Kalan Bakiye', 500)
      expect(result).toContain('₺')
    })

    it('formats "Ücret" label as currency', () => {
      const result = formatMetric('Ücret', 250)
      expect(result).toContain('₺')
    })
  })

  describe('formatShortDate()', () => {
    it('converts ISO date to DD.MM format', () => {
      expect(formatShortDate('2024-06-15')).toBe('15.06')
    })

    it('returns dash for falsy input', () => {
      expect(formatShortDate(null)).toBe('-')
      expect(formatShortDate('')).toBe('-')
      expect(formatShortDate(undefined)).toBe('-')
    })

    it('returns raw string if not a valid date format', () => {
      expect(formatShortDate('invalid')).toBe('invalid')
    })

    it('handles single-digit days and months', () => {
      expect(formatShortDate('2024-01-05')).toBe('05.01')
    })
  })

  describe('compactCurrency()', () => {
    it('returns millions with Mn suffix', () => {
      const result = compactCurrency(2_500_000)
      expect(result).toContain('Mn')
      expect(result).toContain('₺')
    })

    it('returns thousands with B suffix', () => {
      const result = compactCurrency(15_000)
      expect(result).toContain('B')
      expect(result).toContain('₺')
    })

    it('returns raw amount for values under 1000', () => {
      const result = compactCurrency(500)
      expect(result).toContain('500')
      expect(result).toContain('₺')
      expect(result).not.toContain('B')
      expect(result).not.toContain('Mn')
    })

    it('handles null/undefined as 0', () => {
      const result = compactCurrency(null)
      expect(result).toContain('₺')
    })

    it('handles string numbers', () => {
      const result = compactCurrency('3000000')
      expect(result).toContain('Mn')
    })
  })

  describe('renderCellValue()', () => {
    it('returns dash for null value', () => {
      expect(renderCellValue('total_paid_amount', null)).toBe('-')
    })

    it('returns dash for empty string', () => {
      expect(renderCellValue('sales_rate', '')).toBe('-')
    })

    it('formats currency keys with ₺', () => {
      const currencyKeys = [
        'total_paid_amount', 'total_remaining_amount',
        'completed_paid_amount', 'partial_paid_amount', 'cancelled_paid_amount',
      ]
      currencyKeys.forEach(key => {
        expect(renderCellValue(key, 100)).toContain('₺')
      })
    })

    it('formats percent keys with %', () => {
      const percentKeys = [
        'sales_rate', 'pending_rate', 'negative_rate', 'completed_rate',
        'partial_rate', 'cancelled_rate', 'conversion_rate', 'rejection_rate',
      ]
      percentKeys.forEach(key => {
        expect(renderCellValue(key, 50)).toContain('%')
      })
    })

    it('returns raw value for unknown keys', () => {
      expect(renderCellValue('customer_name', 'Ali Veli')).toBe('Ali Veli')
    })
  })
})
