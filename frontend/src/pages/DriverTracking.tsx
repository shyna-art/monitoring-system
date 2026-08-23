import { useEffect, useState } from 'react'
import { Pencil, Check, X, Archive } from 'lucide-react'
import { PageHeader, Card, CardHeader, CardBody, StatCard, Badge, Button, inputClass, Table, TableHead, ConfirmDialog } from '../components/ui'

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

const API_URL = 'http://127.0.0.1:8000'

function DriverTracking() {
  const [depots, setDepots] = useState<Depot[]>([])
  const [newDepotName, setNewDepotName] = useState('')
  const [depotLoading, setDepotLoading] = useState(false)
  const [editingDepotId, setEditingDepotId] = useState<string | null>(null)
  const [editingDepotName, setEditingDepotName] = useState('')

  const [truckers, setTruckers] = useState<Trucker[]>([])
  const [newTruckerName, setNewTruckerName] = useState('')
  const [newTruckerDepotId, setNewTruckerDepotId] = useState('')
  const [truckerLoading, setTruckerLoading] = useState(false)
  const [editingTruckerId, setEditingTruckerId] = useState<string | null>(null)
  const [editingTruckerName, setEditingTruckerName] = useState('')
  const [editingTruckerDepotId, setEditingTruckerDepotId] = useState('')

  const [drivers, setDrivers] = useState<Driver[]>([])
  const [newDriverName, setNewDriverName] = useState('')
  const [newDriverTruckerId, setNewDriverTruckerId] = useState('')
  const [driverLoading, setDriverLoading] = useState(false)
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null)
  const [editingDriverName, setEditingDriverName] = useState('')
  const [editingDriverTruckerId, setEditingDriverTruckerId] = useState('')

  const [reasons, setReasons] = useState<Reason[]>([])
  const [monitoringRecords, setMonitoringRecords] = useState<DriverMonitoring[]>([])

  const [monDriverId, setMonDriverId] = useState('')
  const [monDate, setMonDate] = useState('')
  const [monStatus, setMonStatus] = useState('Using')
  const [monReasonId, setMonReasonId] = useState('')
  const [monRemarks, setMonRemarks] = useState('')
  const [monLoading, setMonLoading] = useState(false)
  const [monError, setMonError] = useState('')

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
    const truckerName = truckers.find((t) => t.id === filterTruckerId)?.name
    if (recTruckerName !== truckerName) return false
  }

  return true
})

const clearFilters = () => {
  setFilterStartDate('')
  setFilterEndDate('')
  setFilterDepotId('')
  setFilterTruckerId('')
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

  // --- Driver Monitoring handler ---
  const handleAddMonitoring = async () => {
    setMonError('')
    if (!monDriverId || !monDate || !monStatus) {
      setMonError('Driver, date, and status are required.')
      return
    }
    if (monStatus === 'Not Using' && !monReasonId) {
      setMonError("Reason is required when status is 'Not Using'.")
      return
    }

    setMonLoading(true)
    const res = await fetch(`${API_URL}/api/driver-monitoring`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        driver_id: monDriverId,
        monitoring_date: monDate,
        status: monStatus,
        reason_id: monReasonId || null,
        remarks: monRemarks || null,
      }),
    })
    const data = await res.json()

    if (data.error) {
      setMonError(data.error)
    } else {
      setMonDriverId('')
      setMonDate('')
      setMonStatus('Using')
      setMonReasonId('')
      setMonRemarks('')
      await fetchMonitoringRecords()
      await fetchAnalytics()
    }
    setMonLoading(false)
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

  return (
    <div className="flex-1 p-8">
      <div className="max-w-4xl space-y-10">
        <PageHeader title="Driver Tracking" description="Manage depots, truckers, drivers, and daily usage monitoring." />

        {/* DEPOTS */}
        <section>
          <h2 className="text-base font-semibold text-slate-800 mb-3">Depots</h2>
          <Card className="mb-4">
            <CardHeader title="Add New Depot" />
            <CardBody>
              <div className="flex gap-2">
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
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={`All Depots (${depots.length})`} />
            <CardBody className="!p-0">
                <Table>
                <TableHead columns={['Depot Name', '']} />
                <tbody>
                    {depots.map((depot) => (
                    <tr key={depot.id} className="border-b border-slate-50 last:border-0">
                        <td className="px-5 py-3.5 text-slate-800">
                        {editingDepotId === depot.id ? (
                            <input
                            type="text"
                            value={editingDepotName}
                            onChange={(e) => setEditingDepotName(e.target.value)}
                            className={`w-full ${inputClass}`}
                            />
                        ) : (
                            depot.name
                        )}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                        {editingDepotId === depot.id ? (
                            <div className="flex justify-end gap-1">
                            <button onClick={() => saveDepotEdit(depot.id)} className="text-emerald-600 hover:text-emerald-700 p-1">
                                <Check size={17} />
                            </button>
                            <button onClick={() => setEditingDepotId(null)} className="text-slate-400 hover:text-slate-600 p-1">
                                <X size={17} />
                            </button>
                            </div>
                        ) : (
                            <div className="flex justify-end gap-1">
                            <button onClick={() => startEditingDepot(depot)} className="text-slate-400 hover:text-blue-600 p-1">
                                <Pencil size={15} />
                            </button>
                            <button onClick={() => setConfirmArchive({ type: 'depot', id: depot.id, name: depot.name })} className="text-slate-400 hover:text-rose-600 p-1">
                                <Archive size={15} />
                            </button>
                            </div>
                        )}
                        </td>
                    </tr>
                    ))}
                </tbody>
                </Table>
            </CardBody>
            </Card>
        </section>

        {/* TRUCKERS */}
        <section>
          <h2 className="text-base font-semibold text-slate-800 mb-3">Truckers</h2>
          <Card className="mb-4">
            <CardHeader title="Add New Trucker" />
            <CardBody>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTruckerName}
                  onChange={(e) => setNewTruckerName(e.target.value)}
                  placeholder="e.g. Cargo Truckers"
                  className={`flex-1 min-w-0 ${inputClass}`}
                />
                <select
                  value={newTruckerDepotId}
                  onChange={(e) => setNewTruckerDepotId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select Depot</option>
                  {depots.map((depot) => (
                    <option key={depot.id} value={depot.id}>{depot.name}</option>
                  ))}
                </select>
                <Button onClick={handleAddTrucker} disabled={truckerLoading}>
                  {truckerLoading ? 'Adding…' : 'Add Trucker'}
                </Button>
              </div>
            </CardBody>
          </Card>

          <Card>
  <CardHeader title={`All Truckers (${truckers.length})`} />
  <CardBody className="!p-0">
    <Table>
      <TableHead columns={['Trucker Name', 'Depot', '']} />
      <tbody>
        {truckers.map((trucker) => (
          <tr key={trucker.id} className="border-b border-slate-50 last:border-0">
            <td className="px-5 py-3.5 text-slate-800">
              {editingTruckerId === trucker.id ? (
                <input
                  type="text"
                  value={editingTruckerName}
                  onChange={(e) => setEditingTruckerName(e.target.value)}
                  className={`w-full ${inputClass}`}
                />
              ) : (
                trucker.name
              )}
            </td>
            <td className="px-5 py-3.5 text-slate-500">
              {editingTruckerId === trucker.id ? (
                <select
                  value={editingTruckerDepotId}
                  onChange={(e) => setEditingTruckerDepotId(e.target.value)}
                  className={inputClass}
                >
                  {depots.map((depot) => (
                    <option key={depot.id} value={depot.id}>{depot.name}</option>
                  ))}
                </select>
              ) : (
                trucker.depots?.name ?? 'Unknown Depot'
              )}
            </td>
            <td className="px-5 py-3.5 text-right">
              {editingTruckerId === trucker.id ? (
                <div className="flex justify-end gap-1">
                  <button onClick={() => saveTruckerEdit(trucker.id)} className="text-emerald-600 hover:text-emerald-700 p-1">
                    <Check size={17} />
                  </button>
                  <button onClick={() => setEditingTruckerId(null)} className="text-slate-400 hover:text-slate-600 p-1">
                    <X size={17} />
                  </button>
                </div>
              ) : (
                <div className="flex justify-end gap-1">
                <button onClick={() => startEditingTrucker(trucker)} className="text-slate-400 hover:text-blue-600 p-1">
                    <Pencil size={15} />
                </button>
                <button onClick={() => setConfirmArchive({ type: 'trucker', id: trucker.id, name: trucker.name })} className="text-slate-400 hover:text-rose-600 p-1">
                    <Archive size={15} />
                </button>
                </div>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  </CardBody>
</Card>
        </section>

        {/* DRIVERS */}
        <section>
          <h2 className="text-base font-semibold text-slate-800 mb-3">Drivers</h2>
          <Card className="mb-4">
            <CardHeader title="Add New Driver" />
            <CardBody>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newDriverName}
                  onChange={(e) => setNewDriverName(e.target.value)}
                  placeholder="e.g. Juan Dela Cruz"
                  className={`flex-1 min-w-0 ${inputClass}`}
                />
                <select
                  value={newDriverTruckerId}
                  onChange={(e) => setNewDriverTruckerId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select Trucker</option>
                  {truckers.map((trucker) => (
                    <option key={trucker.id} value={trucker.id}>{trucker.name}</option>
                  ))}
                </select>
                <Button onClick={handleAddDriver} disabled={driverLoading}>
                  {driverLoading ? 'Adding…' : 'Add Driver'}
                </Button>
              </div>
            </CardBody>
          </Card>

          <Card>
  <CardHeader title={`All Drivers (${drivers.length})`} />
  <CardBody className="!p-0">
    <Table>
      <TableHead columns={['Driver Name', 'Trucker', 'Depot', '']} />
      <tbody>
        {drivers.map((driver) => (
          <tr key={driver.id} className="border-b border-slate-50 last:border-0">
            <td className="px-5 py-3.5 text-slate-800">
              {editingDriverId === driver.id ? (
                <input
                  type="text"
                  value={editingDriverName}
                  onChange={(e) => setEditingDriverName(e.target.value)}
                  className={`w-full ${inputClass}`}
                />
              ) : (
                driver.name
              )}
            </td>
            <td className="px-5 py-3.5 text-slate-500">
              {editingDriverId === driver.id ? (
                <select
                  value={editingDriverTruckerId}
                  onChange={(e) => setEditingDriverTruckerId(e.target.value)}
                  className={inputClass}
                >
                  {truckers.map((trucker) => (
                    <option key={trucker.id} value={trucker.id}>{trucker.name}</option>
                  ))}
                </select>
              ) : (
                driver.truckers?.name ?? 'Unknown Trucker'
              )}
            </td>
            <td className="px-5 py-3.5 text-slate-500">
              {driver.truckers?.depots?.name ?? '—'}
            </td>
            <td className="px-5 py-3.5 text-right">
              {editingDriverId === driver.id ? (
                <div className="flex justify-end gap-1">
                  <button onClick={() => saveDriverEdit(driver.id)} className="text-emerald-600 hover:text-emerald-700 p-1">
                    <Check size={17} />
                  </button>
                  <button onClick={() => setEditingDriverId(null)} className="text-slate-400 hover:text-slate-600 p-1">
                    <X size={17} />
                  </button>
                </div>
              ) : (
                <div className="flex justify-end gap-1">
                <button onClick={() => startEditingDriver(driver)} className="text-slate-400 hover:text-blue-600 p-1">
                    <Pencil size={15} />
                </button>
                <button onClick={() => setConfirmArchive({ type: 'driver', id: driver.id, name: driver.name })} className="text-slate-400 hover:text-rose-600 p-1">
                    <Archive size={15} />
                </button>
                </div>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  </CardBody>
</Card>
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

        {/* DRIVER MONITORING */}
        <section>
          <h2 className="text-base font-semibold text-slate-800 mb-3">Driver Daily Monitoring</h2>
          <Card className="mb-4">
            <CardHeader title="Add Monitoring Record" />
            <CardBody>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <select value={monDriverId} onChange={(e) => setMonDriverId(e.target.value)} className={inputClass}>
                  <option value="">Select Driver</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>

                <input type="date" value={monDate} onChange={(e) => setMonDate(e.target.value)} className={inputClass} />

                <select
                  value={monStatus}
                  onChange={(e) => {
                    setMonStatus(e.target.value)
                    if (e.target.value !== 'Not Using') setMonReasonId('')
                  }}
                  className={inputClass}
                >
                  <option value="Using">Using</option>
                  <option value="Not Using">Not Using</option>
                  <option value="Not Monitored">Not Monitored</option>
                </select>

                {monStatus === 'Not Using' && (
                  <select value={monReasonId} onChange={(e) => setMonReasonId(e.target.value)} className={inputClass}>
                    <option value="">Select Reason</option>
                    {reasons.filter(r => r.is_active).map((r) => (
                      <option key={r.id} value={r.id}>{r.reason}</option>
                    ))}
                  </select>
                )}
              </div>

              <input
                type="text"
                value={monRemarks}
                onChange={(e) => setMonRemarks(e.target.value)}
                placeholder="Remarks (optional)"
                className={`w-full mb-3 ${inputClass}`}
              />

              {monError && (
                <div className="mb-3 px-3 py-2 rounded-lg bg-rose-50 text-rose-700 text-sm border border-rose-100">
                  {monError}
                </div>
              )}

              <Button onClick={handleAddMonitoring} disabled={monLoading}>
                {monLoading ? 'Saving…' : 'Save Record'}
              </Button>
            </CardBody>
          </Card>

          <Card>
  <CardHeader title={`Recent Records (${filteredMonitoringRecords.length} of ${monitoringRecords.length})`} />
  <CardBody className="!p-4 border-b border-slate-100">
    <div className="grid grid-cols-4 gap-2">
      <input
        type="date"
        value={filterStartDate}
        onChange={(e) => setFilterStartDate(e.target.value)}
        placeholder="From"
        className={inputClass}
      />
      <input
        type="date"
        value={filterEndDate}
        onChange={(e) => setFilterEndDate(e.target.value)}
        placeholder="To"
        className={inputClass}
      />
      <select value={filterDepotId} onChange={(e) => setFilterDepotId(e.target.value)} className={inputClass}>
        <option value="">All Depots</option>
        {depots.map((d) => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
      </select>
      <select value={filterTruckerId} onChange={(e) => setFilterTruckerId(e.target.value)} className={inputClass}>
        <option value="">All Truckers</option>
        {truckers.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
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
      <TableHead columns={['Driver', 'Date', 'Status', 'Reason', 'Remarks', '']} />
      <tbody>
        {filteredMonitoringRecords.map((rec) => (
          <tr key={rec.id} className="border-b border-slate-50 last:border-0 align-top">
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
                    <option value="Not Monitored">Not Monitored</option>
                  </select>
                </td>
                <td className="px-5 py-3.5">
                  {editingMonStatus === 'Not Using' ? (
                    <select value={editingMonReasonId} onChange={(e) => setEditingMonReasonId(e.target.value)} className={inputClass}>
                      <option value="">Select Reason</option>
                      {reasons.filter(r => r.is_active).map((r) => (
                        <option key={r.id} value={r.id}>{r.reason}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-5 py-3.5">
                  <input
                    type="text"
                    value={editingMonRemarks}
                    onChange={(e) => setEditingMonRemarks(e.target.value)}
                    className={`w-full ${inputClass}`}
                  />
                </td>
                <td className="px-5 py-3.5 text-right">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => saveMonitoringEdit(rec.id)} className="text-emerald-600 hover:text-emerald-700 p-1">
                      <Check size={17} />
                    </button>
                    <button onClick={() => setEditingMonId(null)} className="text-slate-400 hover:text-slate-600 p-1">
                      <X size={17} />
                    </button>
                  </div>
                </td>
              </>
            ) : (
              <>
                <td className="px-5 py-3.5 text-slate-500">{rec.monitoring_date}</td>
                <td className="px-5 py-3.5">
                  <Badge tone={rec.status === 'Using' ? 'green' : rec.status === 'Not Using' ? 'red' : 'gray'}>
                    {rec.status}
                  </Badge>
                </td>
                <td className="px-5 py-3.5 text-slate-500">{rec.driver_non_usage_reasons?.reason ?? '—'}</td>
                <td className="px-5 py-3.5 text-slate-500 italic">{rec.remarks ?? '—'}</td>
                <td className="px-5 py-3.5 text-right">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => startEditingMonitoring(rec)} className="text-slate-400 hover:text-blue-600 p-1">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => setConfirmDeleteMonId(rec.id)} className="text-slate-400 hover:text-rose-600 p-1">
                      <Archive size={15} />
                    </button>
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
            onConfirm={handleDeleteMonitoring}
            onCancel={() => setConfirmDeleteMonId(null)}
            />
      </div>
    </div>
  )
}

export default DriverTracking