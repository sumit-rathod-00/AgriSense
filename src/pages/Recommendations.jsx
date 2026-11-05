import { useMemo, useState } from 'react'
import { LoaderCircle, Sparkles } from 'lucide-react'
import EmptyState from '../components/EmptyState'
import RecommendationTable from '../components/RecommendationTable'
import { useApp } from '../context/AppContext'
import {
  CROP_TYPES,
  DEMONSTRATION_THRESHOLDS,
  generateRecommendation,
  validateRecommendationInput,
} from '../lib/recommendationEngine'

const emptyForm = {
  farmId: '',
  cropType: 'Tomato',
  moisture: '',
  pH: '',
  temperature: '',
}

const URGENCY_STYLES = {
  high: 'bg-red-50 text-red-800 border-red-200',
  medium: 'bg-amber-50 text-amber-800 border-amber-200',
  low: 'bg-emerald-50 text-emerald-800 border-emerald-200',
}

export default function Recommendations() {
  const {
    farms,
    recommendations,
    addRecommendation,
    deleteRecommendation,
    loadDemoData,
    showToast,
    activeDataset,
    datasetReport,
  } = useApp()
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [latest, setLatest] = useState(null)
  const [loading, setLoading] = useState(false)

  const selectedFarm = farms.find((farm) => farm.id === form.farmId)

  const thresholdRows = useMemo(
    () => [
      ['Moisture very dry', `< ${DEMONSTRATION_THRESHOLDS.moisture.veryDry}%`],
      ['Moisture dry', `< ${DEMONSTRATION_THRESHOLDS.moisture.dry}%`],
      ['Moisture adequate max', `${DEMONSTRATION_THRESHOLDS.moisture.adequateMax}%`],
      ['Moisture wet', `> ${DEMONSTRATION_THRESHOLDS.moisture.wet}%`],
      ['pH acidic band', `< ${DEMONSTRATION_THRESHOLDS.pH.acidic}`],
      ['pH alkaline band', `> ${DEMONSTRATION_THRESHOLDS.pH.alkaline}`],
      ['Temperature cold', `< ${DEMONSTRATION_THRESHOLDS.temperatureC.cold}°C`],
      ['Temperature hot', `> ${DEMONSTRATION_THRESHOLDS.temperatureC.hot}°C`],
    ],
    [],
  )

  async function handleGenerate(event) {
    event.preventDefault()
    const farmName = selectedFarm?.name ?? ''
    const check = validateRecommendationInput({
      farmName,
      cropType: form.cropType,
      moisture: form.moisture,
      pH: form.pH,
      temperature: form.temperature,
    })
    const nextErrors = { ...check.errors }
    if (!form.farmId) nextErrors.farmName = 'Select a farm.'
    setErrors(nextErrors)
    if (!check.ok || !form.farmId) {
      showToast('error', 'Please complete all required fields with valid values.')
      return
    }

    setLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 450))
    const result = generateRecommendation(check.values)
    const record = addRecommendation({
      farmId: selectedFarm.id,
      farmName: selectedFarm.name,
      cropType: check.values.cropType,
      moisture: check.values.moisture,
      pH: check.values.pH,
      temperature: check.values.temperature,
      result,
    })
    setLatest({ ...record, result })
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        This page uses a transparent, configurable rule set with demonstration thresholds. It is not a trained machine
        learning model and is not scientifically validated agricultural advice.
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <form onSubmit={handleGenerate} className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm xl:col-span-3">
          <h2 className="text-base font-semibold text-slate-900">Generate irrigation recommendation</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Farm name
              <select
                value={form.farmId}
                onChange={(e) => setForm((prev) => ({ ...prev, farmId: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-emerald-500 focus:ring-2"
              >
                <option value="">Select farm</option>
                {farms.map((farm) => (
                  <option key={farm.id} value={farm.id}>
                    {farm.name}
                  </option>
                ))}
              </select>
              {errors.farmName ? <span className="text-xs text-red-600">{errors.farmName}</span> : null}
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Crop type
              <select
                value={form.cropType}
                onChange={(e) => setForm((prev) => ({ ...prev, cropType: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-emerald-500 focus:ring-2"
              >
                {CROP_TYPES.map((crop) => (
                  <option key={crop} value={crop}>
                    {crop}
                  </option>
                ))}
              </select>
              {errors.cropType ? <span className="text-xs text-red-600">{errors.cropType}</span> : null}
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Soil moisture (%)
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.moisture}
                onChange={(e) => setForm((prev) => ({ ...prev, moisture: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-emerald-500 focus:ring-2"
              />
              {errors.moisture ? <span className="text-xs text-red-600">{errors.moisture}</span> : null}
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Soil pH
              <input
                type="number"
                min="0"
                max="14"
                step="0.1"
                value={form.pH}
                onChange={(e) => setForm((prev) => ({ ...prev, pH: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-emerald-500 focus:ring-2"
              />
              {errors.pH ? <span className="text-xs text-red-600">{errors.pH}</span> : null}
            </label>
            <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
              Soil temperature (°C)
              <input
                type="number"
                min="-10"
                max="60"
                step="0.1"
                value={form.temperature}
                onChange={(e) => setForm((prev) => ({ ...prev, temperature: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-emerald-500 focus:ring-2"
              />
              {errors.temperature ? <span className="text-xs text-red-600">{errors.temperature}</span> : null}
            </label>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-70"
          >
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? 'Evaluating demonstration rules…' : 'Generate Recommendation'}
          </button>
          {farms.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              Add a farm or{' '}
              <button type="button" className="font-semibold text-emerald-700" onClick={loadDemoData}>
                Load Demo Data
              </button>{' '}
              first.
            </p>
          ) : null}
        </form>

        <aside className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm xl:col-span-2">
          <h2 className="text-base font-semibold text-slate-900">Demonstration thresholds</h2>
          <p className="mt-1 text-sm text-slate-500">Illustrative values used by the rule engine.</p>
          <ul className="mt-4 space-y-2 text-sm">
            {thresholdRows.map(([label, value]) => (
              <li key={label} className="flex items-center justify-between gap-3 rounded-xl bg-stone-50 px-3 py-2">
                <span className="text-slate-600">{label}</span>
                <span className="font-semibold text-slate-900">{value}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      {latest ? (
        <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Latest result</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl bg-stone-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Input summary</p>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-slate-500">Farm</dt>
                  <dd className="font-medium text-slate-900">{latest.farmName}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Crop</dt>
                  <dd className="font-medium text-slate-900">{latest.cropType}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Moisture</dt>
                  <dd className="font-medium text-slate-900">{latest.moisture}%</dd>
                </div>
                <div>
                  <dt className="text-slate-500">pH</dt>
                  <dd className="font-medium text-slate-900">{latest.pH}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Temperature</dt>
                  <dd className="font-medium text-slate-900">{latest.temperature}°C</dd>
                </div>
              </dl>
            </div>
            <div className={`rounded-2xl border p-4 ${URGENCY_STYLES[latest.result.urgency]}`}>
              <p className="text-xs font-semibold uppercase tracking-wide">Recommendation</p>
              <p className="mt-2 text-xl font-semibold">{latest.result.irrigationAction}</p>
              <p className="mt-2 text-sm">{latest.result.volumeHint}</p>
              <p className="mt-3 text-xs">Urgency: {latest.result.urgency}</p>
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-slate-900">Reasoning</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {latest.result.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
              {latest.result.modifiers.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-slate-500">{latest.result.disclaimer}</p>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Dataset batch recommendations</h2>
        <p className="mt-1 text-sm text-slate-500">
          Every eligible row in the active dataset is scored with the same rule engine as the form above. Thresholds
          are illustrative and are not scientifically validated.
        </p>
        {!activeDataset || !datasetReport ? (
          <p className="mt-4 text-sm text-slate-500">
            Upload a dataset on Data Analysis to run the rules on every row that has moisture, pH, and temperature.
          </p>
        ) : (
          <div className="mt-4">
            {activeDataset.isSynthetic ? (
              <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-950">
                SYNTHETIC TEST DATA from {activeDataset.fileName}.
              </p>
            ) : (
              <p className="mb-3 text-sm text-slate-600">Active file: {activeDataset.fileName}.</p>
            )}
            <RecommendationTable rows={datasetReport.recommendations} />
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Previous manual recommendations</h2>
        {recommendations.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={Sparkles}
              title="No recommendation history"
              description="Generate a recommendation or load demo data to fill this table."
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
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-emerald-100 text-slate-500">
                <tr>
                  <th className="py-2 pr-3 font-medium">When</th>
                  <th className="py-2 pr-3 font-medium">Farm</th>
                  <th className="py-2 pr-3 font-medium">Crop</th>
                  <th className="py-2 pr-3 font-medium">Inputs</th>
                  <th className="py-2 pr-3 font-medium">Action</th>
                  <th className="py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recommendations.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 align-top">
                    <td className="py-3 pr-3 text-slate-600">{new Date(item.createdAt).toLocaleString()}</td>
                    <td className="py-3 pr-3 font-medium">
                      {item.farmName}
                      {item.isDemo ? (
                        <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
                          Sample
                        </span>
                      ) : null}
                    </td>
                    <td className="py-3 pr-3">{item.cropType}</td>
                    <td className="py-3 pr-3 text-slate-600">
                      {item.moisture}% · pH {item.pH} · {item.temperature}°C
                    </td>
                    <td className="py-3 pr-3">
                      <p className="font-medium text-slate-900">{item.result.irrigationAction}</p>
                      <p className="text-xs text-slate-500">{item.result.reasons[0]}</p>
                    </td>
                    <td className="py-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (latest?.id === item.id) setLatest(null)
                          deleteRecommendation(item.id)
                        }}
                        className="rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </button>
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
