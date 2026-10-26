import type { Category, HabitColor } from './types'

/**
 * Tailwind only generates CSS for class names it can find written out in
 * full in the source code, so every color variant is spelled out here
 * instead of being built with string templates like `bg-${color}-500`.
 */
export const COLOR_STYLES: Record<HabitColor, { dot: string; soft: string; solid: string; ring: string }> = {
  indigo: { dot: 'bg-indigo-500', soft: 'bg-indigo-50 text-indigo-700', solid: 'bg-indigo-500 border-indigo-500', ring: 'ring-indigo-500' },
  emerald: { dot: 'bg-emerald-500', soft: 'bg-emerald-50 text-emerald-700', solid: 'bg-emerald-500 border-emerald-500', ring: 'ring-emerald-500' },
  amber: { dot: 'bg-amber-500', soft: 'bg-amber-50 text-amber-800', solid: 'bg-amber-500 border-amber-500', ring: 'ring-amber-500' },
  rose: { dot: 'bg-rose-500', soft: 'bg-rose-50 text-rose-700', solid: 'bg-rose-500 border-rose-500', ring: 'ring-rose-500' },
  sky: { dot: 'bg-sky-500', soft: 'bg-sky-50 text-sky-700', solid: 'bg-sky-500 border-sky-500', ring: 'ring-sky-500' },
  violet: { dot: 'bg-violet-500', soft: 'bg-violet-50 text-violet-700', solid: 'bg-violet-500 border-violet-500', ring: 'ring-violet-500' },
  teal: { dot: 'bg-teal-500', soft: 'bg-teal-50 text-teal-700', solid: 'bg-teal-500 border-teal-500', ring: 'ring-teal-500' },
  orange: { dot: 'bg-orange-500', soft: 'bg-orange-50 text-orange-700', solid: 'bg-orange-500 border-orange-500', ring: 'ring-orange-500' },
}

export const CATEGORY_LABELS: Record<Category, string> = {
  health: 'Health',
  fitness: 'Fitness',
  mindfulness: 'Mindfulness',
  learning: 'Learning',
  productivity: 'Productivity',
  social: 'Social',
  finance: 'Finance',
  creativity: 'Creativity',
  other: 'Other',
}
