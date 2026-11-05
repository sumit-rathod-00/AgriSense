import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { buildDemoPayload } from '../lib/demoData'
import { buildDatasetReport } from '../lib/dataset'
import { createId, loadState, saveState } from '../lib/storage'

const AppContext = createContext(null)
const EMPTY_DATASETS = []

export function AppProvider({ children }) {
  const [state, setState] = useState(() => loadState())
  const [toast, setToast] = useState(null)

  const showToast = useCallback((type, message) => {
    setToast({ type, message, id: Date.now() })
  }, [])

  const clearToast = useCallback(() => setToast(null), [])

  useEffect(() => {
    try {
      saveState(state)
    } catch (error) {
      showToast('error', error.message || 'The dataset could not be stored in this browser.')
    }
  }, [state, showToast])

  const addFarm = useCallback(
    (farm) => {
      const record = {
        ...farm,
        id: createId('farm'),
        createdAt: new Date().toISOString(),
        isDemo: false,
      }
      setState((prev) => ({ ...prev, farms: [record, ...prev.farms] }))
      showToast('success', 'Farm saved.')
      return record
    },
    [showToast],
  )

  const updateFarm = useCallback(
    (id, updates) => {
      setState((prev) => ({
        ...prev,
        farms: prev.farms.map((farm) => (farm.id === id ? { ...farm, ...updates } : farm)),
        readings: prev.readings.map((reading) =>
          reading.farmId === id ? { ...reading, farmName: updates.name ?? reading.farmName } : reading,
        ),
        recommendations: prev.recommendations.map((rec) =>
          rec.farmId === id ? { ...rec, farmName: updates.name ?? rec.farmName } : rec,
        ),
      }))
      showToast('success', 'Farm details updated.')
    },
    [showToast],
  )

  const deleteFarm = useCallback(
    (id) => {
      setState((prev) => ({
        ...prev,
        farms: prev.farms.filter((farm) => farm.id !== id),
        readings: prev.readings.filter((reading) => reading.farmId !== id),
        recommendations: prev.recommendations.filter((rec) => rec.farmId !== id),
      }))
      showToast('success', 'Farm and related records removed.')
    },
    [showToast],
  )

  const addReading = useCallback(
    (reading) => {
      const record = {
        ...reading,
        id: createId('reading'),
        createdAt: new Date().toISOString(),
        isDemo: false,
      }
      setState((prev) => ({ ...prev, readings: [record, ...prev.readings] }))
      showToast('success', 'Crop reading saved.')
      return record
    },
    [showToast],
  )

  const deleteReading = useCallback(
    (id) => {
      setState((prev) => ({
        ...prev,
        readings: prev.readings.filter((reading) => reading.id !== id),
      }))
      showToast('success', 'Reading deleted.')
    },
    [showToast],
  )

  const addRecommendation = useCallback(
    (entry) => {
      const record = {
        ...entry,
        id: createId('rec'),
        createdAt: new Date().toISOString(),
        isDemo: false,
      }
      const linkedReading = {
        id: createId('reading'),
        farmId: record.farmId,
        farmName: record.farmName,
        cropType: record.cropType,
        moisture: record.moisture,
        pH: record.pH,
        temperature: record.temperature,
        createdAt: record.createdAt,
        isDemo: false,
      }
      setState((prev) => ({
        ...prev,
        recommendations: [record, ...prev.recommendations],
        readings: [linkedReading, ...prev.readings],
      }))
      showToast('success', 'Recommendation generated and saved.')
      return record
    },
    [showToast],
  )

  const deleteRecommendation = useCallback(
    (id) => {
      setState((prev) => ({
        ...prev,
        recommendations: prev.recommendations.filter((rec) => rec.id !== id),
      }))
      showToast('success', 'History entry deleted.')
    },
    [showToast],
  )

  const loadDemoData = useCallback(() => {
    const demo = buildDemoPayload()
    setState((prev) => {
      const farms = [
        ...demo.farms.filter((farm) => !prev.farms.some((existing) => existing.id === farm.id)),
        ...prev.farms,
      ]
      const readings = [
        ...demo.readings.filter((reading) => !prev.readings.some((existing) => existing.id === reading.id)),
        ...prev.readings,
      ]
      const recommendations = [
        ...demo.recommendations.filter((rec) => !prev.recommendations.some((existing) => existing.id === rec.id)),
        ...prev.recommendations,
      ]
      return { ...prev, farms, readings, recommendations }
    })
    showToast('success', 'Demo farm, readings, and recommendations loaded.')
  }, [showToast])

  const resetAllData = useCallback(() => {
    setState((prev) => ({
      schemaVersion: 1,
      farms: [],
      readings: [],
      recommendations: [],
      datasets: prev.datasets,
      activeDatasetId: prev.activeDatasetId,
    }))
    showToast('success', 'Farms, readings, and manual recommendations cleared. Uploaded datasets were kept.')
  }, [showToast])

  const saveDataset = useCallback(
    (draft) => {
      const record = {
        id: draft.id ?? createId('dataset'),
        name: draft.name || draft.fileName || 'Dataset',
        fileName: draft.fileName || 'dataset.csv',
        uploadedAt: draft.uploadedAt ?? new Date().toISOString(),
        source: draft.isSynthetic ? 'synthetic' : 'upload',
        isSynthetic: Boolean(draft.isSynthetic),
        headers: draft.headers ?? [],
        mapping: { ...draft.mapping },
        rawRows: (draft.rawRows ?? []).map((row) => ({ ...row })),
        sheetName: draft.sheetName ?? '',
        headerRow: draft.headerRow ?? 1,
      }
      setState((prev) => {
        const exists = prev.datasets.some((dataset) => dataset.id === record.id)
        const datasets = exists
          ? prev.datasets.map((dataset) => (dataset.id === record.id ? record : dataset))
          : [record, ...prev.datasets]
        return { ...prev, datasets, activeDatasetId: record.id }
      })
      showToast(
        'success',
        record.isSynthetic
          ? 'Synthetic test dataset is now active. It is not real farm data.'
          : 'Dataset analyzed and set as the active file.',
      )
      return record
    },
    [showToast],
  )

  const setActiveDataset = useCallback(
    (id) => {
      setState((prev) => ({ ...prev, activeDatasetId: id }))
      showToast('success', 'Active dataset updated. Dashboard and reports now use this file.')
    },
    [showToast],
  )

  const deleteDataset = useCallback(
    (id) => {
      setState((prev) => {
        const datasets = prev.datasets.filter((dataset) => dataset.id !== id)
        const activeDatasetId = prev.activeDatasetId === id ? (datasets[0]?.id ?? null) : prev.activeDatasetId
        return { ...prev, datasets, activeDatasetId }
      })
      showToast('success', 'Dataset deleted.')
    },
    [showToast],
  )

  const clearDatasets = useCallback(() => {
    setState((prev) => ({ ...prev, datasets: [], activeDatasetId: null }))
    showToast('success', 'Uploaded datasets cleared. Manual farms and readings were kept.')
  }, [showToast])

  const datasets = Array.isArray(state.datasets) ? state.datasets : EMPTY_DATASETS
  const activeDataset = datasets.find((dataset) => dataset.id === state.activeDatasetId) ?? null
  const datasetReport = useMemo(() => {
    if (!activeDataset) return null
    try {
      return buildDatasetReport(activeDataset)
    } catch {
      return null
    }
  }, [activeDataset])

  const value = useMemo(
    () => ({
      farms: state.farms,
      readings: state.readings,
      recommendations: state.recommendations,
      toast,
      showToast,
      clearToast,
      addFarm,
      updateFarm,
      deleteFarm,
      addReading,
      deleteReading,
      addRecommendation,
      deleteRecommendation,
      loadDemoData,
      resetAllData,
      datasets,
      activeDataset,
      datasetReport,
      saveDataset,
      setActiveDataset,
      deleteDataset,
      clearDatasets,
    }),
    [
      state.farms,
      state.readings,
      state.recommendations,
      datasets,
      activeDataset,
      datasetReport,
      toast,
      showToast,
      clearToast,
      addFarm,
      updateFarm,
      deleteFarm,
      addReading,
      deleteReading,
      addRecommendation,
      deleteRecommendation,
      loadDemoData,
      resetAllData,
      saveDataset,
      setActiveDataset,
      deleteDataset,
      clearDatasets,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
