import { useEffect, useState } from 'react'
import { Pencil, Check, X, Archive } from 'lucide-react'
import { PageHeader, Card, CardHeader, CardBody, Button, Badge, inputClass, Table, TableHead, ConfirmDialog } from '../components/ui'

interface Breakdown {
  id: string
  system_name: string
  breakdown_date: string
  start_time: string
  end_time: string
  affected_area: string | null
  reason: string | null
  status: string
  remarks: string | null
}

interface BreakdownAnalytics {
  this_week: number
  this_month: number
  this_year: number
  total_breakdowns: number
  total_downtime_minutes: number
  average_downtime_minutes: number
}

const API_URL = 'http://127.0.0.1:8000'
const STATUSES = ['Resolved', 'Ongoing', 'Investigating']

function SystemBreakdown() {
  const [breakdowns, setBreakdowns] = useState<Breakdown[]>([])
  const [breakdownAnalytics, setBreakdownAnalytics] = useState<BreakdownAnalytics | null>(null)

  const [bdSystemName, setBdSystemName] = useState('SB')
  const [bdDate, setBdDate] = useState('')
  const [bdStartTime, setBdStartTime] = useState('')
  const [bdEndTime, setBdEndTime] = useState('')
  const [bdAffectedArea, setBdAffectedArea] = useState('')
  const [bdReason, setBdReason] = useState('')
  const [bdStatus, setBdStatus] = useState('Resolved')
  const [bdRemarks, setBdRemarks] = useState('')
  const [bdLoading, setBdLoading] = useState(false)
  const [bdError, setBdError] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingSystemName, setEditingSystemName] = useState('')
  const [editingDate, setEditingDate] = useState('')
  const [editingStartTime, setEditingStartTime] = useState('')
  const [editingEndTime, setEditingEndTime] = useState('')
  const [editingAffectedArea, setEditingAffectedArea] = useState('')
  const [editingReason, setEditingReason] = useState('')
  const [editingStatus, setEditingStatus] = useState('Resolved')
  const [editingRemarks, setEditingRemarks] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const fetchBreakdowns = async () => {
    const res = await fetch(`${API_URL}/api/breakdowns`)
    setBreakdowns(await res.json())
  }

  const fetchBreakdownAnalytics = async () => {
    const res = await fetch(`${API_URL}/api/analytics/breakdowns`)
    setBreakdownAnalytics(await res.json())
  }

  useEffect(() => {
    fetchBreakdowns()
    fetchBreakdownAnalytics()
  }, [])

  const formatMinutes = (mins: number) => {
    const h = Math.floor(mins / 60)
    const m = Math.round(mins % 60)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  const handleAddBreakdown = async () => {
    setBdError('')
    if (!bdSystemName || !bdDate || !bdStartTime || !bdEndTime || !bdStatus) {
      setBdError('System, date, start/end time, and status are required.')
      return
    }

    setBdLoading(true)
    const res = await fetch(`${API_URL}/api/breakdowns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_name: bdSystemName,
        breakdown_date: bdDate,
        start_time: bdStartTime,
        end_time: bdEndTime,
        affected_area: bdAffectedArea || null,
        reason: bdReason || null,
        status: bdStatus,
        remarks: bdRemarks || null,
      }),
    })
    const data = await res.json()

    if (data.error) {
      setBdError(data.error)
    } else {
      setBdDate('')
      setBdStartTime('')
      setBdEndTime('')
      setBdAffectedArea('')
      setBdReason('')
      setBdRemarks('')
      await fetchBreakdowns()
      await fetchBreakdownAnalytics()
    }
    setBdLoading(false)
  }

  const startEditing = (b: Breakdown) => {
    setEditingId(b.id)
    setEditingSystemName(b.system_name)
    setEditingDate(b.breakdown_date)
    setEditingStartTime(b.start_time)
    setEditingEndTime(b.end_time)
    setEditingAffectedArea(b.affected_area ?? '')
    setEditingReason(b.reason ?? '')
    setEditingStatus(b.status)
    setEditingRemarks(b.remarks ?? '')
  }

  const saveEdit = async (breakdownId: string) => {
    await fetch(`${API_URL}/api/breakdowns/${breakdownId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_name: editingSystemName,
        breakdown_date: editingDate,
        start_time: editingStartTime,
        end_time: editingEndTime,
        affected_area: editingAffectedArea || null,
        reason: editingReason || null,
        status: editingStatus,
        remarks: editingRemarks || null,
      }),
    })
    setEditingId(null)
    await fetchBreakdowns()
    await fetchBreakdownAnalytics()
  }

  const handleDelete = async () => {
    if (!confirmDeleteId) return
    await fetch(`${API_URL}/api/breakdowns/${confirmDeleteId}`, { method: 'DELETE' })
    setConfirmDeleteId(null)
    await fetchBreakdowns()
    await fetchBreakdownAnalytics()
  }

  return (
    <div className="flex-1 p-8">
      <div className="max-w-4xl space-y-8">
        <PageHeader title="System Breakdown" description="Log and review system breakdown incidents." />

        {breakdownAnalytics && (
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-slate-900">{breakdownAnalytics.this_week}</div>
              <div className="text-xs font-medium text-slate-500 mt-1">This Week</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-slate-900">{breakdownAnalytics.this_month}</div>
              <div className="text-xs font-medium text-slate-500 mt-1">This Month</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-slate-900">{breakdownAnalytics.this_year}</div>
              <div className="text-xs font-medium text-slate-500 mt-1">This Year</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-rose-600">{breakdownAnalytics.total_breakdowns}</div>
              <div className="text-xs font-medium text-slate-500 mt-1">Total Breakdowns</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-slate-900">{formatMinutes(breakdownAnalytics.total_downtime_minutes)}</div>
              <div className="text-xs font-medium text-slate-500 mt-1">Total Downtime</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-slate-900">{formatMinutes(breakdownAnalytics.average_downtime_minutes)}</div>
              <div className="text-xs font-medium text-slate-500 mt-1">Avg Downtime</div>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader title="Log Breakdown Incident" />
          <CardBody>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <input
                type="text"
                value={bdSystemName}
                onChange={(e) => setBdSystemName(e.target.value)}
                placeholder="System (e.g. SB)"
                className={inputClass}
              />
              <input type="date" value={bdDate} onChange={(e) => setBdDate(e.target.value)} className={inputClass} />
              <input type="time" value={bdStartTime} onChange={(e) => setBdStartTime(e.target.value)} className={inputClass} />
              <input type="time" value={bdEndTime} onChange={(e) => setBdEndTime(e.target.value)} className={inputClass} />
              <input
                type="text"
                value={bdAffectedArea}
                onChange={(e) => setBdAffectedArea(e.target.value)}
                placeholder="Affected Area (optional)"
                className={inputClass}
              />
              <input
                type="text"
                value={bdReason}
                onChange={(e) => setBdReason(e.target.value)}
                placeholder="Reason (optional)"
                className={inputClass}
              />
              <select value={bdStatus} onChange={(e) => setBdStatus(e.target.value)} className={inputClass}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <input
              type="text"
              value={bdRemarks}
              onChange={(e) => setBdRemarks(e.target.value)}
              placeholder="Remarks (optional)"
              className={`w-full mb-3 ${inputClass}`}
            />

            {bdError && (
              <div className="mb-3 px-3 py-2 rounded-lg bg-rose-50 text-rose-700 text-sm border border-rose-100">
                {bdError}
              </div>
            )}

            <Button onClick={handleAddBreakdown} disabled={bdLoading}>
              {bdLoading ? 'Saving…' : 'Log Breakdown'}
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={`Recent Breakdowns (${breakdowns.length})`} />
          <CardBody className="!p-0">
            <Table>
              <TableHead columns={['System', 'Date', 'Time', 'Area', 'Reason', 'Status', '']} />
              <tbody>
                {breakdowns.map((b) => (
                  <tr key={b.id} className="border-b border-slate-50 last:border-0 align-top">
                    {editingId === b.id ? (
                      <>
                        <td className="px-5 py-3.5">
                          <input
                            type="text"
                            value={editingSystemName}
                            onChange={(e) => setEditingSystemName(e.target.value)}
                            className={`w-full ${inputClass}`}
                          />
                        </td>
                        <td className="px-5 py-3.5">
                          <input type="date" value={editingDate} onChange={(e) => setEditingDate(e.target.value)} className={inputClass} />
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-col gap-1">
                            <input type="time" value={editingStartTime} onChange={(e) => setEditingStartTime(e.target.value)} className={inputClass} />
                            <input type="time" value={editingEndTime} onChange={(e) => setEditingEndTime(e.target.value)} className={inputClass} />
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <input
                            type="text"
                            value={editingAffectedArea}
                            onChange={(e) => setEditingAffectedArea(e.target.value)}
                            className={`w-full ${inputClass}`}
                          />
                        </td>
                        <td className="px-5 py-3.5">
                          <input
                            type="text"
                            value={editingReason}
                            onChange={(e) => setEditingReason(e.target.value)}
                            className={`w-full ${inputClass}`}
                          />
                        </td>
                        <td className="px-5 py-3.5">
                          <select value={editingStatus} onChange={(e) => setEditingStatus(e.target.value)} className={inputClass}>
                            {STATUSES.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => saveEdit(b.id)} className="text-emerald-600 hover:text-emerald-700 p-1">
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
                        <td className="px-5 py-3.5 text-slate-800">{b.system_name}</td>
                        <td className="px-5 py-3.5 text-slate-500">{b.breakdown_date}</td>
                        <td className="px-5 py-3.5 text-slate-500">{b.start_time}–{b.end_time}</td>
                        <td className="px-5 py-3.5 text-slate-500">{b.affected_area ?? '—'}</td>
                        <td className="px-5 py-3.5 text-slate-500">{b.reason ?? '—'}</td>
                        <td className="px-5 py-3.5">
                          <Badge tone={b.status === 'Resolved' ? 'green' : 'yellow'}>{b.status}</Badge>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => startEditing(b)} className="text-slate-400 hover:text-blue-600 p-1">
                              <Pencil size={15} />
                            </button>
                            <button onClick={() => setConfirmDeleteId(b.id)} className="text-slate-400 hover:text-rose-600 p-1">
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
          title="Delete this breakdown record?"
          message="This breakdown incident will be permanently removed."
          onConfirm={handleDelete}
          onCancel={() => setConfirmDeleteId(null)}
        />
      </div>
    </div>
  )
}

export default SystemBreakdown