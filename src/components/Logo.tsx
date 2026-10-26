export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="grid size-8 place-items-center rounded-lg bg-indigo-600 text-white shadow-sm shadow-indigo-600/30">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </span>
      <span className="hidden text-base font-semibold tracking-tight text-slate-900 min-[400px]:inline">HabitFlow</span>
    </span>
  )
}
