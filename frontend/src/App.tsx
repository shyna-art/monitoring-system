import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './Sidebar'
import Dashboard from './pages/Dashboard'
import DriverTracking from './pages/DriverTracking'
import DepotMonitoring from './pages/DepotMonitoring'
import SystemBreakdown from './pages/SystemBreakdown'
import SBRequests from './pages/SBRequests'

function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/driver-tracking" element={<DriverTracking />} />
          <Route path="/depot-monitoring" element={<DepotMonitoring />} />
          <Route path="/system-breakdown" element={<SystemBreakdown />} />
          <Route path="/sb-requests" element={<SBRequests />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App