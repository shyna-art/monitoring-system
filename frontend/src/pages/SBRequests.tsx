import { useEffect, useState } from 'react'
import { Pencil, Check, X, Archive } from 'lucide-react'
import { PageHeader, Card, CardHeader, CardBody, Button, Badge, inputClass, Table, TableHead, ConfirmDialog } from '../components/ui'

interface SBRequest {
  id: string
  title: string
  description: string | null
  priority: string
  date_requested: string
  assigned_team: string | null
  status: string
  date_started: string | null
  date_resolved: string | null
  remarks: string | null
}

interface OldestPendingRequest {
  id: string
  title: string
  priority: string
  status: string
  date_requested: string
  age_days: number
}

interface SBRequestAnalytics {
  total_requests: number
  status_counts: Record<string, number>
  oldest_pending_requests: OldestPendingRequest[]
}

const API_URL = 'https://monitoring-system-backend.onrender.com'

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical']
const STATUSES = ['Pending', 'In Progress', 'For Testing', 'For Deployment', 'Resolved', 'Cancelled']

function SBRequests() {
  const [sbRequests, setSbRequests] = useState<SBRequest[]>([])
  const [sbAnalytics, setSbAnalytics] = useState<SBRequestAnalytics | null>(null)

  const [reqTitle, setReqTitle] = useState('')
  const [reqDescription, setReqDescription] = useState('')
  const [reqPriority, setReqPriority] = useState('Medium')
  const [reqDateRequested, setReqDateRequested] = useState('')
  const [reqAssignedTeam, setReqAssignedTeam] = useState('')
  const [reqStatus, setReqStatus] = useState('Pending')
  const [reqRemarks, setReqRemarks] = useState('')
  const [reqLoading, setReqLoading] = useState(false)
  const [reqError, setReqError] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [editingDescription, setEditingDescription] = useState('')
  const [editingPriority, setEditingPriority] = useState('Medium')
  const [editingDateRequested, setEditingDateRequested] = useState('')
  const [editingAssignedTeam, setEditingAssignedTeam] = useState('')
  const [editingStatus, setEditingStatus] = useState('Pending')
  const [editingRemarks, setEditingRemarks] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const fetchSbRequests = async () => {
    const res = await fetch(`${API_URL}/api/sb-requests`)
    setSbRequests(await res.json())
  }

  const fetchSbAnalytics = async () => {
    const res = await fetch(`${API_URL}/api/analytics/sb-requests`)
    setSbAnalytics(await res.json())
  }

  useEffect(() => {
    fetchSbRequests()
    fetchSbAnalytics()
  }, [])

  const handleAddSbRequest = async () => {
    setReqError('')
    if (!reqTitle.trim() || !reqPriority || !reqDateRequested || !reqStatus) {
      setReqError('Title, priority, date requested, and status are required.')
      return
    }

    setReqLoading(true)
    await fetch(`${API_URL}/api/sb-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: reqTitle,
        description: reqDescription || null,
        priority: reqPriority,
        date_requested: reqDateRequested,
        assigned_team: reqAssignedTeam || null,
        status: reqStatus,
        date_started: null,
        date_resolved: null,
        remarks: reqRemarks || null,
      }),
    })
    setReqTitle('')
    setReqDescription('')
    setReqPriority('Medium')
    setReqDateRequested('')
    setReqAssignedTeam('')
    setReqStatus('Pending')
    setReqRemarks('')
    await fetchSbRequests()
    await fetchSbAnalytics()
    setReqLoading(false)
  }

  const startEditing = (r: SBRequest) => {
    setEditingId(r.id)
    setEditingTitle(r.title)
    setEditingDescription(r.description ?? '')
    setEditingPriority(r.priority)
    setEditingDateRequested(r.date_requested)
    setEditingAssignedTeam(r.assigned_team ?? '')
    setEditingStatus(r.status)
    setEditingRemarks(r.remarks ?? '')
  }

  const saveEdit = async (requestId: string) => {
    await fetch(`${API_URL}/api/sb-requests/${requestId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: editingTitle,
        description: editingDescription || null,
        priority: editingPriority,
        date_requested: editingDateRequested,
        assigned_team: editingAssignedTeam || null,
        status: editingStatus,
        date_started: null,
        date_resolved: null,
        remarks: editingRemarks || null,
      }),
    })
    setEditingId(null)
    await fetchSbRequests()
    await fetchSbAnalytics()
  }

  const handleDelete = async () => {
    if (!confirmDeleteId) return
    await fetch(`${API_URL}/api/sb-requests/${confirmDeleteId}`, { method: 'DELETE' })
    setConfirmDeleteId(null)
    await fetchSbRequests()
    await fetchSbAnalytics()
  }

  const statusTone = (status: string) => {
    if (status === 'Resolved') return 'green'
    if (status === 'Cancelled') return 'gray'
    return 'yellow'
  }

  return (
    <div className="flex-1 p-8">
      <div className="max-w-4xl space-y-8">
        <PageHeader title="SB Requests" description="Track programmer requests and their resolution progress." />

        {sbAnalytics && (
          <>
            <div className="grid grid-cols-6 gap-3">
              {Object.entries(sbAnalytics.status_counts).map(([status, count]) => (
                <Card key={status} className="p-3 text-center">
                  <div className="text-xl font-bold text-slate-900">{count}</div>
                  <div className="text-xs font-medium text-slate-500 mt-1">{status}</div>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader title="Oldest Pending Requests" />
              <CardBody>
                {sbAnalytics.oldest_pending_requests.length === 0 ? (
                  <p className="text-xs text-slate-400">No pending requests</p>
                ) : (
                  <ul className="space-y-3">
                    {sbAnalytics.oldest_pending_requests.map((r, i) => (
                      <li key={r.id} className="flex justify-between items-center text-sm">
                        <span className="text-slate-700">
                          {i + 1}. {r.title} <span className="text-slate-400 text-xs">({r.priority})</span>
                        </span>
                        <Badge tone={r.age_days > 10 ? 'red' : 'gray'}>{r.age_days} days</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </>
        )}

        <Card>
          <CardHeader title="Add SB Request" />
          <CardBody>
            <input
              type="text"
              value={reqTitle}
              onChange={(e) => setReqTitle(e.target.value)}
              placeholder="Title"
              className={`w-full mb-3 ${inputClass}`}
            />

            <textarea
              value={reqDescription}
              onChange={(e) => setReqDescription(e.target.value)}
              placeholder="Description (optional)"
              className={`w-full mb-3 ${inputClass}`}
              rows={2}
            />

            <div className="grid grid-cols-2 gap-3 mb-3">
              <select value={reqPriority} onChange={(e) => setReqPriority(e.target.value)} className={inputClass}>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>

              <input
                type="date"
                value={reqDateRequested}
                onChange={(e) => setReqDateRequested(e.target.value)}
                className={inputClass}
              />

              <input
                type="text"
                value={reqAssignedTeam}
                onChange={(e) => setReqAssignedTeam(e.target.value)}
                placeholder="Assigned Team (optional)"
                className={inputClass}
              />

              <select value={reqStatus} onChange={(e) => setReqStatus(e.target.value)} className={inputClass}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <input
              type="text"
              value={reqRemarks}
              onChange={(e) => setReqRemarks(e.target.value)}
              placeholder="Remarks (optional)"
              className={`w-full mb-3 ${inputClass}`}
            />

            {reqError && (
              <div className="mb-3 px-3 py-2 rounded-lg bg-rose-50 text-rose-700 text-sm border border-rose-100">
                {reqError}
              </div>
            )}

            <Button onClick={handleAddSbRequest} disabled={reqLoading}>
              {reqLoading ? 'Saving…' : 'Add Request'}
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={`All Requests (${sbRequests.length})`} />
          <CardBody className="!p-0">
            <Table>
              <TableHead columns={['Title', 'Date', 'Priority', 'Team', 'Status', '']} />
              <tbody>
                {sbRequests.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 last:border-0 align-top">
                    {editingId === r.id ? (
                      <>
                        <td className="px-5 py-3.5">
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            className={`w-full ${inputClass}`}
                          />
                        </td>
                        <td className="px-5 py-3.5">
                          <input
                            type="date"
                            value={editingDateRequested}
                            onChange={(e) => setEditingDateRequested(e.target.value)}
                            className={inputClass}
                          />
                        </td>
                        <td className="px-5 py-3.5">
                          <select value={editingPriority} onChange={(e) => setEditingPriority(e.target.value)} className={inputClass}>
                            {PRIORITIES.map((p) => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-5 py-3.5">
                          <input
                            type="text"
                            value={editingAssignedTeam}
                            onChange={(e) => setEditingAssignedTeam(e.target.value)}
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
                            <button onClick={() => saveEdit(r.id)} className="text-emerald-600 hover:text-emerald-700 p-1">
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
                        <td className="px-5 py-3.5 text-slate-800">{r.title}</td>
                        <td className="px-5 py-3.5 text-slate-500">{r.date_requested}</td>
                        <td className="px-5 py-3.5 text-slate-500">{r.priority}</td>
                        <td className="px-5 py-3.5 text-slate-500">{r.assigned_team ?? '—'}</td>
                        <td className="px-5 py-3.5">
                          <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => startEditing(r)} className="text-slate-400 hover:text-blue-600 p-1">
                              <Pencil size={15} />
                            </button>
                            <button onClick={() => setConfirmDeleteId(r.id)} className="text-slate-400 hover:text-rose-600 p-1">
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
          title="Delete this request?"
          message="This SB request will be permanently removed."
          onConfirm={handleDelete}
          onCancel={() => setConfirmDeleteId(null)}
        />
      </div>
    </div>
  )
}

export default SBRequests