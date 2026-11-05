import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { FIELD_DEFS } from './dataset'

function pdfSafe(value) {
  const text = String(value ?? '')
    .replace(/\u2013|\u2014/g, '-')
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\u201c|\u201d/g, '"')
  const cleaned = [...text]
    .map((char) => {
      const code = char.codePointAt(0)
      if (code === 10 || code === 13 || (code >= 32 && code <= 255)) return char
      return ''
    })
    .join('')
    .trim()
  return cleaned || '-'
}

function statCell(stat, digits, suffix = '') {
  if (!stat) return 'Not available'
  return `${stat.avg.toFixed(digits)}${suffix}`
}

function rangeCell(stat, digits, suffix = '') {
  if (!stat) return '-'
  return `${stat.min.toFixed(digits)}${suffix} to ${stat.max.toFixed(digits)}${suffix}`
}

function drawBarChart(labels, values) {
  const width = 900
  const height = 340
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  const max = Math.max(...values, 1)
  const left = 54
  const top = 16
  const bottom = 92
  const plotW = width - left - 24
  const plotH = height - top - bottom
  ctx.strokeStyle = '#cbd5e1'
  ctx.beginPath()
  ctx.moveTo(left, top)
  ctx.lineTo(left, top + plotH)
  ctx.lineTo(left + plotW, top + plotH)
  ctx.stroke()
  const slot = plotW / Math.max(values.length, 1)
  const barW = Math.max(12, Math.min(48, slot * 0.62))
  values.forEach((value, index) => {
    const heightPx = (value / max) * (plotH - 8)
    const x = left + index * slot + (slot - barW) / 2
    const y = top + plotH - heightPx
    ctx.fillStyle = '#059669'
    ctx.fillRect(x, y, barW, heightPx)
    ctx.fillStyle = '#334155'
    ctx.font = '13px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(String(value), x + barW / 2, y - 4)
    ctx.save()
    ctx.translate(x + barW / 2, top + plotH + 14)
    ctx.rotate(-0.45)
    ctx.textAlign = 'right'
    ctx.fillText(pdfSafe(labels[index]).slice(0, 28), 0, 0)
    ctx.restore()
  })
  return canvas.toDataURL('image/png')
}

function drawLineChart(points) {
  const width = 900
  const height = 340
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  const left = 54
  const top = 16
  const bottom = 72
  const plotW = width - left - 24
  const plotH = height - top - bottom
  ctx.strokeStyle = '#cbd5e1'
  ctx.beginPath()
  ctx.moveTo(left, top)
  ctx.lineTo(left, top + plotH)
  ctx.lineTo(left + plotW, top + plotH)
  ctx.stroke()
  const max = 100
  ctx.beginPath()
  ctx.strokeStyle = '#059669'
  ctx.lineWidth = 2
  points.forEach((point, index) => {
    const x = left + (points.length === 1 ? plotW / 2 : (index / (points.length - 1)) * plotW)
    const y = top + plotH - (point.moistureAvg / max) * plotH
    if (index === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.stroke()
  points.forEach((point, index) => {
    const x = left + (points.length === 1 ? plotW / 2 : (index / (points.length - 1)) * plotW)
    const y = top + plotH - (point.moistureAvg / max) * plotH
    ctx.fillStyle = '#047857'
    ctx.beginPath()
    ctx.arc(x, y, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#334155'
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(point.date.slice(5), x, top + plotH + 18)
  })
  return canvas.toDataURL('image/png')
}

export function downloadAnalysisReport(dataset, report) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  doc.setProperties({
    title: 'AgriSense agricultural dataset report',
    subject: dataset.isSynthetic ? 'Synthetic test data' : 'Uploaded agricultural dataset',
    creator: 'AgriSense',
  })

  let y = 16

  const ensure = (needed) => {
    if (y + needed > 280) {
      doc.addPage()
      y = 16
    }
  }

  const heading = (text) => {
    ensure(12)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(6, 95, 70)
    doc.text(pdfSafe(text), 14, y)
    y += 7
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(30, 41, 59)
    doc.setFontSize(10)
  }

  const paragraph = (text) => {
    const lines = doc.splitTextToSize(pdfSafe(text), 182)
    ensure(lines.length * 5 + 2)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(30, 41, 59)
    doc.text(lines, 14, y)
    y += lines.length * 4.6 + 3
  }

  const table = (head, body) => {
    if (body.length === 0) return
    autoTable(doc, {
      startY: y,
      head: [head.map(pdfSafe)],
      body: body.map((row) => row.map((cell) => pdfSafe(cell))),
      margin: { left: 14, right: 14, bottom: 16 },
      styles: { fontSize: 8, cellPadding: 1.4, textColor: [30, 41, 59] },
      headStyles: { fillColor: [5, 150, 105], textColor: 255 },
      theme: 'grid',
    })
    y = doc.lastAutoTable.finalY + 8
  }

  const addChart = (title, image) => {
    ensure(80)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(6, 95, 70)
    doc.text(pdfSafe(title), 14, y)
    y += 4
    doc.addImage(image, 'PNG', 14, y, 182, 68)
    y += 74
  }

  doc.setFillColor(5, 150, 105)
  doc.rect(0, 0, 210, 24, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('AgriSense', 14, 11)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text('Agricultural dataset report', 14, 18)
  y = 32

  paragraph(
    'AgriSense - a browser-based smart digital agriculture monitoring and rule-based irrigation decision support system.',
  )
  if (dataset.isSynthetic) {
    doc.setTextColor(146, 64, 14)
    paragraph('SYNTHETIC TEST DATA. This report does not describe real agricultural measurements.')
    doc.setTextColor(30, 41, 59)
  }

  heading('1. Dataset information')
  const mapped = FIELD_DEFS.filter((field) => dataset.mapping?.[field.key]).map(
    (field) => `${field.label}: ${dataset.mapping[field.key]}`,
  )
  table(
    ['Item', 'Value'],
    [
      ['File', dataset.fileName || dataset.name || '-'],
      ['Worksheet', dataset.sheetName || 'CSV'],
      ['Source', dataset.isSynthetic ? 'Synthetic test data' : 'Uploaded file'],
      ['Saved in this browser', dataset.uploadedAt ? new Date(dataset.uploadedAt).toLocaleString() : '-'],
      ['Report generated', new Date().toLocaleString()],
      ['Date range', report.analysis.dateRange ? `${report.analysis.dateRange.start} to ${report.analysis.dateRange.end}` : 'No valid dates'],
      ['Column mapping', mapped.join('; ') || 'None'],
    ],
  )

  heading('2. Dataset overview')
  paragraph(
    report.analysis.dateRange
      ? `The active file contains ${report.validation.total} data rows. Valid dated observations run from ${report.analysis.dateRange.start} to ${report.analysis.dateRange.end}.`
      : `The active file contains ${report.validation.total} data rows. No valid observation dates were available.`,
  )

  heading('3. Record counts')
  table(
    ['Total rows', 'Valid rows', 'Rejected rows', 'Duplicate rows'],
    [[
      String(report.validation.total),
      String(report.validation.valid),
      String(report.validation.rejected),
      String(report.validation.duplicates),
    ]],
  )

  heading('4. Data quality summary')
  paragraph(
    'Missing cells were left missing. AgriSense did not invent replacement measurements. A row is rejected when a mapped value is invalid, when it duplicates an earlier row, or when it has no usable measurement.',
  )
  table(
    ['Field', 'Mapped column', 'Valid', 'Missing', 'Invalid'],
    FIELD_DEFS.map((field) => {
      const summary = report.validation.fieldSummary[field.key]
      return [
        field.label,
        summary?.mapped ? summary.column : 'Not mapped',
        summary?.mapped ? String(summary.valid) : '-',
        summary?.mapped ? String(summary.missing) : '-',
        summary?.mapped ? String(summary.invalid) : '-',
      ]
    }),
  )
  if (report.rejected.length > 0) {
    paragraph(
      report.rejected.length > 12
        ? `Showing 12 of ${report.rejected.length} rejected rows.`
        : 'Rejected rows and the reason each row was excluded:',
    )
    table(
      ['Row', 'Reasons'],
      report.rejected.slice(0, 12).map((row) => [String(row.rowNumber), row.reasons.join(' ')]),
    )
  }

  heading('5. Agricultural statistical analysis')
  paragraph('Every average uses only valid numeric measurements. The record count is the number of values that entered that statistic.')
  const statRows = [
    ['Soil moisture (%)', report.analysis.moisture, 1, '%'],
    ['Soil pH', report.analysis.pH, 2, ''],
    ['Soil temperature (deg C)', report.analysis.temperature, 1, ''],
    ['Humidity (%)', report.analysis.humidity, 1, '%'],
    ['Rainfall (mm)', report.analysis.rainfall, 1, ''],
  ]
  table(
    ['Measurement', 'Records used', 'Average', 'Minimum', 'Maximum'],
    statRows.map(([label, stat, digits, suffix]) => [
      label,
      stat ? String(stat.n) : '0',
      statCell(stat, digits, suffix),
      stat ? `${stat.min.toFixed(digits)}${suffix}` : '-',
      stat ? `${stat.max.toFixed(digits)}${suffix}` : '-',
    ]),
  )
  if (report.analysis.rainfall) {
    paragraph(`Total of the ${report.analysis.rainfall.n} valid rainfall readings: ${report.analysis.rainfall.total.toFixed(1)} mm.`)
  }

  heading('6. Crop-wise and farm-wise analysis')
  if (report.analysis.crops.length === 0) {
    paragraph('No valid records were available for crop-wise or farm-wise analysis.')
  } else {
    table(
      ['Crop', 'Records', 'Avg moisture', 'Moisture range', 'Avg pH', 'Avg temperature'],
      report.analysis.crops.map((crop) => [
        crop.label,
        String(crop.n),
        statCell(crop.moisture, 1, '%'),
        rangeCell(crop.moisture, 1, '%'),
        statCell(crop.pH, 2),
        statCell(crop.temperature, 1, ' C'),
      ]),
    )
    table(
      ['Farm', 'Records', 'Crops', 'Avg moisture', 'Avg pH', 'Avg temperature'],
      report.analysis.farms.map((farm) => [
        farm.label,
        String(farm.n),
        farm.crops.join(', '),
        statCell(farm.moisture, 1, '%'),
        statCell(farm.pH, 2),
        statCell(farm.temperature, 1, ' C'),
      ]),
    )
  }

  heading('7. Soil moisture, pH, and temperature findings')
  paragraph(
    'Soil-condition labels use the same illustrative moisture and pH bands as the recommendation rules. They are not a laboratory soil classification.',
  )
  if (report.analysis.moisture) {
    table(
      ['Illustrative moisture band', 'Records'],
      report.analysis.soilConditions.map((item) => [item.label, String(item.count)]),
    )
  } else {
    paragraph('Soil moisture findings are omitted because no valid moisture measurements were present.')
  }
  if (report.analysis.pH) {
    table(
      ['Illustrative pH band', 'Records'],
      report.analysis.phConditions.map((item) => [item.label, String(item.count)]),
    )
  } else {
    paragraph('Soil pH findings are omitted because no valid pH measurements were present.')
  }
  if (report.analysis.temperature) {
    paragraph(
      `Soil temperature ranges from ${report.analysis.temperature.min.toFixed(1)} C to ${report.analysis.temperature.max.toFixed(1)} C across ${report.analysis.temperature.n} valid readings.`,
    )
  } else {
    paragraph('Soil temperature findings are omitted because no valid temperature measurements were present.')
  }

  heading('8. Charts')
  const trendPoints = report.analysis.trends.filter((point) => point.moistureAvg != null)
  let chartCount = 0
  if (trendPoints.length > 0) {
    addChart('Daily mean soil moisture (%)', drawLineChart(trendPoints))
    chartCount += 1
  }
  const cropBars = report.analysis.crops.filter((crop) => crop.moisture)
  if (cropBars.length > 0) {
    addChart(
      'Average soil moisture by crop (%)',
      drawBarChart(
        cropBars.map((crop) => crop.label),
        cropBars.map((crop) => Number(crop.moisture.avg.toFixed(1))),
      ),
    )
    chartCount += 1
  }
  if (report.analysis.moisture) {
    addChart(
      'Illustrative soil moisture bands (record count)',
      drawBarChart(
        report.analysis.soilConditions.map((item) => item.label),
        report.analysis.soilConditions.map((item) => item.count),
      ),
    )
    chartCount += 1
  }
  if (report.analysis.irrigationActions.length > 0) {
    addChart(
      'Irrigation recommendations (record count)',
      drawBarChart(
        report.analysis.irrigationActions.map((item) => item.label),
        report.analysis.irrigationActions.map((item) => item.count),
      ),
    )
    chartCount += 1
  }
  if (chartCount === 0) paragraph('No chart was drawn because the valid rows did not contain the required measurements or dates.')

  heading('9. Irrigation recommendations')
  paragraph(
    'Suggestions come from the existing if-then irrigation rules. A row is included only when soil moisture, soil pH, and soil temperature are all valid. Humidity and rainfall are shown for context and do not change the rule. Thresholds are illustrative and are not scientifically validated.',
  )
  if (report.recommendations.length === 0) {
    paragraph('No eligible rows were available for a recommendation.')
  } else {
    const rank = { high: 0, medium: 1, low: 2 }
    const sorted = [...report.recommendations].sort(
      (a, b) => (rank[a.result.urgency] ?? 3) - (rank[b.result.urgency] ?? 3) || a.rowNumber - b.rowNumber,
    )
    const shown = sorted.slice(0, 40)
    if (sorted.length > shown.length) {
      paragraph(`Showing ${shown.length} of ${sorted.length} recommendations, highest urgency first. The recommendations CSV contains every row.`)
    }
    table(
      ['Row', 'Farm', 'Crop', 'Moisture', 'pH', 'Temp', 'Urgency', 'Recommendation and explanation'],
      shown.map((item) => [
        String(item.rowNumber),
        item.farmLabel,
        item.cropLabel,
        `${item.moisture}%`,
        String(item.pH),
        `${item.temperature} C`,
        item.result.urgency,
        `${item.result.irrigationAction}. ${item.result.reasons.join(' ')} Thresholds: ${item.thresholds.join('; ')}.`,
      ]),
    )
  }

  heading('10. Observations and findings')
  report.observations.forEach((note, index) => {
    paragraph(`${index + 1}. ${note}`)
  })

  heading('11. Methodology and limitations')
  paragraph(
    'The file was parsed in the browser. CSV and Excel values were mapped to agricultural fields, then checked for missing cells, non-numeric measurements, values outside the accepted ranges, and duplicate rows. Accepted ranges are soil moisture 0-100%, soil pH 0-14, soil temperature -10 to 60 C, humidity 0-100%, and rainfall 0-1000 mm. Blank optional fields do not reject a row when at least one measurement is usable.',
  )
  paragraph(
    'Statistics use valid measurements only and report how many records were used. Crop names that match the demonstration crop list are matched without regard to letter case. Blank farm names are labelled "Unspecified farm" in summaries. That label is not written back as a measurement.',
  )
  paragraph(
    'Irrigation text is produced by the existing demonstration rule set. Moisture bands, crop target moisture, pH bands, and temperature bands are illustrative. They are not scientifically validated agronomic advice. AgriSense does not use a machine-learning model, does not connect to IoT sensors, and does not call a weather service. Humidity and rainfall are summarised when present, but they are not inputs to the irrigation rules.',
  )
  paragraph(
    dataset.isSynthetic
      ? 'The source file is the bundled synthetic sample. It was created for testing and must not be cited as field data.'
      : 'The source file is the dataset uploaded in this browser. AgriSense does not replace uploaded measurements with sample values.',
  )
  paragraph('The PDF uses a standard font. Characters outside Latin-1 may be omitted from the printed text. The CSV exports keep the processed values.')

  heading('12. Conclusion')
  paragraph(report.conclusion)

  const pages = doc.getNumberOfPages()
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page)
    doc.setFontSize(8)
    doc.setTextColor(100)
    doc.text('AgriSense. Illustrative thresholds only. Not machine learning, IoT, or live weather data.', 14, 290)
    doc.text(`Page ${page} of ${pages}`, 176, 290)
  }

  const stamp = new Date().toISOString().slice(0, 10)
  const prefix = dataset.isSynthetic ? 'agrisense-synthetic-report' : 'agrisense-dataset-report'
  doc.save(`${prefix}-${stamp}.pdf`)
}
