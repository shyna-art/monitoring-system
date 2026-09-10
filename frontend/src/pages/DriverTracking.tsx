import { useEffect, useState } from 'react'
import { Pencil, Check, X, Archive, Upload } from 'lucide-react'
import {
  PageHeader, Card, CardHeader, CardBody, StatCard, Badge, Button,
  inputClass, Table, TableHead, ConfirmDialog, Collapsible, ExportButton
} from '../components/ui'
import { exportToExcel } from '../utils/excel'
import * as XLSX from 'xlsx'

interface Depot {
  id: string
  name: string
  created_at: string
}

interface Trucker {
  id: string
  name: string
  depot_id: string
  depots: { name: string } | null
}

interface Driver {
  id: string
  name: string
  trucker_id: string
  truckers: { name: string; depots: { name: string } | null } | null
}

interface DriverMonitoring {
  id: string
  driver_id: string
  monitoring_date: string
  status: string
  reason_id: string | null
  remarks: string | null
  drivers: { name: string; truckers: { name: string; depots: { name: string } | null } | null } | null
  driver_non_usage_reasons: { reason: string } | null
}

interface Reason {
  id: string
  reason: string
  is_active: boolean
}

interface TruckerStat {
  trucker_id: string
  trucker_name: string
  depot_name: string | null
  total_drivers: number
  using: number
  not_using: number
  not_monitored: number
  usage_rate: number
  non_usage_rate: number
}

interface AnalyticsData {
  overall: {
    total_drivers: number
    using: number
    not_using: number
    not_monitored: number
    usage_rate: number
    non_usage_rate: number
  }
  by_trucker: TruckerStat[]
  top_truckers_by_not_using_count: TruckerStat[]
  top_truckers_by_non_usage_rate: TruckerStat[]
}

interface DailyMonitoringRow {
  driver_id: string
  driver_name: string
  trucker_name: string
  delivery: 'Yes' | 'No'
  status: string
  reason_id: string | null
  remarks: string | null
}

const API_URL = import.meta.env.VITE_API_URL

function DriverTracking() {
  const [depots, setDepots] = useState<Depot[]>([])
  const [newDepotName, setNewDepotName] = useState('')
  const [depotLoading, setDepotLoading] = useState(false)
  const [editingDepotId, setEditingDepotId] = useState<string | null>(null)
  const [editingDepotName, setEditingDepotName] = useState('')
  const [depotSearch, setDepotSearch] = useState('')

  const [truckers, setTruckers] = useState<Trucker[]>([])
  const [newTruckerName, setNewTruckerName] = useState('')
  const [newTruckerDepotId, setNewTruckerDepotId] = useState('')
  const [truckerLoading, setTruckerLoading] = useState(false)
  const [editingTruckerId, setEditingTruckerId] = useState<string | null>(null)
  const [editingTruckerName, setEditingTruckerName] = useState('')
  const [editingTruckerDepotId, setEditingTruckerDepotId] = useState('')
  const [truckerSearch, setTruckerSearch] = useState('')

  const [drivers, setDrivers] = useState<Driver[]>([])
  const [newDriverName, setNewDriverName] = useState('')
  const [newDriverTruckerId, setNewDriverTruckerId] = useState('')
  const [driverLoading, setDriverLoading] = useState(false)
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null)
  const [editingDriverName, setEditingDriverName] = useState('')
  const [editingDriverTruckerId, setEditingDriverTruckerId] = useState('')
  const [driverSearch, setDriverSearch] = useState('')

  const [reasons, setReasons] = useState<Reason[]>([])
  const [monitoringRecords, setMonitoringRecords] = useState<DriverMonitoring[]>([])

  const [editingMonId, setEditingMonId] = useState<string | null>(null)
  const [editingMonDriverId, setEditingMonDriverId] = useState('')
  const [editingMonDate, setEditingMonDate] = useState('')
  const [editingMonStatus, setEditingMonStatus] = useState('Using')
  const [editingMonReasonId, setEditingMonReasonId] = useState('')
  const [editingMonRemarks, setEditingMonRemarks] = useState('')
  const [confirmDeleteMonId, setConfirmDeleteMonId] = useState<string | null>(null)

  const [confirmArchive, setConfirmArchive] = useState<{ type: 'depot' | 'trucker' | 'driver'; id: string; name: string } | null>(null)

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)

  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')
  const [filterDepotId, setFilterDepotId] = useState('')
  const [filterTruckerId, setFilterTruckerId] = useState('')

  const [truckerUploadResult, setTruckerUploadResult] = useState<{
    created: { name: string; depot_name: string; trucker_id: string }[]
    existing: { name: string; depot_name: string; trucker_id: string }[]
    skipped: { name: string; depot_name?: string; reason: string }[]
  } | null>(null)

  const [driverUploadResult, setDriverUploadResult] = useState<{
    created: { name: string; trucker_name: string; depot_name: string; driver_id: string }[]
    existing: { name: string; trucker_name: string; depot_name: string; driver_id: string }[]
    skipped: { name: string; trucker_name?: string; depot_name?: string; reason: string }[]
  } | null>(null)
  const [truckerUploading, setTruckerUploading] = useState(false)
  const [driverUploading, setDriverUploading] = useState(false)

  // --- Depot Daily Monitoring (new workflow) ---
  const [dailyDate, setDailyDate] = useState(new Date().toISOString().split('T')[0])
  const [dailyDepotId, setDailyDepotId] = useState('')
  const [dailyRows, setDailyRows] = useState<DailyMonitoringRow[]>([])
  const [dailySearch, setDailySearch] = useState('')
  const [dailyLoading, setDailyLoading] = useState(false)
  const [dailySaving, setDailySaving] = useState(false)
  const [dailyMessage, setDailyMessage] = useState('')
  const [dailyAlreadyMonitored, setDailyAlreadyMonitored] = useState(false)

// --- Bulk delete for history ---
const [selectedMonIds, setSelectedMonIds] = useState<Set<string>>(new Set())
const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)

// --- Reports ---
interface UsageReport {
  overall: { eligible_driver_days: number; using: number; not_using: number; no_delivery: number; usage_rate: number; non_usage_rate: number }
  by_month: { month: string; eligible_driver_days: number; using: number; not_using: number; no_delivery: number; usage_rate: number }[]
  by_depot: { depot: string; eligible_driver_days: number; using: number; not_using: number; no_delivery: number; usage_rate: number }[]
  by_driver: { driver: string; eligible_days: number; using: number; not_using: number; usage_rate: number }[]
}
const [reportStart, setReportStart] = useState('')
const [reportEnd, setReportEnd] = useState('')
const [reportDepotId, setReportDepotId] = useState('')
const [report, setReport] = useState<UsageReport | null>(null)
const [reportLoading, setReportLoading] = useState(false)

  const fetchAnalytics = async () => {
    const res = await fetch(`${API_URL}/api/analytics/driver-tracking`)
    setAnalytics(await res.json())
  }

  const fetchDepots = async () => {
    const res = await fetch(`${API_URL}/api/depots`)
    setDepots(await res.json())
  }

  const fetchTruckers = async () => {
    const res = await fetch(`${API_URL}/api/truckers`)
    setTruckers(await res.json())
  }

  const fetchDrivers = async () => {
    const res = await fetch(`${API_URL}/api/drivers`)
    setDrivers(await res.json())
  }

  const fetchReasons = async () => {
    const res = await fetch(`${API_URL}/api/driver-reasons`)
    setReasons(await res.json())
  }

  const fetchMonitoringRecords = async () => {
    const res = await fetch(`${API_URL}/api/driver-monitoring`)
    setMonitoringRecords(await res.json())
  }

  const handleArchive = async () => {
    if (!confirmArchive) return
    const { type, id } = confirmArchive
    const endpoint = type === 'depot' ? 'depots' : type === 'trucker' ? 'truckers' : 'drivers'
    await fetch(`${API_URL}/api/${endpoint}/${id}/archive`, { method: 'PUT' })
    setConfirmArchive(null)
    await fetchDepots()
    await fetchTruckers()
    await fetchDrivers()
  }

  useEffect(() => {
    fetchDepots()
    fetchTruckers()
    fetchDrivers()
    fetchReasons()
    fetchMonitoringRecords()
    fetchAnalytics()
  }, [])


  
  // --- Depot Daily Monitoring handlers ---
  const fetchDailyMonitoring = async (depotId: string, dateStr: string) => {
    setDailyLoading(true)
    setDailyMessage('')
    const res = await fetch(`${API_URL}/api/driver-monitoring/by-depot-date?depot_id=${depotId}&monitoring_date=${dateStr}`)
    const data = await res.json()
    setDailyRows(data.drivers)
    setDailyAlreadyMonitored(data.already_monitored)
    setDailyLoading(false)
  }

  useEffect(() => {
    if (dailyDepotId && dailyDate) {
      fetchDailyMonitoring(dailyDepotId, dailyDate)
    } else {
      setDailyRows([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dailyDepotId, dailyDate])

  const updateDailyRow = (driverId: string, updates: Partial<DailyMonitoringRow>) => {
    setDailyRows((prev) =>
      prev.map((r) => (r.driver_id === driverId ? { ...r, ...updates } : r))
    )
  }

  const handleDeliveryChange = (driverId: string, delivery: 'Yes' | 'No') => {
    if (delivery === 'No') {
      updateDailyRow(driverId, { delivery: 'No', status: 'No Delivery', reason_id: null })
    } else {
      updateDailyRow(driverId, { delivery: 'Yes', status: 'Using', reason_id: null })
    }
  }

  const filteredDailyRows = dailyRows.filter((r) => {
    if (!dailySearch.trim()) return true
    const q = dailySearch.toLowerCase()
    return r.driver_name.toLowerCase().includes(q) || r.trucker_name.toLowerCase().includes(q)
  })

  const handleSaveDailyMonitoring = async () => {
    setDailySaving(true)
    setDailyMessage('')

    const invalidRow = dailyRows.find(
      (r) => r.delivery === 'Yes' && r.status === 'Not Using' && !r.reason_id
    )
    if (invalidRow) {
      setDailyMessage(`Reason is required for "${invalidRow.driver_name}" (Not Using).`)
      setDailySaving(false)
      return
    }

    const items = dailyRows.map((r) => ({
      driver_id: r.driver_id,
      delivery: r.delivery,
      status: r.status,
      reason_id: r.status === 'Not Using' ? r.reason_id : null,
      remarks: r.remarks || null,
    }))

    const res = await fetch(`${API_URL}/api/driver-monitoring/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ monitoring_date: dailyDate, items }),
    })
    const data = await res.json()

    if (data.errors && data.errors.length > 0) {
      setDailyMessage(`Saved ${data.saved}, but ${data.errors.length} record(s) had errors.`)
    } else {
      setDailyMessage(`Saved monitoring for ${data.saved} driver(s).`)
    }

    await fetchAnalytics()
    await fetchMonitoringRecords()
    setDailySaving(false)
  }

  // --- Depot handlers ---
  const handleAddDepot = async () => {
    if (!newDepotName.trim()) return
    setDepotLoading(true)
    await fetch(`${API_URL}/api/depots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newDepotName }),
    })
    setNewDepotName('')
    await fetchDepots()
    setDepotLoading(false)
  }

  const startEditingDepot = (depot: Depot) => {
    setEditingDepotId(depot.id)
    setEditingDepotName(depot.name)
  }

  const saveDepotEdit = async (depotId: string) => {
    if (!editingDepotName.trim()) return
    await fetch(`${API_URL}/api/depots/${depotId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editingDepotName }),
    })
    setEditingDepotId(null)
    await fetchDepots()
    await fetchTruckers()
    await fetchDrivers()
  }

  const filteredDepots = depots.filter((d) =>
    d.name.toLowerCase().includes(depotSearch.toLowerCase())
  )

  // --- Trucker Excel upload ---
  const handleTruckerFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setTruckerUploading(true)
    setTruckerUploadResult(null)

    const data = await file.arrayBuffer()
    const workbook = XLSX.read(data)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows: any[] = XLSX.utils.sheet_to_json(sheet)

    const items = rows
      .map((row) => ({
        name: String(row.Name || row.name || '').trim(),
        depot_name: String(row.Depot || row.depot || '').trim(),
      }))
      .filter((item) => item.name && item.depot_name)

    const res = await fetch(`${API_URL}/api/truckers/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })
    const result = await res.json()
    setTruckerUploadResult(result)
    await fetchTruckers()
    setTruckerUploading(false)
    e.target.value = ''
  }

  const handleDriverFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setDriverUploading(true)
    setDriverUploadResult(null)

    const data = await file.arrayBuffer()
    const workbook = XLSX.read(data)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows: any[] = XLSX.utils.sheet_to_json(sheet)

    const items = rows
      .map((row) => ({
        name: String(row.Name || row.name || '').trim(),
        trucker_name: String(row.Trucker || row.trucker || '').trim(),
        depot_name: String(row.Depot || row.depot || '').trim(),
      }))
      .filter((item) => item.name && item.trucker_name && item.depot_name)

    const res = await fetch(`${API_URL}/api/drivers/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })
    const result = await res.json()
    setDriverUploadResult(result)
    await fetchDrivers()
    setDriverUploading(false)
    e.target.value = ''
  }

  // --- Trucker handlers ---
  const handleAddTrucker = async () => {
    if (!newTruckerName.trim() || !newTruckerDepotId) return
    setTruckerLoading(true)
    await fetch(`${API_URL}/api/truckers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTruckerName, depot_id: newTruckerDepotId }),
    })
    setNewTruckerName('')
    setNewTruckerDepotId('')
    await fetchTruckers()
    setTruckerLoading(false)
  }

  const startEditingTrucker = (trucker: Trucker) => {
    setEditingTruckerId(trucker.id)
    setEditingTruckerName(trucker.name)
    setEditingTruckerDepotId(trucker.depot_id)
  }

  const saveTruckerEdit = async (truckerId: string) => {
    if (!editingTruckerName.trim() || !editingTruckerDepotId) return
    await fetch(`${API_URL}/api/truckers/${truckerId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editingTruckerName, depot_id: editingTruckerDepotId }),
    })
    setEditingTruckerId(null)
    await fetchTruckers()
    await fetchDrivers()
  }

  const filteredTruckers = truckers.filter((t) => {
    const q = truckerSearch.toLowerCase()
    return t.name.toLowerCase().includes(q) || (t.depots?.name ?? '').toLowerCase().includes(q)
  })

  // --- Driver handlers ---
  const handleAddDriver = async () => {
    if (!newDriverName.trim() || !newDriverTruckerId) return
    setDriverLoading(true)
    await fetch(`${API_URL}/api/drivers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newDriverName, trucker_id: newDriverTruckerId }),
    })
    setNewDriverName('')
    setNewDriverTruckerId('')
    await fetchDrivers()
    setDriverLoading(false)
  }

  const startEditingDriver = (driver: Driver) => {
    setEditingDriverId(driver.id)
    setEditingDriverName(driver.name)
    setEditingDriverTruckerId(driver.trucker_id)
  }

  const saveDriverEdit = async (driverId: string) => {
    if (!editingDriverName.trim() || !editingDriverTruckerId) return
    await fetch(`${API_URL}/api/drivers/${driverId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editingDriverName, trucker_id: editingDriverTruckerId }),
    })
    setEditingDriverId(null)
    await fetchDrivers()
  }

  const filteredDrivers = drivers.filter((d) => {
    const q = driverSearch.toLowerCase()
    return (
      d.name.toLowerCase().includes(q) ||
      (d.truckers?.name ?? '').toLowerCase().includes(q) ||
      (d.truckers?.depots?.name ?? '').toLowerCase().includes(q)
    )
  })

// --- Bulk delete handlers ---
const toggleSelectMon = (id: string) => {
  setSelectedMonIds((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })
}

const toggleSelectAllMon = () => {
  const allFilteredSelected =
    filteredMonitoringRecords.length > 0 &&
    filteredMonitoringRecords.every((rec) => selectedMonIds.has(rec.id))

  setSelectedMonIds((prev) => {
    const next = new Set(prev)

    if (allFilteredSelected) {
      filteredMonitoringRecords.forEach((rec) => next.delete(rec.id))
    } else {
      filteredMonitoringRecords.forEach((rec) => next.add(rec.id))
    }

    return next
  })
}

const handleBulkDeleteMon = async () => {
  if (selectedMonIds.size === 0) return

  await fetch(`${API_URL}/api/driver-monitoring/bulk-delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids: Array.from(selectedMonIds) }),
  })
  setSelectedMonIds(new Set())
  setConfirmBulkDelete(false)
  await fetchMonitoringRecords()
  await fetchAnalytics()
}

// --- Export history ---
const handleExportHistory = () => {
  const data = filteredMonitoringRecords.map((rec) => ({
    Date: rec.monitoring_date,
    Driver: rec.drivers?.name ?? 'Unknown',
    Trucker: rec.drivers?.truckers?.name ?? '—',
    Depot: rec.drivers?.truckers?.depots?.name ?? '—',
    Status: rec.status,
    Reason: rec.driver_non_usage_reasons?.reason ?? '—',
    Remarks: rec.remarks ?? '—',
  }))
  exportToExcel('driver-monitoring-history', 'Monitoring History', data)
}

// --- Reports ---
const fetchReport = async () => {
  setReportLoading(true)
  const params = new URLSearchParams()
  if (reportStart) params.set('start_date', reportStart)
  if (reportEnd) params.set('end_date', reportEnd)
  if (reportDepotId) {
    const depotName = depots.find((d) => d.id === reportDepotId)?.name
    if (depotName) params.set('depot_id', reportDepotId)
  }
  const res = await fetch(`${API_URL}/api/analytics/driver-app-usage?${params.toString()}`)
  setReport(await res.json())
  setReportLoading(false)
}

const handleExportReport = () => {
  if (!report) return

  const summarySheet = [{
    'Eligible Driver-Days': report.overall.eligible_driver_days,
    Using: report.overall.using,
    'Not Using': report.overall.not_using,
    'No Delivery': report.overall.no_delivery,
    'Usage Rate (%)': report.overall.usage_rate,
    'Non-Usage Rate (%)': report.overall.non_usage_rate,
  }]
  exportToExcel('usage-report-summary', 'Summary', summarySheet)

  if (report.by_month.length > 0) {
    const monthData = report.by_month.map((m) => ({
      Month: m.month,
      'Eligible Driver-Days': m.eligible_driver_days,
      Using: m.using,
      'Not Using': m.not_using,
      'No Delivery': m.no_delivery,
      'Usage Rate (%)': m.usage_rate,
    }))
    exportToExcel('usage-report-by-month', 'By Month', monthData)
  }

  if (report.by_depot.length > 0) {
    const depotData = report.by_depot.map((d) => ({
      Depot: d.depot,
      'Eligible Driver-Days': d.eligible_driver_days,
      Using: d.using,
      'Not Using': d.not_using,
      'No Delivery': d.no_delivery,
      'Usage Rate (%)': d.usage_rate,
    }))
    exportToExcel('usage-report-by-depot', 'By Depot', depotData)
  }

  if (report.by_driver.length > 0) {
    const driverData = report.by_driver.map((d) => ({
      Driver: d.driver,
      'Eligible Days': d.eligible_days,
      Using: d.using,
      'Not Using': d.not_using,
      'Usage Rate (%)': d.usage_rate,
    }))
    exportToExcel('usage-report-by-driver', 'By Driver', driverData)
  }
}

  // --- Monitoring history filters ---
  const filteredMonitoringRecords = monitoringRecords.filter((rec) => {
    if (filterStartDate && rec.monitoring_date < filterStartDate) return false
    if (filterEndDate && rec.monitoring_date > filterEndDate) return false

    const recTruckerName = rec.drivers?.truckers?.name
    const recDepotName = rec.drivers?.truckers?.depots?.name

    if (filterDepotId) {
      const depotName = depots.find((d) => d.id === filterDepotId)?.name
      if (recDepotName !== depotName) return false
    }

    if (filterTruckerId) {
      const selectedTrucker = truckers.find((t) => t.id === filterTruckerId)
      if (!selectedTrucker) return false
      if (recTruckerName !== selectedTrucker.name || recDepotName !== selectedTrucker.depots?.name) {
        return false
      }
    }

    return true
  })

  const clearFilters = () => {
    setFilterStartDate('')
    setFilterEndDate('')
    setFilterDepotId('')
    setFilterTruckerId('')
  }

  const startEditingMonitoring = (rec: DriverMonitoring) => {
    setEditingMonId(rec.id)
    setEditingMonDriverId(rec.driver_id)
    setEditingMonDate(rec.monitoring_date)
    setEditingMonStatus(rec.status)
    setEditingMonReasonId(rec.reason_id ?? '')
    setEditingMonRemarks(rec.remarks ?? '')
  }

  const saveMonitoringEdit = async (recordId: string) => {
    await fetch(`${API_URL}/api/driver-monitoring/${recordId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        driver_id: editingMonDriverId,
        monitoring_date: editingMonDate,
        status: editingMonStatus,
        reason_id: editingMonReasonId || null,
        remarks: editingMonRemarks || null,
      }),
    })
    setEditingMonId(null)
    await fetchMonitoringRecords()
    await fetchAnalytics()
  }

  const handleDeleteMonitoring = async () => {
    if (!confirmDeleteMonId) return
    await fetch(`${API_URL}/api/driver-monitoring/${confirmDeleteMonId}`, { method: 'DELETE' })
    setConfirmDeleteMonId(null)
    await fetchMonitoringRecords()
    await fetchAnalytics()
  }

  const statusBadgeTone = (status: string) => {
    if (status === 'Using') return 'green'
    if (status === 'Not Using') return 'red'
    return 'gray' // No Delivery / Not Monitored (legacy)
  }

  return (
    <div className="flex-1 p-8">
      <div className="max-w-4xl space-y-8">
        <PageHeader title="Driver Tracking" description="Monitor depots, manage the driver hierarchy, and track daily app usage." />

        {/* DEPOT DAILY MONITORING — primary workflow */}
        <section>
          <h2 className="text-base font-semibold text-slate-800 mb-3">Depot Daily Monitoring</h2>
          <Card className="mb-4">
            <CardBody>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Monitoring Date</label>
                  <input
                    type="date"
                    value={dailyDate}
                    onChange={(e) => setDailyDate(e.target.value)}
                    className={`w-full ${inputClass}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Depot</label>
                  <select
                    value={dailyDepotId}
                    onChange={(e) => setDailyDepotId(e.target.value)}
                    className={`w-full ${inputClass}`}
                  >
                    <option value="">Select Depot</option>
                    {depots.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {dailyDepotId && dailyDate && (
                <input
                  type="text"
                  value={dailySearch}
                  onChange={(e) => setDailySearch(e.target.value)}
                  placeholder="Search driver or trucker…"
                  className={`w-full ${inputClass}`}
                />
              )}
            </CardBody>
          </Card>

          {!dailyDepotId || !dailyDate ? (
            <Card>
              <CardBody>
                <p className="text-sm text-slate-400 text-center py-6">
                  Select a date and depot to begin monitoring.
                </p>
              </CardBody>
            </Card>
          ) : dailyLoading ? (
            <Card>
              <CardBody>
                <p className="text-sm text-slate-400 text-center py-6">Loading drivers…</p>
              </CardBody>
            </Card>
          ) : dailyRows.length === 0 ? (
            <Card>
              <CardBody>
                <p className="text-sm text-slate-400 text-center py-6">
                  This depot has no active drivers yet.
                </p>
              </CardBody>
            </Card>
          ) : (
            <Card>
              {dailyAlreadyMonitored && (
                <div className="px-5 py-2.5 bg-blue-50 border-b border-blue-100 text-xs text-blue-700">
                  This depot already has saved monitoring for this date — showing existing results. Saving again will update them.
                </div>
              )}
              <CardBody className="!p-0">
                <Table>
                  <TableHead columns={['Driver', 'Trucker', 'Delivery?', 'Driver App Status', 'Reason', 'Remarks']} />
                  <tbody>
                    {filteredDailyRows.map((row) => (
                      <tr key={row.driver_id} className="border-b border-slate-50 last:border-0 align-top">
                        <td className="px-5 py-3 text-slate-800">{row.driver_name}</td>
                        <td className="px-5 py-3 text-slate-500">{row.trucker_name}</td>
                        <td className="px-5 py-3">
                          <select
                            value={row.delivery}
                            onChange={(e) => handleDeliveryChange(row.driver_id, e.target.value as 'Yes' | 'No')}
                            className={inputClass}
                          >
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </select>
                        </td>
                        <td className="px-5 py-3">
                          {row.delivery === 'No' ? (
                            <Badge tone="gray">No Delivery</Badge>
                          ) : (
                            <select
                              value={row.status}
                              onChange={(e) =>
                                updateDailyRow(row.driver_id, {
                                  status: e.target.value,
                                  reason_id: e.target.value === 'Using' ? null : row.reason_id,
                                })
                              }
                              className={inputClass}
                            >
                              <option value="Using">Using</option>
                              <option value="Not Using">Not Using</option>
                            </select>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          {row.delivery === 'Yes' && row.status === 'Not Using' ? (
                            <select
                              value={row.reason_id ?? ''}
                              onChange={(e) => updateDailyRow(row.driver_id, { reason_id: e.target.value || null })}
                              className={inputClass}
                            >
                              <option value="">Select Reason</option>
                              {reasons.filter((r) => r.is_active).map((r) => (
                                <option key={r.id} value={r.id}>{r.reason}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <input
                            type="text"
                            value={row.remarks ?? ''}
                            onChange={(e) => updateDailyRow(row.driver_id, { remarks: e.target.value })}
                            placeholder="Optional"
                            className={`w-full ${inputClass}`}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </CardBody>
              <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-sm text-slate-500">
                  {filteredDailyRows.length} of {dailyRows.length} driver{dailyRows.length === 1 ? '' : 's'}
                </span>
                <div className="flex items-center gap-3">
                  {dailyMessage && <span className="text-xs text-slate-500">{dailyMessage}</span>}
                  <Button onClick={handleSaveDailyMonitoring} disabled={dailySaving}>
                    {dailySaving ? 'Saving…' : 'Save Monitoring'}
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </section>

        {/* ANALYTICS */}
        {analytics && (
          <section>
            <h2 className="text-base font-semibold text-slate-800 mb-3">Driver Tracking Summary</h2>
            <div className="grid grid-cols-4 gap-4 mb-4">
              <StatCard label="Total Drivers" value={analytics.overall.total_drivers} />
              <StatCard label={`Usage Rate (${analytics.overall.using})`} value={`${analytics.overall.usage_rate}%`} tone="green" />
              <StatCard label={`Non-Usage Rate (${analytics.overall.not_using})`} value={`${analytics.overall.non_usage_rate}%`} tone="red" />
              <StatCard label="Not Monitored" value={analytics.overall.not_monitored} tone="gray" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader title="Top Truckers — Most Not Using" />
                <CardBody>
                  {analytics.top_truckers_by_not_using_count.length === 0 ? (
                    <p className="text-xs text-slate-400">No data yet</p>
                  ) : (
                    <ul className="space-y-3">
                      {analytics.top_truckers_by_not_using_count.map((t) => (
                        <li key={t.trucker_id} className="flex justify-between items-center text-sm">
                          <span className="text-slate-700">{t.trucker_name} <span className="text-slate-400 text-xs">({t.depot_name})</span></span>
                          <Badge tone="red">{t.not_using} not using</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardBody>
              </Card>

              <Card>
                <CardHeader title="Top Truckers — Highest Non-Usage %" />
                <CardBody>
                  {analytics.top_truckers_by_non_usage_rate.length === 0 ? (
                    <p className="text-xs text-slate-400">No data yet</p>
                  ) : (
                    <ul className="space-y-3">
                      {analytics.top_truckers_by_non_usage_rate.map((t) => (
                        <li key={t.trucker_id} className="flex justify-between items-center text-sm">
                          <span className="text-slate-700">{t.trucker_name} <span className="text-slate-400 text-xs">({t.depot_name})</span></span>
                          <Badge tone="red">{t.non_usage_rate}%</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardBody>
              </Card>
            </div>

            <Card className="mt-4">
              <CardHeader title="All Truckers — Detailed Breakdown" />
              <CardBody className="!p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b border-slate-100 bg-slate-50/50">
                      <th className="px-5 py-3 font-medium">Trucker</th>
                      <th className="px-5 py-3 font-medium">Depot</th>
                      <th className="px-5 py-3 font-medium text-center">Total</th>
                      <th className="px-5 py-3 font-medium text-center">Using</th>
                      <th className="px-5 py-3 font-medium text-center">Not Using</th>
                      <th className="px-5 py-3 font-medium text-center">Usage %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.by_trucker.map((t) => (
                      <tr key={t.trucker_id} className="border-b border-slate-50 last:border-0">
                        <td className="px-5 py-3 text-slate-800">{t.trucker_name}</td>
                        <td className="px-5 py-3 text-slate-500">{t.depot_name}</td>
                        <td className="px-5 py-3 text-center text-slate-800">{t.total_drivers}</td>
                        <td className="px-5 py-3 text-center text-emerald-600 font-medium">{t.using}</td>
                        <td className="px-5 py-3 text-center text-rose-600 font-medium">{t.not_using}</td>
                        <td className="px-5 py-3 text-center text-slate-800">{t.usage_rate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardBody>
            </Card>
          </section>
        )}

{/* MONITORING REPORTS */}
<section>
  <h2 className="text-base font-semibold text-slate-800 mb-3">Monitoring Reports</h2>
  <Card className="mb-4">
    <CardHeader title="Generate Report" />
    <CardBody>
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
          <input type="date" value={reportStart} onChange={(e) => setReportStart(e.target.value)} className={`w-full ${inputClass}`} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
          <input type="date" value={reportEnd} onChange={(e) => setReportEnd(e.target.value)} className={`w-full ${inputClass}`} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Depot</label>
          <select value={reportDepotId} onChange={(e) => setReportDepotId(e.target.value)} className={`w-full ${inputClass}`}>
            <option value="">All Depots</option>
            {depots.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={fetchReport} disabled={reportLoading || !reportStart || !reportEnd}>
          {reportLoading ? 'Generating…' : 'Generate Report'}
        </Button>
        {report && <ExportButton onClick={handleExportReport} />}
      </div>
      {!reportStart || !reportEnd ? (
        <p className="text-xs text-slate-400 mt-2">Pick a date range to generate a report (e.g. a full month or year).</p>
      ) : null}
    </CardBody>
  </Card>

  {report && (
    <>
      <div className="grid grid-cols-5 gap-3 mb-4">
        <StatCard label="Eligible Driver-Days" value={report.overall.eligible_driver_days} />
        <StatCard label="Using" value={report.overall.using} tone="green" />
        <StatCard label="Not Using" value={report.overall.not_using} tone="red" />
        <StatCard label="No Delivery" value={report.overall.no_delivery} tone="gray" />
        <StatCard label="Usage Rate" value={`${report.overall.usage_rate}%`} tone="green" />
      </div>

      {report.by_month.length > 0 && (
        <Card className="mb-4">
          <CardHeader title="By Month" />
          <CardBody className="!p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100 bg-slate-50/50">
                  <th className="px-5 py-3 font-medium">Month</th>
                  <th className="px-5 py-3 font-medium text-center">Eligible Days</th>
                  <th className="px-5 py-3 font-medium text-center">Using</th>
                  <th className="px-5 py-3 font-medium text-center">Not Using</th>
                  <th className="px-5 py-3 font-medium text-center">No Delivery</th>
                  <th className="px-5 py-3 font-medium text-center">Usage %</th>
                </tr>
              </thead>
              <tbody>
                {report.by_month.map((m) => (
                  <tr key={m.month} className="border-b border-slate-50 last:border-0">
                    <td className="px-5 py-3 text-slate-800">{m.month}</td>
                    <td className="px-5 py-3 text-center text-slate-800">{m.eligible_driver_days}</td>
                    <td className="px-5 py-3 text-center text-emerald-600 font-medium">{m.using}</td>
                    <td className="px-5 py-3 text-center text-rose-600 font-medium">{m.not_using}</td>
                    <td className="px-5 py-3 text-center text-slate-500">{m.no_delivery}</td>
                    <td className="px-5 py-3 text-center text-slate-800">{m.usage_rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}

      {report.by_depot.length > 0 && (
        <Card className="mb-4">
          <CardHeader title="By Depot" />
          <CardBody className="!p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100 bg-slate-50/50">
                  <th className="px-5 py-3 font-medium">Depot</th>
                  <th className="px-5 py-3 font-medium text-center">Eligible Days</th>
                  <th className="px-5 py-3 font-medium text-center">Using</th>
                  <th className="px-5 py-3 font-medium text-center">Not Using</th>
                  <th className="px-5 py-3 font-medium text-center">Usage %</th>
                </tr>
              </thead>
              <tbody>
                {report.by_depot.map((d) => (
                  <tr key={d.depot} className="border-b border-slate-50 last:border-0">
                    <td className="px-5 py-3 text-slate-800">{d.depot}</td>
                    <td className="px-5 py-3 text-center text-slate-800">{d.eligible_driver_days}</td>
                    <td className="px-5 py-3 text-center text-emerald-600 font-medium">{d.using}</td>
                    <td className="px-5 py-3 text-center text-rose-600 font-medium">{d.not_using}</td>
                    <td className="px-5 py-3 text-center text-slate-800">{d.usage_rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}

      {report.by_driver.length > 0 && (
        <Card>
          <CardHeader title="By Driver (lowest usage first)" />
          <CardBody className="!p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100 bg-slate-50/50">
                  <th className="px-5 py-3 font-medium">Driver</th>
                  <th className="px-5 py-3 font-medium text-center">Eligible Days</th>
                  <th className="px-5 py-3 font-medium text-center">Using</th>
                  <th className="px-5 py-3 font-medium text-center">Not Using</th>
                  <th className="px-5 py-3 font-medium text-center">Usage %</th>
                </tr>
              </thead>
              <tbody>
                {report.by_driver.map((d) => (
                  <tr key={d.driver} className="border-b border-slate-50 last:border-0">
                    <td className="px-5 py-3 text-slate-800">{d.driver}</td>
                    <td className="px-5 py-3 text-center text-slate-800">{d.eligible_days}</td>
                    <td className="px-5 py-3 text-center text-emerald-600 font-medium">{d.using}</td>
                    <td className="px-5 py-3 text-center text-rose-600 font-medium">{d.not_using}</td>
                    <td className="px-5 py-3 text-center text-slate-800">{d.usage_rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}
    </>
  )}
</section>

        {/* MONITORING HISTORY */}
        <section>
          <h2 className="text-base font-semibold text-slate-800 mb-3">Monitoring History</h2>
          <Card>
           <CardHeader
  title={`Records (${filteredMonitoringRecords.length} of ${monitoringRecords.length})`}
  action={
    <div className="flex items-center gap-2">
      {selectedMonIds.size > 0 && (
        <Button variant="secondary" onClick={() => setConfirmBulkDelete(true)}>
          Delete Selected ({selectedMonIds.size})
        </Button>
      )}
      <ExportButton onClick={handleExportHistory} />
    </div>
  }
/>
            <CardBody className="!p-4 border-b border-slate-100">
              <div className="grid grid-cols-4 gap-2">
                <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className={inputClass} />
                <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className={inputClass} />
                <select value={filterDepotId} onChange={(e) => setFilterDepotId(e.target.value)} className={inputClass}>
                  <option value="">All Depots</option>
                  {depots.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <select value={filterTruckerId} onChange={(e) => setFilterTruckerId(e.target.value)} className={inputClass}>
                  <option value="">All Truckers</option>
                  {truckers.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.depots?.name ?? 'Unknown Depot'})</option>
                  ))}
                </select>
              </div>
              {(filterStartDate || filterEndDate || filterDepotId || filterTruckerId) && (
                <button onClick={clearFilters} className="text-xs text-blue-600 hover:text-blue-700 mt-2">
                  Clear filters
                </button>
              )}
            </CardBody>
            <CardBody className="!p-0">
              <Table>
               <TableHead columns={['', 'Driver', 'Date', 'Status', 'Reason', 'Remarks', '']} />
                <tbody>
  {filteredMonitoringRecords.map((rec) => (
    <tr key={rec.id} className="border-b border-slate-50 last:border-0 align-top">
      <td className="px-5 py-3.5">
        <input
          type="checkbox"
          checked={selectedMonIds.has(rec.id)}
          onChange={() => toggleSelectMon(rec.id)}
          className="rounded border-slate-300"
        />
      </td>
      <td className="px-5 py-3.5 text-slate-800">{rec.drivers?.name ?? 'Unknown Driver'}</td>
                      {editingMonId === rec.id ? (
                        <>
                          <td className="px-5 py-3.5">
                            <input type="date" value={editingMonDate} onChange={(e) => setEditingMonDate(e.target.value)} className={inputClass} />
                          </td>
                          <td className="px-5 py-3.5">
                            <select
                              value={editingMonStatus}
                              onChange={(e) => {
                                setEditingMonStatus(e.target.value)
                                if (e.target.value !== 'Not Using') setEditingMonReasonId('')
                              }}
                              className={inputClass}
                            >
                              <option value="Using">Using</option>
                              <option value="Not Using">Not Using</option>
                              <option value="No Delivery">No Delivery</option>
                            </select>
                          </td>
                          <td className="px-5 py-3.5">
                            {editingMonStatus === 'Not Using' ? (
                              <select value={editingMonReasonId} onChange={(e) => setEditingMonReasonId(e.target.value)} className={inputClass}>
                                <option value="">Select Reason</option>
                                {reasons.filter((r) => r.is_active).map((r) => (
                                  <option key={r.id} value={r.id}>{r.reason}</option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <input type="text" value={editingMonRemarks} onChange={(e) => setEditingMonRemarks(e.target.value)} className={`w-full ${inputClass}`} />
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex justify-end gap-1">
                              <button onClick={() => saveMonitoringEdit(rec.id)} className="text-emerald-600 hover:text-emerald-700 p-1"><Check size={17} /></button>
                              <button onClick={() => setEditingMonId(null)} className="text-slate-400 hover:text-slate-600 p-1"><X size={17} /></button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-5 py-3.5 text-slate-500">{rec.monitoring_date}</td>
                          <td className="px-5 py-3.5">
                            <Badge tone={statusBadgeTone(rec.status)}>{rec.status}</Badge>
                          </td>
                          <td className="px-5 py-3.5 text-slate-500">{rec.driver_non_usage_reasons?.reason ?? '—'}</td>
                          <td className="px-5 py-3.5 text-slate-500 italic">{rec.remarks ?? '—'}</td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex justify-end gap-1">
                              <button onClick={() => startEditingMonitoring(rec)} className="text-slate-400 hover:text-blue-600 p-1"><Pencil size={15} /></button>
                              <button onClick={() => setConfirmDeleteMonId(rec.id)} className="text-slate-400 hover:text-rose-600 p-1"><Archive size={15} /></button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </Table>
            </CardBody>
          </Card>
        </section>

        {/* MANAGEMENT — collapsible */}
        <section>
          <h2 className="text-base font-semibold text-slate-800 mb-3">Management</h2>

          <div className="space-y-4">
            {/* DEPOTS */}
            <Collapsible title={`Depots (${depots.length})`}>
              <CardBody>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newDepotName}
                    onChange={(e) => setNewDepotName(e.target.value)}
                    placeholder="e.g. Cebu Depot"
                    className={`flex-1 min-w-0 ${inputClass}`}
                  />
                  <Button onClick={handleAddDepot} disabled={depotLoading}>
                    {depotLoading ? 'Adding…' : 'Add Depot'}
                  </Button>
                </div>
                <input
                  type="text"
                  value={depotSearch}
                  onChange={(e) => setDepotSearch(e.target.value)}
                  placeholder="Search depots…"
                  className={`w-full ${inputClass}`}
                />
              </CardBody>
              <CardBody className="!p-0">
                <Table>
                  <TableHead columns={['Depot Name', '']} />
                  <tbody>
                    {filteredDepots.map((depot) => (
                      <tr key={depot.id} className="border-b border-slate-50 last:border-0">
                        <td className="px-5 py-3.5 text-slate-800">
                          {editingDepotId === depot.id ? (
                            <input type="text" value={editingDepotName} onChange={(e) => setEditingDepotName(e.target.value)} className={`w-full ${inputClass}`} />
                          ) : depot.name}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {editingDepotId === depot.id ? (
                            <div className="flex justify-end gap-1">
                              <button onClick={() => saveDepotEdit(depot.id)} className="text-emerald-600 hover:text-emerald-700 p-1"><Check size={17} /></button>
                              <button onClick={() => setEditingDepotId(null)} className="text-slate-400 hover:text-slate-600 p-1"><X size={17} /></button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-1">
                              <button onClick={() => startEditingDepot(depot)} className="text-slate-400 hover:text-blue-600 p-1"><Pencil size={15} /></button>
                              <button onClick={() => setConfirmArchive({ type: 'depot', id: depot.id, name: depot.name })} className="text-slate-400 hover:text-rose-600 p-1"><Archive size={15} /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </CardBody>
            </Collapsible>

            {/* TRUCKERS */}
            <Collapsible
              title={`Truckers (${truckers.length})`}
              action={
                <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer transition">
                  <Upload size={14} />
                  {truckerUploading ? 'Uploading…' : 'Upload Excel'}
                  <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleTruckerFileUpload} />
                </label>
              }
            >
              <CardBody>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newTruckerName}
                    onChange={(e) => setNewTruckerName(e.target.value)}
                    placeholder="Trucker Name"
                    className={`flex-1 ${inputClass}`}
                  />
                  <select value={newTruckerDepotId} onChange={(e) => setNewTruckerDepotId(e.target.value)} className={inputClass}>
                    <option value="">Select Depot</option>
                    {depots.map((depot) => <option key={depot.id} value={depot.id}>{depot.name}</option>)}
                  </select>
                  <Button onClick={handleAddTrucker} disabled={truckerLoading}>
                    {truckerLoading ? 'Adding…' : 'Add Trucker'}
                  </Button>
                </div>
                <input
                  type="text"
                  value={truckerSearch}
                  onChange={(e) => setTruckerSearch(e.target.value)}
                  placeholder="Search truckers or depots…"
                  className={`w-full ${inputClass}`}
                />
                {truckerUploadResult && (
                  <div className="pt-3 text-xs">
                    {truckerUploadResult.created.length > 0 && (
                      <p className="text-emerald-600">✓ {truckerUploadResult.created.length} trucker(s) added</p>
                    )}
                    {truckerUploadResult.existing.length > 0 && (
                      <p className="text-blue-600">✓ {truckerUploadResult.existing.length} already existed and were reused</p>
                    )}
                    {truckerUploadResult.skipped.length > 0 && (
                      <div className="text-rose-600 mt-1">
                        <p>{truckerUploadResult.skipped.length} skipped:</p>
                        <ul className="list-disc list-inside">
                          {truckerUploadResult.skipped.map((s, i) => (
                            <li key={i}>{s.name}{s.depot_name ? ` (${s.depot_name})` : ''} — {s.reason}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardBody>
              <CardBody className="!p-0">
                <Table>
                  <TableHead columns={['Trucker Name', 'Depot', '']} />
                  <tbody>
                    {filteredTruckers.map((trucker) => (
                      <tr key={trucker.id} className="border-b border-slate-50 last:border-0">
                        <td className="px-5 py-3.5 text-slate-800">
                          {editingTruckerId === trucker.id ? (
                            <input type="text" value={editingTruckerName} onChange={(e) => setEditingTruckerName(e.target.value)} className={`w-full ${inputClass}`} />
                          ) : trucker.name}
                        </td>
                        <td className="px-5 py-3.5 text-slate-500">
                          {editingTruckerId === trucker.id ? (
                            <select value={editingTruckerDepotId} onChange={(e) => setEditingTruckerDepotId(e.target.value)} className={inputClass}>
                              {depots.map((depot) => <option key={depot.id} value={depot.id}>{depot.name}</option>)}
                            </select>
                          ) : (trucker.depots?.name ?? 'Unknown Depot')}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {editingTruckerId === trucker.id ? (
                            <div className="flex justify-end gap-1">
                              <button onClick={() => saveTruckerEdit(trucker.id)} className="text-emerald-600 hover:text-emerald-700 p-1"><Check size={17} /></button>
                              <button onClick={() => setEditingTruckerId(null)} className="text-slate-400 hover:text-slate-600 p-1"><X size={17} /></button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-1">
                              <button onClick={() => startEditingTrucker(trucker)} className="text-slate-400 hover:text-blue-600 p-1"><Pencil size={15} /></button>
                              <button onClick={() => setConfirmArchive({ type: 'trucker', id: trucker.id, name: trucker.name })} className="text-slate-400 hover:text-rose-600 p-1"><Archive size={15} /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </CardBody>
            </Collapsible>

            {/* DRIVERS */}
            <Collapsible
              title={`Drivers (${drivers.length})`}
              action={
                <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer transition">
                  <Upload size={14} />
                  {driverUploading ? 'Uploading…' : 'Upload Excel'}
                  <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleDriverFileUpload} />
                </label>
              }
            >
              <CardBody>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newDriverName}
                    onChange={(e) => setNewDriverName(e.target.value)}
                    placeholder="Driver Name"
                    className={`flex-1 ${inputClass}`}
                  />
                  <select value={newDriverTruckerId} onChange={(e) => setNewDriverTruckerId(e.target.value)} className={inputClass}>
                    <option value="">Select Trucker</option>
                    {truckers.map((trucker) => (
                      <option key={trucker.id} value={trucker.id}>{trucker.name} ({trucker.depots?.name ?? 'Unknown Depot'})</option>
                    ))}
                  </select>
                  <Button onClick={handleAddDriver} disabled={driverLoading}>
                    {driverLoading ? 'Adding…' : 'Add Driver'}
                  </Button>
                </div>
                <input
                  type="text"
                  value={driverSearch}
                  onChange={(e) => setDriverSearch(e.target.value)}
                  placeholder="Search drivers, truckers, or depots…"
                  className={`w-full ${inputClass}`}
                />
                {driverUploadResult && (
                  <div className="pt-3 text-xs">
                    {driverUploadResult.created.length > 0 && (
                      <p className="text-emerald-600">✓ {driverUploadResult.created.length} driver(s) added</p>
                    )}
                    {driverUploadResult.existing.length > 0 && (
                      <p className="text-blue-600">✓ {driverUploadResult.existing.length} already existed and were reused</p>
                    )}
                    {driverUploadResult.skipped.length > 0 && (
                      <div className="text-rose-600 mt-1">
                        <p>{driverUploadResult.skipped.length} skipped:</p>
                        <ul className="list-disc list-inside">
                          {driverUploadResult.skipped.map((s, i) => <li key={i}>{s.name} — {s.reason}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardBody>
              <CardBody className="!p-0">
                <Table>
                  <TableHead columns={['Driver Name', 'Trucker', 'Depot', '']} />
                  <tbody>
                    {filteredDrivers.map((driver) => (
                      <tr key={driver.id} className="border-b border-slate-50 last:border-0">
                        <td className="px-5 py-3.5 text-slate-800">
                          {editingDriverId === driver.id ? (
                            <input type="text" value={editingDriverName} onChange={(e) => setEditingDriverName(e.target.value)} className={`w-full ${inputClass}`} />
                          ) : driver.name}
                        </td>
                        <td className="px-5 py-3.5 text-slate-500">
                          {editingDriverId === driver.id ? (
                            <select value={editingDriverTruckerId} onChange={(e) => setEditingDriverTruckerId(e.target.value)} className={inputClass}>
                              {truckers.map((trucker) => (
                                <option key={trucker.id} value={trucker.id}>{trucker.name} ({trucker.depots?.name ?? 'Unknown Depot'})</option>
                              ))}
                            </select>
                          ) : (driver.truckers?.name ?? 'Unknown Trucker')}
                        </td>
                        <td className="px-5 py-3.5 text-slate-500">{driver.truckers?.depots?.name ?? '—'}</td>
                        <td className="px-5 py-3.5 text-right">
                          {editingDriverId === driver.id ? (
                            <div className="flex justify-end gap-1">
                              <button onClick={() => saveDriverEdit(driver.id)} className="text-emerald-600 hover:text-emerald-700 p-1"><Check size={17} /></button>
                              <button onClick={() => setEditingDriverId(null)} className="text-slate-400 hover:text-slate-600 p-1"><X size={17} /></button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-1">
                              <button onClick={() => startEditingDriver(driver)} className="text-slate-400 hover:text-blue-600 p-1"><Pencil size={15} /></button>
                              <button onClick={() => setConfirmArchive({ type: 'driver', id: driver.id, name: driver.name })} className="text-slate-400 hover:text-rose-600 p-1"><Archive size={15} /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </CardBody>
            </Collapsible>
          </div>
        </section>

        <ConfirmDialog
          open={confirmArchive !== null}
          title="Archive this item?"
          message={confirmArchive ? `"${confirmArchive.name}" will be hidden from active lists, but all its historical records will be kept.` : ''}
          onConfirm={handleArchive}
          onCancel={() => setConfirmArchive(null)}
        />
        <ConfirmDialog
          open={confirmDeleteMonId !== null}
          title="Delete this record?"
          message="This monitoring record will be permanently removed."
          confirmLabel="Delete"
          onConfirm={handleDeleteMonitoring}
          onCancel={() => setConfirmDeleteMonId(null)}
        />
        <ConfirmDialog
          open={confirmBulkDelete}
          title="Delete selected records?"
          message={`${selectedMonIds.size} monitoring record(s) will be permanently removed.`}
          confirmLabel="Delete"
          onConfirm={handleBulkDeleteMon}
          onCancel={() => setConfirmBulkDelete(false)}
        />
      </div>
    </div>
  )
}

export default DriverTracking