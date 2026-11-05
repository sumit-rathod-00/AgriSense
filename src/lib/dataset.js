import { downloadCsv, toCsv } from './csv'
import {
  CROP_PROFILES,
  CROP_TYPES,
  DEMONSTRATION_THRESHOLDS,
  generateRecommendation,
} from './recommendationEngine'

export const FIELD_DEFS = [
  {
    key: 'farm_id',
    label: 'Farm ID',
    kind: 'text',
    aliases: ['farm_id', 'farmid'],
  },
  {
    key: 'farm_name',
    label: 'Farm name',
    kind: 'text',
    aliases: ['farm_name', 'farmname', 'farm'],
  },
  {
    key: 'location',
    label: 'Location',
    kind: 'text',
    aliases: ['location', 'loc', 'place', 'region'],
  },
  {
    key: 'crop',
    label: 'Crop',
    kind: 'text',
    aliases: ['crop', 'crop_type', 'croptype', 'cropname', 'crop_name'],
  },
  {
    key: 'date',
    label: 'Date',
    kind: 'date',
    aliases: ['date', 'timestamp', 'datetime', 'recorded_at', 'observation_date', 'obs_date'],
  },
  {
    key: 'soil_moisture',
    label: 'Soil moisture',
    kind: 'measurement',
    unit: '%',
    min: 0,
    max: 100,
    aliases: [
      'soil_moisture',
      'moisture',
      'sm',
      'soilmoisture',
      'moisture_percent',
      'moisture_pct',
      'soil_moisture_pct',
      'soil_moisture_percent',
    ],
  },
  {
    key: 'soil_ph',
    label: 'Soil pH',
    kind: 'measurement',
    unit: '',
    min: 0,
    max: 14,
    aliases: ['soil_ph', 'ph', 'soilph', 'ph_value'],
  },
  {
    key: 'soil_temperature',
    label: 'Soil temperature',
    kind: 'measurement',
    unit: '°C',
    min: -10,
    max: 60,
    aliases: [
      'soil_temperature',
      'temperature',
      'temp',
      'soil_temp',
      'soiltemp',
      'temp_c',
      'soil_temp_c',
      'soil_temperature_c',
      'temperature_c',
      'temperature_celsius',
      'soil_temperature_celsius',
    ],
  },
  {
    key: 'humidity',
    label: 'Humidity',
    kind: 'measurement',
    unit: '%',
    min: 0,
    max: 100,
    aliases: ['humidity', 'humidity_percent', 'humidity_pct', 'relative_humidity', 'rh'],
  },
  {
    key: 'rainfall',
    label: 'Rainfall',
    kind: 'measurement',
    unit: 'mm',
    min: 0,
    max: 1000,
    aliases: ['rainfall', 'rainfall_mm', 'rain_mm', 'rain', 'precipitation', 'precip_mm', 'precip'],
  },
]

const MEASUREMENT_KEYS = FIELD_DEFS.filter((field) => field.kind === 'measurement').map((field) => field.key)
const MAX_TEXT = 500

export function normalizeHeader(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function autoMapColumns(headers) {
  const mapping = {}
  const used = new Set()
  for (const field of FIELD_DEFS) {
    const match = headers.find((header) => {
      if (!header || used.has(header)) return false
      return field.aliases.includes(normalizeHeader(header))
    })
    mapping[field.key] = match ?? ''
    if (match) used.add(match)
  }
  return mapping
}

export function mappingIssues(mapping) {
  const issues = []
  const selected = Object.entries(mapping).filter(([, header]) => header)
  const headers = selected.map(([, header]) => header)
  if (new Set(headers).size !== headers.length) {
    issues.push('Each source column can only be mapped to one field.')
  }
  const measurementMapped = MEASUREMENT_KEYS.some((key) => mapping[key])
  if (!measurementMapped) {
    issues.push(
      'Map at least one agricultural measurement: soil moisture, soil pH, soil temperature, humidity, or rainfall.',
    )
  }
  return issues
}

function uniqueHeaders(headers) {
  const seen = new Map()
  return headers.map((header, index) => {
    const base = String(header ?? '').trim() || `Column ${index + 1}`
    const count = seen.get(base) ?? 0
    seen.set(base, count + 1)
    return count === 0 ? base : `${base} (${count + 1})`
  })
}

function cellToString(value) {
  if (value == null || value === '') return ''
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return ''
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const day = String(value.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  return String(value).trim()
}

function headerScore(headers) {
  return Object.values(autoMapColumns(headers)).filter(Boolean).length
}

function tableFromMatrix(matrix, sheetName = '') {
  const cleaned = matrix
    .map((row) => (Array.isArray(row) ? row : []))
    .filter((row) => row.some((cell) => cellToString(cell) !== ''))
  if (cleaned.length < 2) {
    throw new Error('The file needs a header row and at least one data row.')
  }

  let headerIndex = 0
  const firstHeaders = uniqueHeaders(cleaned[0].map(cellToString))
  const secondHeaders = uniqueHeaders((cleaned[1] ?? []).map(cellToString))
  if (headerScore(secondHeaders) >= 2 && headerScore(secondHeaders) > headerScore(firstHeaders)) {
    headerIndex = 1
  }

  const headers = uniqueHeaders(cleaned[headerIndex].map(cellToString))
  const rows = cleaned.slice(headerIndex + 1).map((row) => {
    const record = {}
    headers.forEach((header, index) => {
      record[header] = cellToString(row[index])
    })
    return record
  })

  if (rows.length === 0) {
    throw new Error('No data rows were found under the header.')
  }

  return { headers, rows, sheetName, headerRow: headerIndex + 1 }
}

function parseCsvMatrix(text) {
  const cleaned = String(text ?? '').replace(/^\uFEFF/, '')
  if (!cleaned.trim()) throw new Error('The CSV file is empty.')
  const firstLine = cleaned.split(/\r?\n/, 1)[0] ?? ''
  const commas = (firstLine.match(/,/g) || []).length
  const semis = (firstLine.match(/;/g) || []).length
  const delimiter = semis > commas ? ';' : ','
  const rows = []
  let row = []
  let cell = ''
  let inQuotes = false

  for (let index = 0; index < cleaned.length; index += 1) {
    const char = cleaned[index]
    if (inQuotes) {
      if (char === '"') {
        if (cleaned[index + 1] === '"') {
          cell += '"'
          index += 1
        } else {
          inQuotes = false
        }
      } else {
        cell += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === delimiter) {
      row.push(cell)
      cell = ''
    } else if (char === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else if (char !== '\r') {
      cell += char
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }
  return rows
}

export function parseCsvText(text) {
  return tableFromMatrix(parseCsvMatrix(text))
}

export async function parseSpreadsheet(arrayBuffer) {
  const loaded = await import('xlsx')
  const XLSX = loaded.read ? loaded : loaded.default
  let workbook
  try {
    workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true })
  } catch {
    throw new Error('The Excel file could not be read. Use a valid .xlsx or .xls workbook.')
  }
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) throw new Error('The workbook has no worksheets.')
  const sheet = workbook.Sheets[sheetName]
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' })
  return tableFromMatrix(matrix, sheetName)
}

function cleanText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

function parseDate(raw) {
  const text = cleanText(raw)
  if (!text || /^(na|n\/a|null|none|nan|—|-)$/i.test(text)) return { kind: 'empty' }
  const isoMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (isoMatch) {
    const iso = `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`
    const parsed = new Date(`${iso}T00:00:00`)
    if (!Number.isNaN(parsed.getTime()) && parsed.getFullYear() > 1900 && parsed.getFullYear() < 2200) {
      return { kind: 'date', value: iso }
    }
  }
  const localMatch = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/)
  if (localMatch) {
    const iso = `${localMatch[3]}-${localMatch[2].padStart(2, '0')}-${localMatch[1].padStart(2, '0')}`
    const parsed = new Date(`${iso}T00:00:00`)
    if (!Number.isNaN(parsed.getTime())) return { kind: 'date', value: iso }
  }
  const parsed = new Date(text)
  if (!Number.isNaN(parsed.getTime()) && parsed.getFullYear() > 1900 && parsed.getFullYear() < 2200) {
    const iso = parsed.toISOString().slice(0, 10)
    return { kind: 'date', value: iso }
  }
  return { kind: 'invalid', raw: text }
}

function parseMeasurement(raw) {
  const original = cleanText(raw)
  if (!original || /^(na|n\/a|null|none|nan|—|-)$/i.test(original)) return { kind: 'empty' }
  const numeric = original.replace(/,/g, '').replace(/%|°|degrees|celsius|mm|ph/gi, '').trim()
  const value = Number(numeric)
  if (!Number.isFinite(value)) return { kind: 'invalid', raw: original }
  return { kind: 'number', value, raw: original }
}

export function canonicalCrop(value) {
  const text = cleanText(value)
  if (!text) return ''
  const match = CROP_TYPES.find((crop) => crop.toLowerCase() === text.toLowerCase())
  return match ?? text
}

export function displayFarm(record) {
  if (record.farmName) return record.farmName
  if (record.farmId) return `Farm ${record.farmId}`
  return 'Unspecified farm'
}

export function displayCrop(record) {
  return canonicalCrop(record.crop) || 'Unspecified crop'
}

function numStats(values) {
  const nums = values.filter((value) => typeof value === 'number' && Number.isFinite(value))
  if (nums.length === 0) return null
  let min = nums[0]
  let max = nums[0]
  let sum = 0
  for (const value of nums) {
    if (value < min) min = value
    if (value > max) max = value
    sum += value
  }
  return { min, max, avg: sum / nums.length, n: nums.length, total: sum }
}

export function moistureBand(moisture) {
  const bands = DEMONSTRATION_THRESHOLDS.moisture
  if (moisture < bands.veryDry) return 'Very dry'
  if (moisture < bands.dry) return 'Dry'
  if (moisture <= bands.adequateMax) return 'Adequate'
  if (moisture <= bands.wet) return 'Wet'
  return 'Very wet'
}

export function phBand(pH) {
  const bands = DEMONSTRATION_THRESHOLDS.pH
  if (pH < bands.stronglyAcidic) return 'Strongly acidic'
  if (pH < bands.acidic) return 'Acidic'
  if (pH <= bands.alkaline) return 'Preferred window'
  if (pH <= bands.stronglyAlkaline) return 'Alkaline'
  return 'Strongly alkaline'
}

export function listTriggeredThresholds(input) {
  const thresholds = DEMONSTRATION_THRESHOLDS
  const hits = []
  const { moisture, pH, temperature, cropType } = input
  if (moisture < thresholds.moisture.veryDry) hits.push(`Moisture below ${thresholds.moisture.veryDry}% (very dry)`)
  else if (moisture < thresholds.moisture.dry) hits.push(`Moisture below ${thresholds.moisture.dry}% (dry)`)
  else if (moisture <= thresholds.moisture.adequateMax) {
    hits.push(`Moisture inside ${thresholds.moisture.dry}–${thresholds.moisture.adequateMax}% (adequate)`)
  } else if (moisture <= thresholds.moisture.wet) {
    hits.push(`Moisture above ${thresholds.moisture.adequateMax}% (wet)`)
  } else hits.push(`Moisture above ${thresholds.moisture.wet}% (very wet)`)

  const profile = CROP_PROFILES[cropType]
  if (profile) {
    const gap = profile.targetMoisture - moisture
    if (gap >= 20 && moisture < thresholds.moisture.wet) {
      hits.push(`${cropType} illustrative target moisture about ${profile.targetMoisture}%`)
    } else if (gap <= -15) {
      hits.push(`Moisture above the ${cropType} illustrative target of ${profile.targetMoisture}%`)
    }
  }

  if (pH < thresholds.pH.stronglyAcidic) hits.push(`pH below ${thresholds.pH.stronglyAcidic} (strongly acidic)`)
  else if (pH < thresholds.pH.acidic) hits.push(`pH below ${thresholds.pH.acidic} (acidic)`)
  else if (pH > thresholds.pH.stronglyAlkaline) hits.push(`pH above ${thresholds.pH.stronglyAlkaline} (strongly alkaline)`)
  else if (pH > thresholds.pH.alkaline) hits.push(`pH above ${thresholds.pH.alkaline} (alkaline)`)
  else hits.push(`pH inside ${thresholds.pH.acidic}–${thresholds.pH.alkaline} (preferred window)`)

  if (temperature < thresholds.temperatureC.cold) hits.push(`Temperature below ${thresholds.temperatureC.cold}°C (cold)`)
  else if (temperature > thresholds.temperatureC.hot) hits.push(`Temperature above ${thresholds.temperatureC.hot}°C (hot)`)
  else if (temperature > thresholds.temperatureC.warmMax) {
    hits.push(`Temperature above ${thresholds.temperatureC.warmMax}°C (warm maximum)`)
  } else hits.push(`Temperature inside ${thresholds.temperatureC.cold}–${thresholds.temperatureC.warmMax}°C`)

  return hits
}

function countBands(records, picker, bander, labels) {
  const counts = Object.fromEntries(labels.map((label) => [label, 0]))
  for (const record of records) {
    const value = picker(record)
    if (typeof value !== 'number') continue
    counts[bander(value)] += 1
  }
  return labels.map((label) => ({ label, count: counts[label] }))
}

function groupRows(records, labelFor) {
  const groups = new Map()
  for (const record of records) {
    const label = labelFor(record)
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label).push(record)
  }
  return [...groups.entries()]
    .map(([label, rows]) => ({
      label,
      n: rows.length,
      moisture: numStats(rows.map((row) => row.moisture)),
      pH: numStats(rows.map((row) => row.pH)),
      temperature: numStats(rows.map((row) => row.temperature)),
      humidity: numStats(rows.map((row) => row.humidity)),
      rainfall: numStats(rows.map((row) => row.rainfall)),
      crops: [...new Set(rows.map((row) => displayCrop(row)))],
      locations: [...new Set(rows.map((row) => row.location).filter(Boolean))],
    }))
    .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label))
}

function buildObservations(dataset, validation, analysis, recommendations) {
  const notes = []
  if (dataset.isSynthetic) {
    notes.push('This dataset is synthetic test data. It is not a record of real agricultural measurements.')
  }
  notes.push(
    `${validation.valid} of ${validation.total} rows passed validation. ${validation.rejected} rows were rejected, including ${validation.duplicates} duplicate row${validation.duplicates === 1 ? '' : 's'}.`,
  )
  if (analysis.dateRange) {
    notes.push(
      `Valid observation dates run from ${analysis.dateRange.start} to ${analysis.dateRange.end} (${analysis.dateRange.days} distinct date${analysis.dateRange.days === 1 ? '' : 's'}).`,
    )
  } else {
    notes.push('No valid observation dates were available, so a time trend was not calculated.')
  }
  if (analysis.moisture) {
    const { avg, min, max, n } = analysis.moisture
    notes.push(
      `Soil moisture averages ${avg.toFixed(1)}% across ${n} valid measurement${n === 1 ? '' : 's'}, ranging from ${min}% to ${max}%.`,
    )
    const dryCount = analysis.soilConditions
      .filter((item) => item.label === 'Very dry' || item.label === 'Dry')
      .reduce((sum, item) => sum + item.count, 0)
    notes.push(
      `${dryCount} of ${n} moisture readings fall in the illustrative dry or very-dry bands (below ${DEMONSTRATION_THRESHOLDS.moisture.dry}%).`,
    )
  } else {
    notes.push('No valid soil moisture measurements were available, so moisture statistics were not calculated.')
  }
  if (analysis.pH) {
    notes.push(
      `Soil pH averages ${analysis.pH.avg.toFixed(2)} across ${analysis.pH.n} valid measurement${analysis.pH.n === 1 ? '' : 's'} (minimum ${analysis.pH.min}, maximum ${analysis.pH.max}).`,
    )
  }
  if (analysis.temperature) {
    notes.push(
      `Soil temperature averages ${analysis.temperature.avg.toFixed(1)}°C across ${analysis.temperature.n} valid measurement${analysis.temperature.n === 1 ? '' : 's'} (minimum ${analysis.temperature.min}°C, maximum ${analysis.temperature.max}°C).`,
    )
  }
  if (analysis.humidity) {
    notes.push(
      `Humidity averages ${analysis.humidity.avg.toFixed(1)}% across ${analysis.humidity.n} valid measurement${analysis.humidity.n === 1 ? '' : 's'}.`,
    )
  }
  if (analysis.rainfall) {
    notes.push(
      `Rainfall totals ${analysis.rainfall.total.toFixed(1)} mm across ${analysis.rainfall.n} valid reading${analysis.rainfall.n === 1 ? '' : 's'} (average ${analysis.rainfall.avg.toFixed(1)} mm).`,
    )
  }
  const cropsWithMoisture = analysis.crops.filter((crop) => crop.moisture)
  if (cropsWithMoisture.length > 0) {
    const driest = [...cropsWithMoisture].sort((a, b) => a.moisture.avg - b.moisture.avg)[0]
    notes.push(
      `${driest.label} has the lowest average soil moisture at ${driest.moisture.avg.toFixed(1)}% (n=${driest.moisture.n}).`,
    )
  }
  if (analysis.trends.length >= 2) {
    const first = analysis.trends.find((point) => point.moistureAvg != null)
    const last = [...analysis.trends].reverse().find((point) => point.moistureAvg != null)
    if (first && last && first.date !== last.date) {
      const delta = last.moistureAvg - first.moistureAvg
      notes.push(
        `From ${first.date} to ${last.date}, the daily mean soil moisture across farms changed by ${delta >= 0 ? '+' : ''}${delta.toFixed(1)} percentage points.`,
      )
    }
  }
  if (recommendations.length > 0) {
    const top = [...analysis.irrigationActions].sort((a, b) => b.count - a.count)[0]
    const high = analysis.urgencyCounts.find((item) => item.label === 'high')?.count ?? 0
    notes.push(
      `${recommendations.length} row${recommendations.length === 1 ? '' : 's'} had soil moisture, pH, and temperature together, so the rule engine could run. The most common action is "${top.label}" (${top.count} row${top.count === 1 ? '' : 's'}). ${high} row${high === 1 ? '' : 's'} ${high === 1 ? 'is' : 'are'} labelled high urgency.`,
    )
  } else {
    notes.push(
      'No row had soil moisture, soil pH, and soil temperature together, so the irrigation rule engine was not applied.',
    )
  }
  return notes
}

function buildConclusion(dataset, validation, analysis, recommendations) {
  const parts = []
  if (dataset.isSynthetic) {
    parts.push('This conclusion describes synthetic test data, not real farm measurements.')
  }
  parts.push(
    `Of ${validation.total} uploaded rows, ${validation.valid} passed validation and ${validation.rejected} were rejected.`,
  )
  if (analysis.moisture) {
    parts.push(
      `Average soil moisture is ${analysis.moisture.avg.toFixed(1)}% from ${analysis.moisture.n} valid readings.`,
    )
  }
  if (analysis.pH) {
    parts.push(`Average soil pH is ${analysis.pH.avg.toFixed(2)} from ${analysis.pH.n} valid readings.`)
  }
  if (analysis.temperature) {
    parts.push(
      `Average soil temperature is ${analysis.temperature.avg.toFixed(1)}°C from ${analysis.temperature.n} valid readings.`,
    )
  }
  if (recommendations.length > 0) {
    const top = [...analysis.irrigationActions].sort((a, b) => b.count - a.count)[0]
    parts.push(
      `The rule engine produced ${recommendations.length} irrigation suggestion${recommendations.length === 1 ? '' : 's'}. The most frequent suggestion is "${top.label}".`,
    )
  } else {
    parts.push('An irrigation suggestion was not produced because no row contained moisture, pH, and temperature together.')
  }
  parts.push(
    'These results describe only the active file. Thresholds are illustrative and are not scientifically validated agricultural advice.',
  )
  return parts.join(' ')
}

export function buildDatasetReport(dataset) {
  const mapping = dataset.mapping ?? {}
  const rawRows = Array.isArray(dataset.rawRows) ? dataset.rawRows : []
  const fieldSummary = {}
  for (const field of FIELD_DEFS) {
    fieldSummary[field.key] = {
      label: field.label,
      mapped: Boolean(mapping[field.key]),
      column: mapping[field.key] || '',
      missing: 0,
      invalid: 0,
      valid: 0,
    }
  }

  const records = []
  const rejected = []
  const seen = new Map()
  let duplicates = 0

  const headerRow = Number(dataset.headerRow) > 0 ? Number(dataset.headerRow) : 1
  rawRows.forEach((row, index) => {
    const rowNumber = headerRow + index + 1
    const reasons = []
    const parsed = {}
    const preview = {}

    for (const field of FIELD_DEFS) {
      const column = mapping[field.key]
      if (!column) continue
      const raw = row[column]
      preview[field.key] = cleanText(raw)
      if (field.kind === 'measurement') {
        const result = parseMeasurement(raw)
        parsed[field.key] = result
        if (result.kind === 'empty') fieldSummary[field.key].missing += 1
        else if (result.kind === 'invalid') {
          fieldSummary[field.key].invalid += 1
          reasons.push(`${field.label} value "${result.raw}" is not a number.`)
        } else if (result.value < field.min || result.value > field.max) {
          fieldSummary[field.key].invalid += 1
          const unit = field.unit ? ` ${field.unit}` : ''
          reasons.push(
            `${field.label} ${result.value} is outside the accepted range of ${field.min} to ${field.max}${unit}.`,
          )
          parsed[field.key] = { kind: 'invalid', raw: result.raw }
        } else fieldSummary[field.key].valid += 1
      } else if (field.kind === 'date') {
        const result = parseDate(raw)
        parsed[field.key] = result
        if (result.kind === 'empty') fieldSummary[field.key].missing += 1
        else if (result.kind === 'invalid') {
          fieldSummary[field.key].invalid += 1
          reasons.push(`Date "${result.raw}" could not be read. Use a date such as 2026-10-20.`)
        } else fieldSummary[field.key].valid += 1
      } else {
        const text = cleanText(raw)
        if (!text) {
          parsed[field.key] = { kind: 'empty' }
          fieldSummary[field.key].missing += 1
        } else if (text.length > MAX_TEXT) {
          parsed[field.key] = { kind: 'invalid', raw: text.slice(0, 80) }
          fieldSummary[field.key].invalid += 1
          reasons.push(`${field.label} is longer than ${MAX_TEXT} characters.`)
        } else {
          parsed[field.key] = { kind: 'text', value: text }
          fieldSummary[field.key].valid += 1
        }
      }
    }

    const usable = MEASUREMENT_KEYS.filter((key) => parsed[key]?.kind === 'number').length
    const invalidMeasurement = MEASUREMENT_KEYS.some((key) => parsed[key]?.kind === 'invalid')
    if (usable === 0 && !invalidMeasurement) {
      reasons.push('No usable agricultural measurement in this row.')
    }

    const identity = FIELD_DEFS.map((field) => {
      const value = parsed[field.key]
      if (!value || value.kind === 'empty') return ''
      if (value.kind === 'number') return String(value.value)
      if (value.kind === 'date' || value.kind === 'text') return value.value.toLowerCase()
      return `invalid:${value.raw}`
    }).join('|')

    if (seen.has(identity)) {
      duplicates += 1
      reasons.push(`Duplicate of row ${seen.get(identity)}.`)
    } else {
      seen.set(identity, rowNumber)
    }

    if (reasons.length > 0) {
      rejected.push({ rowNumber, reasons, preview })
      return
    }

    const textValue = (key) => (parsed[key]?.kind === 'text' ? parsed[key].value : '')
    const numberValue = (key) => (parsed[key]?.kind === 'number' ? parsed[key].value : null)
    records.push({
      rowNumber,
      farmId: textValue('farm_id'),
      farmName: textValue('farm_name'),
      location: textValue('location'),
      crop: textValue('crop'),
      date: parsed.date?.kind === 'date' ? parsed.date.value : '',
      moisture: numberValue('soil_moisture'),
      pH: numberValue('soil_ph'),
      temperature: numberValue('soil_temperature'),
      humidity: numberValue('humidity'),
      rainfall: numberValue('rainfall'),
    })
  })

  const recommendations = []
  for (const record of records) {
    if (record.moisture == null || record.pH == null || record.temperature == null) continue
    const cropType = displayCrop(record)
    const result = generateRecommendation({
      farmName: displayFarm(record),
      cropType,
      moisture: record.moisture,
      pH: record.pH,
      temperature: record.temperature,
    })
    recommendations.push({
      rowNumber: record.rowNumber,
      farmId: record.farmId,
      farmName: record.farmName,
      farmLabel: displayFarm(record),
      location: record.location,
      crop: record.crop,
      cropLabel: cropType,
      date: record.date,
      moisture: record.moisture,
      pH: record.pH,
      temperature: record.temperature,
      humidity: record.humidity,
      rainfall: record.rainfall,
      result,
      thresholds: listTriggeredThresholds({
        cropType,
        moisture: record.moisture,
        pH: record.pH,
        temperature: record.temperature,
      }),
    })
  }

  const dates = records.map((record) => record.date).filter(Boolean).sort()
  const trendMap = new Map()
  for (const record of records) {
    if (!record.date) continue
    if (!trendMap.has(record.date)) trendMap.set(record.date, [])
    trendMap.get(record.date).push(record)
  }
  const trends = [...trendMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, rows]) => {
      const moisture = numStats(rows.map((row) => row.moisture))
      const pH = numStats(rows.map((row) => row.pH))
      const temperature = numStats(rows.map((row) => row.temperature))
      return {
        date,
        n: rows.length,
        moistureAvg: moisture ? moisture.avg : null,
        phAvg: pH ? pH.avg : null,
        temperatureAvg: temperature ? temperature.avg : null,
      }
    })

  const actionCounts = new Map()
  const urgencyCounts = new Map([
    ['high', 0],
    ['medium', 0],
    ['low', 0],
  ])
  for (const item of recommendations) {
    actionCounts.set(item.result.irrigationAction, (actionCounts.get(item.result.irrigationAction) ?? 0) + 1)
    urgencyCounts.set(item.result.urgency, (urgencyCounts.get(item.result.urgency) ?? 0) + 1)
  }

  const analysis = {
    moisture: numStats(records.map((record) => record.moisture)),
    pH: numStats(records.map((record) => record.pH)),
    temperature: numStats(records.map((record) => record.temperature)),
    humidity: numStats(records.map((record) => record.humidity)),
    rainfall: numStats(records.map((record) => record.rainfall)),
    crops: groupRows(records, displayCrop),
    farms: groupRows(records, displayFarm),
    soilConditions: countBands(
      records,
      (record) => record.moisture,
      moistureBand,
      ['Very dry', 'Dry', 'Adequate', 'Wet', 'Very wet'],
    ),
    phConditions: countBands(
      records,
      (record) => record.pH,
      phBand,
      ['Strongly acidic', 'Acidic', 'Preferred window', 'Alkaline', 'Strongly alkaline'],
    ),
    trends,
    dateRange: dates.length ? { start: dates[0], end: dates[dates.length - 1], days: new Set(dates).size } : null,
    irrigationActions: [...actionCounts.entries()].map(([label, count]) => ({ label, count })),
    urgencyCounts: [...urgencyCounts.entries()].map(([label, count]) => ({ label, count })),
  }

  const validation = {
    total: rawRows.length,
    valid: records.length,
    rejected: rejected.length,
    duplicates,
    fieldSummary,
  }

  return {
    records,
    rejected,
    validation,
    analysis,
    recommendations,
    observations: buildObservations(dataset, validation, analysis, recommendations),
    conclusion: buildConclusion(dataset, validation, analysis, recommendations),
  }
}

function fileSlug(name) {
  const slug = String(name ?? '')
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return slug || 'dataset'
}

function preface(dataset) {
  if (dataset.isSynthetic) {
    return 'dataset_type,SYNTHETIC TEST DATA\nnote,Not real agricultural measurements\n\n'
  }
  return 'dataset_type,uploaded file\nnote,Values below come from the uploaded file after validation. Missing measurements were not invented.\n\n'
}

export function downloadProcessedCsv(dataset, report) {
  const rows = report.records.map((record) => ({
    rowNumber: record.rowNumber,
    farmId: record.farmId,
    farmName: record.farmName,
    location: record.location,
    crop: record.crop,
    date: record.date,
    moisture: record.moisture,
    pH: record.pH,
    temperature: record.temperature,
    humidity: record.humidity,
    rainfall: record.rainfall,
  }))
  const csv = toCsv(rows, [
    { key: 'rowNumber', label: 'source_row' },
    { key: 'farmId', label: 'farm_id' },
    { key: 'farmName', label: 'farm_name' },
    { key: 'location', label: 'location' },
    { key: 'crop', label: 'crop' },
    { key: 'date', label: 'date' },
    { key: 'moisture', label: 'soil_moisture' },
    { key: 'pH', label: 'soil_ph' },
    { key: 'temperature', label: 'soil_temperature' },
    { key: 'humidity', label: 'humidity' },
    { key: 'rainfall', label: 'rainfall' },
  ])
  const stamp = new Date().toISOString().slice(0, 10)
  downloadCsv(`agrisense-processed-${fileSlug(dataset.fileName)}-${stamp}.csv`, `${preface(dataset)}${csv}`)
}

export function downloadRecommendationsCsv(dataset, report) {
  const rows = report.recommendations.map((item) => ({
    rowNumber: item.rowNumber,
    farmName: item.farmLabel,
    crop: item.cropLabel,
    date: item.date,
    moisture: item.moisture,
    pH: item.pH,
    temperature: item.temperature,
    humidity: item.humidity,
    rainfall: item.rainfall,
    action: item.result.irrigationAction,
    urgency: item.result.urgency,
    explanation: [...item.result.reasons, ...item.result.modifiers].join(' | '),
    thresholds: item.thresholds.join(' | '),
    disclaimer: item.result.disclaimer,
  }))
  const csv = toCsv(rows, [
    { key: 'rowNumber', label: 'source_row' },
    { key: 'farmName', label: 'farm' },
    { key: 'crop', label: 'crop' },
    { key: 'date', label: 'date' },
    { key: 'moisture', label: 'soil_moisture' },
    { key: 'pH', label: 'soil_ph' },
    { key: 'temperature', label: 'soil_temperature_c' },
    { key: 'humidity', label: 'humidity' },
    { key: 'rainfall', label: 'rainfall_mm' },
    { key: 'action', label: 'irrigation_recommendation' },
    { key: 'urgency', label: 'urgency' },
    { key: 'explanation', label: 'explanation' },
    { key: 'thresholds', label: 'triggered_illustrative_thresholds' },
    { key: 'disclaimer', label: 'disclaimer' },
  ])
  const stamp = new Date().toISOString().slice(0, 10)
  downloadCsv(`agrisense-recommendations-${fileSlug(dataset.fileName)}-${stamp}.csv`, `${preface(dataset)}${csv}`)
}
