import { Activity, Droplets, Leaf, Sparkles, Tractor } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CropMoistureChart, MoistureTrendChart, StatsTable } from '../components/AnalysisCharts'
import StatCard from '../components/StatCard'
import EmptyState from '../components/EmptyState'
import { useApp } from '../context/AppContext'

function formatWhen(iso) {
  return new Date(iso).toLocaleString()
}

function DatasetDashboard({ dataset, report }) {
  const farms = report.analysis.farms
  const high = report.analysis.urgencyCounts.find((item) => item.label === 'high')?.count ?? 0
  return (
    <div className="space-y-6">
      <div
        className={`rounded-2xl border px-4 py-3 text-sm ${
          dataset.isSynthetic
            ? 'border-amber-200 bg-amber-50 text-amber-950'
            : 'border-emerald-200 bg-emerald-50 text-emerald-950'
        }`}
      >
        {dataset.isSynthetic ? (
          <p>
            <span className="font-semibold">SYNTHETIC TEST DATA.</span> The dashboard is calculated from{' '}
            {dataset.fileName}. These are not real agricultural measurements.
          </p>
        ) : (
          <p>
            Active uploaded dataset: <span className="font-semibold">{dataset.fileName}</span>. Cards, charts, and
            tables on this page use that file. Manual farm records stay on Farm Management and Crop Monitoring.
          </p>
        )}
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Droplets} label="Valid observations" value={report.validation.valid} hint={`${report.validation.rejected} rejected of ${report.validation.total}`} />
        <StatCard icon={Tractor} label="Farms in dataset" value={farms.length} hint="Grouped from valid rows" />
        <StatCard icon={Leaf} label="Crops in dataset" value={report.analysis.crops.length} hint="Distinct crop labels" />
        <StatCard icon={Sparkles} label="Rule-based suggestions" value={report.recommendations.length} hint={`${high} labelled high urgency`} />
      </section>

      <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Measurement statistics</h2>
        <p className="mb-4 text-sm text-slate-500">Each row shows how many valid measurements were used.</p>
        <StatsTable analysis={report.analysis} />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <MoistureTrendChart trends={report.analysis.trends} />
        <CropMoistureChart crops={report.analysis.crops} />
      </section>

      <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Farms in the active dataset</h2>
        {farms.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No valid farm rows are available.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-emerald-100 text-slate-500">
                <tr>
                  <th className="py-2 pr-3 font-medium">Farm</th>
                  <th className="py-2 pr-3 font-medium">Location</th>
                  <th className="py-2 pr-3 font-medium">Crops</th>
                  <th className="py-2 pr-3 font-medium">Records</th>
                  <th className="py-2 font-medium">Avg moisture</th>
                </tr>
              </thead>
              <tbody>
                {farms.map((farm) => (
                  <tr key={farm.label} className="border-b border-slate-100">
                    <td className="py-3 pr-3 font-medium text-slate-900">{farm.label}</td>
                    <td className="py-3 pr-3 text-slate-600">{farm.locations.join(', ') || '—'}</td>
                    <td className="py-3 pr-3 text-slate-600">{farm.crops.join(', ')}</td>
                    <td className="py-3 pr-3 text-slate-600">{farm.n}</td>
                    <td className="py-3 text-slate-600">
                      {farm.moisture ? `${farm.moisture.avg.toFixed(1)}% (n=${farm.moisture.n})` : 'Not available'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-4 text-sm text-slate-600">
          <Link className="font-semibold text-emerald-800" to="/analysis">
            Open Data Analysis
          </Link>{' '}
          to review rejected rows, or{' '}
          <Link className="font-semibold text-emerald-800" to="/reports">
            generate the PDF report
          </Link>
          .
        </p>
      </section>
    </div>
  )
}

export default function Dashboard() {
  const { farms, readings, recommendations, loadDemoData, activeDataset, datasetReport } = useApp()
  if (activeDataset && datasetReport) {
    return <DatasetDashboard dataset={activeDataset} report={datasetReport} />
  }
  const uniqueCrops = new Set(readings.map((item) => item.cropType))
  const chartData = [...readings]
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .slice(-12)
    .map((item) => ({
      label: new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      moisture: item.moisture,
      crop: item.cropType,
    }))

  const activity = [
    ...recommendations.map((item) => ({
      id: `rec-${item.id}`,
      when: item.createdAt,
      text: `${item.result.irrigationAction} for ${item.cropType} at ${item.farmName}`,
      tag: 'Recommendation',
    })),
    ...readings.map((item) => ({
      id: `read-${item.id}`,
      when: item.createdAt,
      text: `${item.cropType} reading: ${item.moisture}% moisture at ${item.farmName}`,
      tag: 'Reading',
    })),
  ]
    .sort((a, b) => new Date(b.when) - new Date(a.when))
    .slice(0, 6)

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        No uploaded dataset is active. The figures below are manual farm records and optional demonstration samples stored in this browser. Upload a file on Data Analysis to replace this view with calculated dataset results.
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Tractor} label="Total farms" value={farms.length} hint="Manual and sample farms" />
        <StatCard icon={Leaf} label="Monitored crops" value={uniqueCrops.size} hint="Distinct crop types in readings" />
        <StatCard icon={Droplets} label="Recorded readings" value={readings.length} hint="Moisture, pH, temperature" />
        <StatCard icon={Sparkles} label="Recommendation count" value={recommendations.length} hint="Rule-based irrigation runs" />
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <article className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm xl:col-span-2">
          <h2 className="text-base font-semibold text-slate-900">Soil moisture trend</h2>
          <p className="mb-4 text-sm text-slate-500">Latest manual or sample readings stored in this browser</p>
          {chartData.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No readings yet"
              description="Load demo data or add a crop reading to populate this chart."
              action={
                <button
                  type="button"
                  onClick={loadDemoData}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Load Demo Data
                </button>
              }
            />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d1fae5" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="moisture" name="Moisture %" stroke="#059669" strokeWidth={2.5} dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Recent activity</h2>
          <p className="mb-4 text-sm text-slate-500">Newest readings and recommendations</p>
          {activity.length === 0 ? (
            <p className="text-sm text-slate-500">No activity stored yet.</p>
          ) : (
            <ul className="space-y-3">
              {activity.map((item) => (
                <li key={item.id} className="rounded-xl border border-slate-100 bg-stone-50 px-3 py-2.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{item.tag}</p>
                  <p className="mt-1 text-sm text-slate-800">{item.text}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatWhen(item.when)}</p>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Manual and sample farms</h2>
        <p className="mb-4 text-sm text-slate-500">Farms stored in this browser. These are separate from an uploaded dataset.</p>
        {farms.length === 0 ? (
          <EmptyState
            icon={Tractor}
            title="No farms on file"
            description="Create a farm or load the marked Sunrise Demo Farm sample."
            action={
              <button
                type="button"
                onClick={loadDemoData}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Load Demo Data
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-emerald-100 text-slate-500">
                <tr>
                  <th className="py-2 pr-3 font-medium">Farm</th>
                  <th className="py-2 pr-3 font-medium">Location</th>
                  <th className="py-2 pr-3 font-medium">Area (ha)</th>
                  <th className="py-2 pr-3 font-medium">Primary crop</th>
                  <th className="py-2 font-medium">Tag</th>
                </tr>
              </thead>
              <tbody>
                {farms.map((farm) => (
                  <tr key={farm.id} className="border-b border-slate-100">
                    <td className="py-3 pr-3 font-medium text-slate-900">{farm.name}</td>
                    <td className="py-3 pr-3 text-slate-600">{farm.location}</td>
                    <td className="py-3 pr-3 text-slate-600">{farm.areaHectares}</td>
                    <td className="py-3 pr-3 text-slate-600">{farm.primaryCrop}</td>
                    <td className="py-3">
                      {farm.isDemo ? (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
                          Sample
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                          User
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
