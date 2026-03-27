export const PIECE_COLORS = [
  '#4A90D9', '#E67E22', '#27AE60', '#9B59B6', '#E74C3C',
  '#1ABC9C', '#F39C12', '#2980B9', '#8E44AD', '#16A085',
]

export function truncate(s: string, maxChars: number): string {
  if (maxChars <= 0) return ''
  return s.length <= maxChars ? s : s.slice(0, maxChars) + '\u2026'
}

export function efficiencyClass(e: number): string {
  return e >= 80 ? 'eff-good' : e >= 55 ? 'eff-ok' : 'eff-poor'
}
