import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import Toast from './Toast'

const TITLES = {
  '/': {
    title: 'Dashboard',
    subtitle: 'Overview of the active dataset, or manual records when no file is loaded',
  },
  '/analysis': {
    title: 'Data Analysis',
    subtitle: 'Upload a dataset, validate it, and download a report',
  },
  '/farms': {
    title: 'Farm Management',
    subtitle: 'Add, edit, and organize demonstration farms',
  },
  '/monitoring': {
    title: 'Crop Monitoring',
    subtitle: 'Record soil moisture, pH, and temperature readings',
  },
  '/recommendations': {
    title: 'Smart Recommendations',
    subtitle: 'Rule-based irrigation suggestions from entered readings',
  },
  '/reports': {
    title: 'Reports',
    subtitle: 'Download a PDF report from the active dataset, or export manual records',
  },
  '/about': {
    title: 'About the System',
    subtitle: 'Purpose, architecture, and demonstration limits',
  },
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const meta = TITLES[location.pathname] ?? TITLES['/']

  return (
    <div className="min-h-svh bg-stone-50 lg:flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar title={meta.title} subtitle={meta.subtitle} onMenu={() => setSidebarOpen(true)} />
        <main className="flex-1 px-4 py-6 sm:px-6">
          <Outlet />
        </main>
      </div>
      <Toast />
    </div>
  )
}
