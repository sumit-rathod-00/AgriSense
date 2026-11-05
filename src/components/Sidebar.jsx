import { NavLink } from 'react-router-dom'
import {
  BarChart3,
  Building2,
  FileText,
  Info,
  LayoutDashboard,
  Leaf,
  Sparkles,
  Upload,
  X,
} from 'lucide-react'

const LINKS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/analysis', label: 'Data Analysis', icon: Upload },
  { to: '/farms', label: 'Farm Management', icon: Building2 },
  { to: '/monitoring', label: 'Crop Monitoring', icon: Leaf },
  { to: '/recommendations', label: 'Smart Recommendations', icon: Sparkles },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/about', label: 'About the System', icon: Info },
]

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-20 bg-slate-900/40 lg:hidden"
          aria-label="Close menu"
          onClick={onClose}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-emerald-100 bg-white transition-transform lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-800">AgriSense</p>
              <p className="text-xs text-slate-500">Decision support</p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 lg:hidden"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3" aria-label="Primary">
          {LINKS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'text-slate-600 hover:bg-stone-50 hover:text-slate-900'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="m-3 rounded-2xl bg-emerald-50 p-4 text-xs text-emerald-900">
          <p className="font-semibold">University demo</p>
          <p className="mt-1 leading-relaxed">
            Upload a CSV under Data Analysis for calculated statistics and a PDF report. Irrigation rules use illustrative thresholds, not a trained model.
          </p>
        </div>
      </aside>
    </>
  )
}
