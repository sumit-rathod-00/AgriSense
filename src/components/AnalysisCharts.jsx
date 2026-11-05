import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

function ChartFrame({ title, subtitle, children }) {
  return (
    <article className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {subtitle ? <p className="mb-4 text-sm text-slate-500">{subtitle}</p> : <div className="mb-4" />}
      {children}
    </article>
  )
}

export function StatsTable({ analysis }) {
  const rows = [
    ['Soil moisture (%)', analysis.moisture, 1],
    ['Soil pH', analysis.pH, 2],
    ['Soil temperature (°C)', analysis.temperature, 1],
    ['Humidity (%)', analysis.humidity, 1],
    ['Rainfall (mm)', analysis.rainfall, 1],
  ]
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-emerald-100 text-slate-500">
          <tr>
            <th className="py-2 pr-3 font-medium">Measurement</th>
            <th className="py-2 pr-3 font-medium">Records used</th>
            <th className="py-2 pr-3 font-medium">Average</th>
            <th className="py-2 pr-3 font-medium">Minimum</th>
            <th className="py-2 font-medium">Maximum</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, stat, digits]) => (
            <tr key={label} className="border-b border-slate-100">
              <td className="py-3 pr-3 font-medium text-slate-900">{label}</td>
              <td className="py-3 pr-3 text-slate-600">{stat ? stat.n : 0}</td>
              <td className="py-3 pr-3 text-slate-600">{stat ? stat.avg.toFixed(digits) : 'Not available'}</td>
              <td className="py-3 pr-3 text-slate-600">{stat ? stat.min.toFixed(digits) : '—'}</td>
              <td className="py-3 text-slate-600">{stat ? stat.max.toFixed(digits) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {analysis.rainfall ? (
        <p className="mt-3 text-sm text-slate-600">
          Total of {analysis.rainfall.n} valid rainfall readings: {analysis.rainfall.total.toFixed(1)} mm.
        </p>
      ) : null}
    </div>
  )
}

export function MoistureTrendChart({ trends }) {
  const data = (trends ?? []).filter((point) => point.moistureAvg != null)
  if (data.length === 0) {
    return (
      <ChartFrame title="Soil moisture trend" subtitle="Daily mean from valid dated readings">
        <p className="text-sm text-slate-500">No dated soil moisture readings are available for a trend.</p>
      </ChartFrame>
    )
  }
  return (
    <ChartFrame
      title="Soil moisture trend"
      subtitle={`Daily mean moisture from ${data.length} date${data.length === 1 ? '' : 's'}`}
    >
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d1fae5" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Mean moisture']} />
            <Line type="monotone" dataKey="moistureAvg" name="Mean moisture %" stroke="#059669" strokeWidth={2.5} dot />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  )
}

export function CropMoistureChart({ crops }) {
  const data = (crops ?? [])
    .filter((crop) => crop.moisture)
    .map((crop) => ({ label: crop.label, average: Number(crop.moisture.avg.toFixed(1)), n: crop.moisture.n }))
  if (data.length === 0) {
    return (
      <ChartFrame title="Crop-wise soil moisture" subtitle="Average of valid moisture readings">
        <p className="text-sm text-slate-500">No crop has a valid soil moisture reading.</p>
      </ChartFrame>
    )
  }
  return (
    <ChartFrame title="Crop-wise soil moisture" subtitle="Average of valid moisture readings in each crop">
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d1fae5" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value, _name, item) => [`${value}% (n=${item.payload.n})`, 'Average moisture']} />
            <Bar dataKey="average" name="Average moisture %" fill="#059669" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  )
}

export function DistributionChart({ title, subtitle, data, suffix = '' }) {
  const rows = data ?? []
  const total = rows.reduce((sum, item) => sum + item.count, 0)
  if (total === 0) {
    return (
      <ChartFrame title={title} subtitle={subtitle}>
        <p className="text-sm text-slate-500">No valid readings are available for this distribution.</p>
      </ChartFrame>
    )
  }
  return (
    <ChartFrame title={title} subtitle={subtitle}>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d1fae5" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-20} height={60} textAnchor="end" />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value) => [`${value}${suffix}`, 'Records']} />
            <Bar dataKey="count" name="Records" fill="#0f766e" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  )
}
