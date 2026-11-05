import { Menu, RotateCcw, Sparkles } from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function TopBar({ title, subtitle, onMenu }) {
  const { loadDemoData, resetAllData, activeDataset } = useApp()
  const badge = activeDataset?.isSynthetic
    ? 'Synthetic test data'
    : activeDataset
      ? 'Uploaded dataset'
      : 'Manual records'

  function handleReset() {
    const confirmed = window.confirm(
      'Clear farms, manual readings, and manual recommendations stored in this browser? Uploaded datasets stay until you delete them on Data Analysis.',
    )
    if (confirmed) resetAllData()
  }

  return (
    <header className="sticky top-0 z-10 border-b border-emerald-100 bg-white/90 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded-lg border border-emerald-100 p-2 text-slate-700 lg:hidden"
            onClick={onMenu}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">{title}</h1>
            {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              activeDataset?.isSynthetic
                ? 'bg-amber-100 text-amber-900'
                : activeDataset
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'bg-amber-50 text-amber-800'
            }`}
          >
            {badge}
          </span>
          <button
            type="button"
            onClick={loadDemoData}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <Sparkles className="h-4 w-4" />
            Load Demo Data
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RotateCcw className="h-4 w-4" />
            Clear data
          </button>
        </div>
      </div>
    </header>
  )
}
