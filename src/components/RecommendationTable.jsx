import { useState } from 'react'

const URGENCY_STYLES = {
  high: 'bg-red-50 text-red-800',
  medium: 'bg-amber-50 text-amber-800',
  low: 'bg-emerald-50 text-emerald-800',
}

function cell(value, suffix = '') {
  if (value == null || value === '') return '—'
  return `${value}${suffix}`
}

export default function RecommendationTable({ rows }) {
  const [expanded, setExpanded] = useState(false)
  if (!rows?.length) {
    return (
      <p className="text-sm text-slate-500">
        No row had soil moisture, soil pH, and soil temperature together, so the rule engine was not run.
      </p>
    )
  }
  const visible = expanded ? rows : rows.slice(0, 12)
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="border-b border-emerald-100 text-slate-500">
            <tr>
              <th className="py-2 pr-3 font-medium">Row</th>
              <th className="py-2 pr-3 font-medium">Date</th>
              <th className="py-2 pr-3 font-medium">Farm</th>
              <th className="py-2 pr-3 font-medium">Crop</th>
              <th className="py-2 pr-3 font-medium">Measurements</th>
              <th className="py-2 pr-3 font-medium">Recommendation</th>
              <th className="py-2 font-medium">Explanation</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((item) => (
              <tr key={`${item.rowNumber}-${item.cropLabel}`} className="border-b border-slate-100 align-top">
                <td className="py-3 pr-3 text-slate-600">{item.rowNumber}</td>
                <td className="py-3 pr-3 text-slate-600">{item.date || '—'}</td>
                <td className="py-3 pr-3 font-medium text-slate-900">{item.farmLabel}</td>
                <td className="py-3 pr-3 text-slate-700">{item.cropLabel}</td>
                <td className="py-3 pr-3 text-slate-600">
                  {cell(item.moisture, '%')} moisture · pH {cell(item.pH)} · {cell(item.temperature, '°C')}
                  <span className="mt-1 block text-xs text-slate-500">
                    Humidity {cell(item.humidity, '%')} · Rainfall {cell(item.rainfall, ' mm')}
                  </span>
                </td>
                <td className="py-3 pr-3">
                  <p className="font-medium text-slate-900">{item.result.irrigationAction}</p>
                  <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${URGENCY_STYLES[item.result.urgency] ?? ''}`}>
                    {item.result.urgency} urgency
                  </span>
                </td>
                <td className="py-3">
                  <ul className="list-disc space-y-1 pl-4 text-slate-700">
                    {item.result.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                    {item.result.modifiers.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-slate-500">Illustrative thresholds: {item.thresholds.join('; ')}.</p>
                  <p className="mt-1 text-xs text-slate-500">{item.result.disclaimer}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 12 ? (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="mt-3 text-sm font-semibold text-emerald-800"
        >
          {expanded ? 'Show fewer rows' : `Show all ${rows.length} recommendations`}
        </button>
      ) : null}
    </div>
  )
}
