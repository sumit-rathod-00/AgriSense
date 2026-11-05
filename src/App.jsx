import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import ErrorBoundary from './components/ErrorBoundary'
import Layout from './components/Layout'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const DataAnalysis = lazy(() => import('./pages/DataAnalysis'))
const FarmManagement = lazy(() => import('./pages/FarmManagement'))
const CropMonitoring = lazy(() => import('./pages/CropMonitoring'))
const Recommendations = lazy(() => import('./pages/Recommendations'))
const Reports = lazy(() => import('./pages/Reports'))
const About = lazy(() => import('./pages/About'))

function PageFallback() {
  return (
    <div className="flex h-64 items-center justify-center text-sm text-slate-500">
      Loading page…
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <BrowserRouter>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/analysis" element={<DataAnalysis />} />
                <Route path="/farms" element={<FarmManagement />} />
                <Route path="/monitoring" element={<CropMonitoring />} />
                <Route path="/recommendations" element={<Recommendations />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/about" element={<About />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AppProvider>
    </ErrorBoundary>
  )
}
