const STORAGE_KEY = 'agrisense.v1'
const SCHEMA_VERSION = 1

const emptyState = () => ({
  schemaVersion: SCHEMA_VERSION,
  farms: [],
  readings: [],
  recommendations: [],
  datasets: [],
  activeDatasetId: null,
})

function sanitizeDataset(dataset) {
  if (!dataset || typeof dataset !== 'object') return null
  if (!Array.isArray(dataset.rawRows) || typeof dataset.mapping !== 'object' || !dataset.mapping) return null
  if (typeof dataset.id !== 'string') return null
  return {
    id: dataset.id,
    name: String(dataset.name ?? dataset.fileName ?? 'Dataset'),
    fileName: String(dataset.fileName ?? 'dataset.csv'),
    uploadedAt: dataset.uploadedAt || new Date().toISOString(),
    source: dataset.isSynthetic ? 'synthetic' : 'upload',
    isSynthetic: Boolean(dataset.isSynthetic),
    headers: Array.isArray(dataset.headers) ? dataset.headers : [],
    mapping: dataset.mapping,
    rawRows: dataset.rawRows,
    sheetName: String(dataset.sheetName ?? ''),
    headerRow: Number(dataset.headerRow) > 0 ? Number(dataset.headerRow) : 1,
  }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyState()
    const parsed = JSON.parse(raw)
    if (!parsed || (parsed.schemaVersion !== 1 && parsed.schemaVersion !== SCHEMA_VERSION)) return emptyState()
    const datasets = Array.isArray(parsed.datasets) ? parsed.datasets.map(sanitizeDataset).filter(Boolean) : []
    const activeDatasetId = datasets.some((dataset) => dataset.id === parsed.activeDatasetId)
      ? parsed.activeDatasetId
      : null
    return {
      schemaVersion: SCHEMA_VERSION,
      farms: Array.isArray(parsed.farms) ? parsed.farms : [],
      readings: Array.isArray(parsed.readings) ? parsed.readings : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      datasets,
      activeDatasetId,
    }
  } catch {
    return emptyState()
  }
}

export function saveState(state) {
  const payload = {
    schemaVersion: SCHEMA_VERSION,
    farms: state.farms ?? [],
    readings: state.readings ?? [],
    recommendations: state.recommendations ?? [],
    datasets: state.datasets ?? [],
    activeDatasetId: state.activeDatasetId ?? null,
  }
  const text = JSON.stringify(payload)
  if (text.length > 4_500_000) {
    throw new Error('This browser cannot store a dataset that large. Remove a dataset or upload a smaller file.')
  }
  localStorage.setItem(STORAGE_KEY, text)
}

export function clearState() {
  localStorage.removeItem(STORAGE_KEY)
}

export function createId(prefix = 'id') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`
}
