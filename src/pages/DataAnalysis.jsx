import { useState } from 'react'
import { Download, FileSpreadsheet, LoaderCircle, Trash2, Upload } from 'lucide-react'
import {
  CropMoistureChart,
  DistributionChart,
  MoistureTrendChart,
  StatsTable,
} from '../components/AnalysisCharts'
import RecommendationTable from '../components/RecommendationTable'
import { useApp } from '../context/AppContext'
import {
  FIELD_DEFS,
  autoMapColumns,
  downloadProcessedCsv,
  downloadRecommendationsCsv,
  mappingIssues,
  parseCsvText,
  parseSpreadsheet,
} from '../lib/dataset'
import { downloadAnalysisReport } from '../lib/reportPdf'

const TEMPLATE_URL = '/sample-data/AgriSense_Farmer_CSV_Template.csv'
const SAMPLE_URL = '/sample-data/AgriSense_Synthetic_Sample_Dataset.csv'
const MAX_BYTES = 2 * 1024 * 1024

function readFile(file, onProgress) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 80))
    }
    reader.onerror = () => reject(new Error('The file could not be read on this computer.'))
    reader.onload = () => resolve(reader.result)
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (extension === 'csv' || file.type.includes('csv') || file.type.startsWith('text/')) {
      reader.readAsText(file)
    } else {
      reader.readAsArrayBuffer(file)
    }
  })
}

export default function DataAnalysis() {
  const {
    datasets,
    activeDataset,
    datasetReport,
    saveDataset,
    setActiveDataset,
    deleteDataset,
    clearDatasets,
    showToast,
  } = useApp()
  const [draft, setDraft] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)
  const [reading, setReading] = useState(false)

  async function ingestFile(file, options = {}) {
    setError('')
    setReading(true)
    setProgress(8)
    try {
      if (!file) throw new Error('Choose a CSV or Excel file.')
      if (file.size > MAX_BYTES) {
        throw new Error('This file is larger than 2 MB. AgriSense stores datasets in the browser, so use a smaller file.')
      }
      const extension = file.name.split('.').pop()?.toLowerCase()
      const isCsv = extension === 'csv' || file.type.includes('csv') || file.type.startsWith('text/')
      const isExcel = extension === 'xlsx' || extension === 'xls'
      if (!isCsv && !isExcel) {
        throw new Error('Upload a CSV (.csv) or Excel (.xlsx, .xls) file.')
      }
      const contents = await readFile(file, setProgress)
      setProgress(90)
      const parsed = isCsv ? parseCsvText(contents) : await parseSpreadsheet(contents)
      setEditingId(options.editingId ?? null)
      setDraft({
        fileName: file.name,
        headers: parsed.headers,
        rows: parsed.rows,
        mapping: autoMapColumns(parsed.headers),
        sheetName: parsed.sheetName || '',
        headerRow: parsed.headerRow || 1,
        isSynthetic: Boolean(options.isSynthetic),
      })
      setProgress(100)
    } catch (caught) {
      setDraft(null)
      setProgress(0)
      setError(caught.message || 'The file could not be processed.')
    } finally {
      setReading(false)
    }
  }

  async function loadSyntheticSample() {
    setError('')
    setReading(true)
    setProgress(25)
    try {
      const response = await fetch(SAMPLE_URL)
      if (!response.ok) throw new Error('The synthetic sample file could not be loaded from this site.')
      const text = await response.text()
      const parsed = parseCsvText(text)
      setEditingId(null)
      setDraft({
        fileName: 'AgriSense_Synthetic_Sample_Dataset.csv',
        headers: parsed.headers,
        rows: parsed.rows,
        mapping: autoMapColumns(parsed.headers),
        sheetName: '',
        headerRow: parsed.headerRow || 1,
        isSynthetic: true,
      })
      setProgress(100)
    } catch (caught) {
      setError(caught.message || 'The synthetic sample could not be opened.')
      setProgress(0)
    } finally {
      setReading(false)
    }
  }

  function updateMapping(key, value) {
    setDraft((current) => (current ? { ...current, mapping: { ...current.mapping, [key]: value } } : current))
  }

  function analyzeDraft() {
    if (!draft) return
    const issues = mappingIssues(draft.mapping)
    if (issues.length > 0) {
      setError(issues[0])
      return
    }
    setError('')
    saveDataset({
      id: editingId ?? undefined,
      name: draft.fileName.replace(/\.[^.]+$/, ''),
      fileName: draft.fileName,
      uploadedAt: editingId ? datasets.find((item) => item.id === editingId)?.uploadedAt : undefined,
      isSynthetic: draft.isSynthetic,
      headers: draft.headers,
      mapping: draft.mapping,
      rawRows: draft.rows,
      sheetName: draft.sheetName,
      headerRow: draft.headerRow,
    })
    window.setTimeout(() => {
      document.getElementById('dataset-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  function editDataset(dataset) {
    setEditingId(dataset.id)
    setError('')
    setDraft({
      fileName: dataset.fileName,
      headers: dataset.headers,
      rows: dataset.rawRows,
      mapping: { ...dataset.mapping },
      sheetName: dataset.sheetName || '',
      headerRow: dataset.headerRow || 1,
      isSynthetic: dataset.isSynthetic,
    })
  }

  function generatePdf() {
    if (!activeDataset || !datasetReport) {
      showToast('error', 'Analyze a dataset before generating a report.')
      return
    }
    try {
      downloadAnalysisReport(activeDataset, datasetReport)
      showToast('success', 'PDF report download started.')
    } catch (caught) {
      showToast('error', caught.message || 'The PDF could not be created.')
    }
  }

  const previewRows = draft?.rows.slice(0, 8) ?? []

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        Upload a farm dataset to calculate statistics and a PDF report in this browser. The bundled sample file is
        synthetic test data, not real agricultural measurements. Missing numbers are never filled in. Irrigation
        thresholds are illustrative and are not scientifically validated.
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <a
          href={TEMPLATE_URL}
          download
          className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm hover:border-emerald-300"
        >
          <p className="text-sm font-semibold text-emerald-800">1. Download Farmer CSV Template</p>
          <p className="mt-2 text-sm text-slate-600">
            Empty file with the standard columns: farm_id, farm_name, location, crop, date, soil_moisture, soil_ph,
            soil_temperature, humidity, rainfall.
          </p>
        </a>
        <a
          href={SAMPLE_URL}
          download
          className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm hover:border-amber-300"
        >
          <p className="text-sm font-semibold text-amber-950">2. Download Sample Dataset</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-amber-800">Synthetic test data</p>
          <p className="mt-2 text-sm text-amber-950">
            A small invented file for trying the analyzer. It is not a record of real field measurements.
          </p>
        </a>
      </section>

      <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Upload a dataset</h2>
            <p className="mt-1 text-sm text-slate-500">
              One row is one observation. Soil moisture and humidity are percentages, soil pH is 0–14, soil temperature
              is Celsius, and rainfall is millimetres. Optional columns can be left blank.
            </p>
          </div>
          <button
            type="button"
            onClick={loadSyntheticSample}
            disabled={reading}
            className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-950 hover:bg-amber-100"
          >
            Load synthetic sample
          </button>
        </div>

        <label
          className="mt-4 flex cursor-pointer flex-col items-center rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/40 px-4 py-8 text-center"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault()
            const file = event.dataTransfer.files?.[0]
            if (file) ingestFile(file)
          }}
        >
          <Upload className="h-6 w-6 text-emerald-700" />
          <span className="mt-2 text-sm font-medium text-slate-800">Drop a CSV or Excel file, or click to browse</span>
          <span className="mt-1 text-xs text-slate-500">.csv, .xlsx, .xls up to 2 MB</span>
          <input
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (file) ingestFile(file)
            }}
          />
        </label>

        {reading || progress > 0 ? (
          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
              <span>{reading ? 'Reading file…' : 'File ready for mapping'}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-emerald-100">
              <div className="h-full bg-emerald-600" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}
      </section>

      {draft ? (
        <section className="space-y-4 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Preview and column mapping</h2>
              <p className="mt-1 text-sm text-slate-500">
                {draft.fileName} · {draft.rows.length} data row{draft.rows.length === 1 ? '' : 's'} · showing the first{' '}
                {previewRows.length}
                {draft.sheetName ? ` · worksheet ${draft.sheetName}` : ''}
              </p>
            </div>
            {draft.isSynthetic ? (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-900">
                Synthetic test data
              </span>
            ) : (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                Uploaded file
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="border-b border-emerald-100 text-slate-500">
                <tr>
                  {draft.headers.map((header) => (
                    <th key={header} className="py-2 pr-3 font-medium">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, index) => (
                  <tr key={index} className="border-b border-slate-100">
                    {draft.headers.map((header) => (
                      <td key={header} className="py-2 pr-3 text-slate-700">
                        {row[header] || '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {FIELD_DEFS.map((field) => (
              <label key={field.key} className="block text-sm font-medium text-slate-700">
                {field.label}
                {field.kind === 'measurement' ? ' (measurement)' : ' (optional)'}
                <select
                  value={draft.mapping[field.key] ?? ''}
                  onChange={(event) => updateMapping(field.key, event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-emerald-500 focus:ring-2"
                >
                  <option value="">Not mapped</option>
                  {draft.headers.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <button
            type="button"
            onClick={analyzeDraft}
            disabled={reading}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            {reading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            {editingId ? 'Reprocess this dataset' : 'Validate and analyze'}
          </button>
          <p className="text-xs text-slate-500">
            {editingId
              ? 'Reprocessing keeps this dataset and replaces its mapping and results. Other datasets stay saved.'
              : 'This adds a dataset and makes it the active file. It does not overwrite other uploads or manual farm records.'}
          </p>
        </section>
      ) : null}

      <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Saved datasets</h2>
            <p className="mt-1 text-sm text-slate-500">Choose the file that drives the dashboard, recommendations, and PDF.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              const confirmed = window.confirm(
                'Delete every uploaded dataset stored in this browser? Farms and manual crop readings will be kept.',
              )
              if (!confirmed) return
              clearDatasets()
              setDraft(null)
              setEditingId(null)
            }}
            disabled={datasets.length === 0}
            className="rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            Clear uploaded data
          </button>
        </div>
        {datasets.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No dataset has been analyzed yet.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {datasets.map((dataset) => {
              const active = dataset.id === activeDataset?.id
              return (
                <li key={dataset.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {dataset.fileName}
                      {active ? (
                        <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                          Active
                        </span>
                      ) : null}
                      {dataset.isSynthetic ? (
                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                          Synthetic test data
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-slate-500">
                      {dataset.rawRows.length} rows · saved {new Date(dataset.uploadedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!active ? (
                      <button
                        type="button"
                        onClick={() => setActiveDataset(dataset.id)}
                        className="rounded-lg border border-emerald-200 px-2 py-1 text-xs font-medium text-emerald-800"
                      >
                        Make active
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => editDataset(dataset)}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700"
                    >
                      Edit mapping
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const confirmed = window.confirm(`Delete ${dataset.fileName}?`)
                        if (!confirmed) return
                        deleteDataset(dataset.id)
                        if (editingId === dataset.id) {
                          setDraft(null)
                          setEditingId(null)
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {activeDataset && datasetReport ? (
        <div id="dataset-results" className="space-y-6">
          <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Validation and analysis</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Active file: {activeDataset.fileName}
                  {datasetReport.analysis.dateRange
                    ? ` · ${datasetReport.analysis.dateRange.start} to ${datasetReport.analysis.dateRange.end}`
                    : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={generatePdf}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  <Download className="h-4 w-4" />
                  Generate Report
                </button>
                <button
                  type="button"
                  disabled={datasetReport.records.length === 0}
                  onClick={() => downloadProcessedCsv(activeDataset, datasetReport)}
                  className="rounded-xl border border-emerald-200 px-3 py-2 text-sm font-medium text-emerald-800 disabled:opacity-50"
                >
                  Processed CSV
                </button>
                <button
                  type="button"
                  disabled={datasetReport.recommendations.length === 0}
                  onClick={() => downloadRecommendationsCsv(activeDataset, datasetReport)}
                  className="rounded-xl border border-emerald-200 px-3 py-2 text-sm font-medium text-emerald-800 disabled:opacity-50"
                >
                  Recommendations CSV
                </button>
              </div>
            </div>

            {activeDataset.isSynthetic ? (
              <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-950">
                SYNTHETIC TEST DATA. These figures are calculated from the sample file, not from a real farm survey.
              </p>
            ) : (
              <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                Figures below are calculated from the uploaded file. Demonstration farm cards are not mixed into these totals.
              </p>
            )}

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ['Total rows', datasetReport.validation.total],
                ['Valid rows', datasetReport.validation.valid],
                ['Rejected rows', datasetReport.validation.rejected],
                ['Duplicate rows', datasetReport.validation.duplicates],
              ].map(([label, value]) => (
                <article key={label} className="rounded-2xl border border-emerald-100 bg-stone-50 p-4">
                  <p className="text-sm text-slate-500">{label}</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
                </article>
              ))}
            </div>

            <h3 className="mt-6 text-sm font-semibold text-slate-900">Field-wise validation</h3>
            <p className="mt-1 text-xs text-slate-500">Counts include every data row in the file, including rows later rejected as duplicates.</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-emerald-100 text-slate-500">
                  <tr>
                    <th className="py-2 pr-3 font-medium">Field</th>
                    <th className="py-2 pr-3 font-medium">Column</th>
                    <th className="py-2 pr-3 font-medium">Valid</th>
                    <th className="py-2 pr-3 font-medium">Missing</th>
                    <th className="py-2 font-medium">Invalid</th>
                  </tr>
                </thead>
                <tbody>
                  {FIELD_DEFS.map((field) => {
                    const summary = datasetReport.validation.fieldSummary[field.key]
                    return (
                      <tr key={field.key} className="border-b border-slate-100">
                        <td className="py-2 pr-3 font-medium text-slate-800">{field.label}</td>
                        <td className="py-2 pr-3 text-slate-600">{summary.mapped ? summary.column : 'Not mapped'}</td>
                        <td className="py-2 pr-3 text-slate-600">{summary.mapped ? summary.valid : '—'}</td>
                        <td className="py-2 pr-3 text-slate-600">{summary.mapped ? summary.missing : '—'}</td>
                        <td className="py-2 text-slate-600">{summary.mapped ? summary.invalid : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {datasetReport.rejected.length > 0 ? (
              <>
                <h3 className="mt-6 text-sm font-semibold text-slate-900">Rejected rows</h3>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="border-b border-emerald-100 text-slate-500">
                      <tr>
                        <th className="py-2 pr-3 font-medium">Row</th>
                        <th className="py-2 font-medium">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {datasetReport.rejected.slice(0, 20).map((row) => (
                        <tr key={row.rowNumber} className="border-b border-slate-100 align-top">
                          <td className="py-2 pr-3 text-slate-600">{row.rowNumber}</td>
                          <td className="py-2 text-slate-700">{row.reasons.join(' ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {datasetReport.rejected.length > 20 ? (
                  <p className="mt-2 text-xs text-slate-500">Showing 20 of {datasetReport.rejected.length} rejected rows.</p>
                ) : null}
              </>
            ) : (
              <p className="mt-4 text-sm text-emerald-800">Every data row passed validation.</p>
            )}
          </section>

          <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Agricultural statistics</h2>
            <p className="mb-4 mt-1 text-sm text-slate-500">Calculated only from valid measurements in the active dataset.</p>
            <StatsTable analysis={datasetReport.analysis} />
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <MoistureTrendChart trends={datasetReport.analysis.trends} />
            <CropMoistureChart crops={datasetReport.analysis.crops} />
            <DistributionChart
              title="Soil condition distribution"
              subtitle="Illustrative moisture bands. Not a laboratory classification."
              data={datasetReport.analysis.soilConditions}
            />
            <DistributionChart
              title="Irrigation requirement distribution"
              subtitle="Rule-based actions for rows with moisture, pH, and temperature."
              data={datasetReport.analysis.irrigationActions}
            />
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <article className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">Crop-wise analysis</h2>
              <GroupTable rows={datasetReport.analysis.crops} nameLabel="Crop" />
            </article>
            <article className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">Farm-wise analysis</h2>
              <GroupTable rows={datasetReport.analysis.farms} nameLabel="Farm" />
            </article>
          </section>

          <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Observations from this dataset</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
              {datasetReport.observations.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Batch irrigation recommendations</h2>
            <p className="mb-4 mt-1 text-sm text-slate-500">
              {datasetReport.recommendations.length} eligible row
              {datasetReport.recommendations.length === 1 ? '' : 's'} of {datasetReport.validation.valid} valid rows.
              Humidity and rainfall are listed for context and are not used by the rules.
            </p>
            <RecommendationTable rows={datasetReport.recommendations} />
          </section>
        </div>
      ) : null}
    </div>
  )
}

function GroupTable({ rows, nameLabel }) {
  if (!rows.length) {
    return <p className="mt-3 text-sm text-slate-500">No valid records to group.</p>
  }
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead className="border-b border-emerald-100 text-slate-500">
          <tr>
            <th className="py-2 pr-3 font-medium">{nameLabel}</th>
            <th className="py-2 pr-3 font-medium">Records</th>
            <th className="py-2 pr-3 font-medium">Avg moisture</th>
            <th className="py-2 font-medium">Avg pH</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-slate-100">
              <td className="py-2 pr-3 font-medium text-slate-900">{row.label}</td>
              <td className="py-2 pr-3 text-slate-600">{row.n}</td>
              <td className="py-2 pr-3 text-slate-600">
                {row.moisture ? `${row.moisture.avg.toFixed(1)}% (n=${row.moisture.n})` : 'Not available'}
              </td>
              <td className="py-2 text-slate-600">{row.pH ? `${row.pH.avg.toFixed(2)} (n=${row.pH.n})` : 'Not available'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
