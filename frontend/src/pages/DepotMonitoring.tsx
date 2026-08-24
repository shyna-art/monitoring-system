import { useEffect, useState } from 'react'
import { Pencil, Check, X, Archive } from 'lucide-react'
import { PageHeader, Card, CardHeader, CardBody, Button, Badge, inputClass, Table, TableHead, ConfirmDialog } from '../components/ui'

interface Depot {
  id: string
  name: string
  created_at: string
}

interface DepotMonitoring {
  id: string
  depot_id: string
  monitoring_date: string
  status: string
  reason_id: string | null
  remarks: string | null
  depots: { name: string } | null
  depot_monitoring_reasons: { reason: string } | null
}

interface DepotReason {
  id: string
  reason: string
  is_active: boolean
}

interface DepotAnalytics {
  total_depots: number
  using: number
  not_using: number
  partial: number
  not_monitored: number
  usage_percentage: number
}

const API_URL = import.meta.env.VITE_API_URL

function DepotMonitoring() {
  const [depots, setDepots] = useState<Depot[]>([])
  const [depotReasons, setDepotReasons] = useState<DepotReason[]>([])
  const [depotMonitoringRecords, setDepotMonitoringRecords] = useState<DepotMonitoring[]>([])
  const [depotAnalytics, setDepotAnalytics] = useState<DepotAnalytics | null>(null)

  const [dmDepotId, setDmDepotId] = useState('')
  const [dmDate, setDmDate] = useState('')
  const [dmStatus, setDmStatus] = useState('Using')
  const [dmReasonId, setDmReasonId] = useState('')
  const [dmRemarks, setDmRemarks] = useState('')
  const [dmLoading, setDmLoading] = useState(false)
  const [dmError, setDmError] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingDepotId, setEditingDepotId] = useState('')
  const [editingDate, setEditingDate] = useState('')
  const [editingStatus, setEditingStatus] = useState('Using')
  const [editingReasonId, setEditingReasonId] = useState('')
  const [editingRemarks, setEditingRemarks] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const fetchDepots = async () => {
    const res = await fetch(`${API_URL}/api/depots`)
    setDepots(await res.json())
  }

  const fetchDepotReasons = async () => {
    const res = await fetch(`${API_URL}/api/depot-reasons`)
    setDepotReasons(await res.json())
  }

  const fetchDepotMonitoringRecords = async () => {
    const res = await fetch(`${API_URL}/api/depot-monitoring`)
    setDepotMonitoringRecords(await res.json())
  }

  const fetchDepotAnalytics = async () => {
    const res = await fetch(`${API_URL}/api/analytics/depot-monitoring`)
    setDepotAnalytics(await res.json())
  }

const [filterStartDate, setFilterStartDate] = useState('')
const [filterEndDate, setFilterEndDate] = useState('')

  useEffect(() => {
    fetchDepots()
    fetchDepotReasons()
    fetchDepotMonitoringRecords()
    fetchDepotAnalytics()
  }, [])

  const handleAddDepotMonitoring = async () => {
    setDmError('')
    if (!dmDepotId || !dmDate || !dmStatus) {
      setDmError('Depot, date, and status are required.')
      return
    }
    if ((dmStatus === 'Not Using' || dmStatus === 'Partial') && !dmReasonId) {
      setDmError("Reason is required when status is 'Not Using' or 'Partial'.")
      return
    }

    setDmLoading(true)
    const res = await fetch(`${API_URL}/api/depot-monitoring`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        depot_id: dmDepotId,
        monitoring_date: dmDate,
        status: dmStatus,
        reason_id: dmReasonId || null,
        remarks: dmRemarks || null,
      }),
    })
    const data = await res.json()

    if (data.error) {
      setDmError(data.error)
    } else {
      setDmDepotId('')
      setDmDate('')
      setDmStatus('Using')
      setDmReasonId('')
      setDmRemarks('')
      await fetchDepotMonitoringRecords()
      await fetchDepotAnalytics()
    }
    setDmLoading(false)
  }

  const startEditing = (rec: DepotMonitoring) => {
    setEditingId(rec.id)
    setEditingDepotId(rec.depot_id)
    setEditingDate(rec.monitoring_date)
    setEditingStatus(rec.status)
    setEditingReasonId(rec.reason_id ?? '')
    setEditingRemarks(rec.remarks ?? '')
  }

  const saveEdit = async (recordId: string) => {
    await fetch(`${API_URL}/api/depot-monitoring/${recordId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        depot_id: editingDepotId,
        monitoring_date: editingDate,
        status: editingStatus,
        reason_id: editingReasonId || null,
        remarks: editingRemarks || null,
      }),
    })
    setEditingId(null)
    await fetchDepotMonitoringRecords()
    await fetchDepotAnalytics()
  }

  const handleDelete = async () => {
    if (!confirmDeleteId) return
    await fetch(`${API_URL}/api/depot-monitoring/${confirmDeleteId}`, { method: 'DELETE' })
    setConfirmDeleteId(null)
    await fetchDepotMonitoringRecords()
    await fetchDepotAnalytics()
  }

const filteredRecords = depotMonitoringRecords.filter((rec) => {
  if (filterStartDate && rec.monitoring_date < filterStartDate) return false
  if (filterEndDate && rec.monitoring_date > filterEndDate) return false
  return true
})

const clearFilters = () => {
  setFilterStartDate('')
  setFilterEndDate('')
}

  return (
    <div className="flex-1 p-8">
      <div className="max-w-4xl space-y-8">
        <PageHeader title="Manual Depot Monitoring" description="Log and review each depot's system usage status." />

        {depotAnalytics && (
          <div className="grid grid-cols-5 gap-4">
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-slate-900">{depotAnalytics.total_depots}</div>
              <div className="text-xs font-medium text-slate-500 mt-1">Total Depots</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-emerald-600">{depotAnalytics.using}</div>
              <div className="text-xs font-medium text-slate-500 mt-1">Using</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-rose-600">{depotAnalytics.not_using}</div>
              <div className="text-xs font-medium text-slate-500 mt-1">Not Using</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-amber-600">{depotAnalytics.partial}</div>
              <div className="text-xs font-medium text-slate-500 mt-1">Partial</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-slate-900">{depotAnalytics.usage_percentage}%</div>
              <div className="text-xs font-medium text-slate-500 mt-1">Usage %</div>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader title="Add Depot Monitoring Record" />
          <CardBody>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <select value={dmDepotId} onChange={(e) => setDmDepotId(e.target.value)} className={inputClass}>
                <option value="">Select Depot</option>
                {depots.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>

              <input type="date" value={dmDate} onChange={(e) => setDmDate(e.target.value)} className={inputClass} />

              <select
                value={dmStatus}
                onChange={(e) => {
                  setDmStatus(e.target.value)
                  if (e.target.value !== 'Not Using' && e.target.value !== 'Partial') setDmReasonId('')
                }}
                className={inputClass}
              >
                <option value="Using">Using</option>
                <option value="Not Using">Not Using</option>
                <option value="Partial">Partial</option>
                <option value="Not Monitored">Not Monitored</option>
              </select>

              {(dmStatus === 'Not Using' || dmStatus === 'Partial') && (
                <select value={dmReasonId} onChange={(e) => setDmReasonId(e.target.value)} className={inputClass}>
                  <option value="">Select Reason</option>
                  {depotReasons.filter(r => r.is_active).map((r) => (
                    <option key={r.id} value={r.id}>{r.reason}</option>
                  ))}
                </select>
              )}
            </div>

            <input
              type="text"
              value={dmRemarks}
              onChange={(e) => setDmRemarks(e.target.value)}
              placeholder="Remarks (optional)"
              className={`w-full mb-3 ${inputClass}`}
            />

            {dmError && (
              <div className="mb-3 px-3 py-2 rounded-lg bg-rose-50 text-rose-700 text-sm border border-rose-100">
                {dmError}
              </div>
            )}

            <Button onClick={handleAddDepotMonitoring} disabled={dmLoading}>
              {dmLoading ? 'Saving…' : 'Save Record'}
            </Button>
          </CardBody>
        </Card>

        <Card>
  <CardHeader title={`Recent Records (${filteredRecords.length} of ${depotMonitoringRecords.length})`} />
  <CardBody className="!p-4 border-b border-slate-100">
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-slate-600">Date Range:</span>
      <input
        type="date"
        value={filterStartDate}
        onChange={(e) => setFilterStartDate(e.target.value)}
        className={inputClass}
      />
      <span className="text-slate-400 text-xs">to</span>
      <input
        type="date"
        value={filterEndDate}
        onChange={(e) => setFilterEndDate(e.target.value)}
        className={inputClass}
      />
      {(filterStartDate || filterEndDate) && (
        <button onClick={clearFilters} className="text-xs text-blue-600 hover:text-blue-700 ml-2">
          Clear
        </button>
      )}
    </div>
  </CardBody>
  <CardBody className="!p-0">
    <Table>
      <TableHead columns={['Depot', 'Date', 'Status', 'Reason', 'Remarks', '']} />
      <tbody>
        {filteredRecords.map((rec) => (
                  <tr key={rec.id} className="border-b border-slate-50 last:border-0 align-top">
                    <td className="px-5 py-3.5 text-slate-800">{rec.depots?.name ?? 'Unknown Depot'}</td>

                    {editingId === rec.id ? (
                      <>
                        <td className="px-5 py-3.5">
                          <input type="date" value={editingDate} onChange={(e) => setEditingDate(e.target.value)} className={inputClass} />
                        </td>
                        <td className="px-5 py-3.5">
                          <select
                            value={editingStatus}
                            onChange={(e) => {
                              setEditingStatus(e.target.value)
                              if (e.target.value !== 'Not Using' && e.target.value !== 'Partial') setEditingReasonId('')
                            }}
                            className={inputClass}
                          >
                            <option value="Using">Using</option>
                            <option value="Not Using">Not Using</option>
                            <option value="Partial">Partial</option>
                            <option value="Not Monitored">Not Monitored</option>
                          </select>
                        </td>
                        <td className="px-5 py-3.5">
                          {(editingStatus === 'Not Using' || editingStatus === 'Partial') ? (
                            <select value={editingReasonId} onChange={(e) => setEditingReasonId(e.target.value)} className={inputClass}>
                              <option value="">Select Reason</option>
                              {depotReasons.filter(r => r.is_active).map((r) => (
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
                            value={editingRemarks}
                            onChange={(e) => setEditingRemarks(e.target.value)}
                            className={`w-full ${inputClass}`}
                          />
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => saveEdit(rec.id)} className="text-emerald-600 hover:text-emerald-700 p-1">
                              <Check size={17} />
                            </button>
                            <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600 p-1">
                              <X size={17} />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-5 py-3.5 text-slate-500">{rec.monitoring_date}</td>
                        <td className="px-5 py-3.5">
                          <Badge
                            tone={
                              rec.status === 'Using'
                                ? 'green'
                                : rec.status === 'Not Using'
                                ? 'red'
                                : rec.status === 'Partial'
                                ? 'yellow'
                                : 'gray'
                            }
                          >
                            {rec.status}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 text-slate-500">{rec.depot_monitoring_reasons?.reason ?? '—'}</td>
                        <td className="px-5 py-3.5 text-slate-500 italic">{rec.remarks ?? '—'}</td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => startEditing(rec)} className="text-slate-400 hover:text-blue-600 p-1">
                              <Pencil size={15} />
                            </button>
                            <button onClick={() => setConfirmDeleteId(rec.id)} className="text-slate-400 hover:text-rose-600 p-1">
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

        <ConfirmDialog
          open={confirmDeleteId !== null}
          title="Delete this record?"
          message="This monitoring record will be permanently removed."
          onConfirm={handleDelete}
          onCancel={() => setConfirmDeleteId(null)}
        />
      </div>
    </div>
  )
}

export default DepotMonitoring