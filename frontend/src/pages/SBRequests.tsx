import { Fragment, useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Pencil, X, Archive } from 'lucide-react'
import {
  PageHeader,
  Card,
  CardHeader,
  CardBody,
  Button,
  Badge,
  inputClass,
  Table,
  TableHead,
  ConfirmDialog
} from '../components/ui'

interface SBRequest {
  id: string
  title: string
  description: string | null
  priority: string
  date_requested: string
  proposed_date: string | null
  assigned_team: string | null
  status: string
  date_started: string | null
  date_resolved: string | null
  resolution_days: number | null
  days_until_proposed: number | null
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

const API_URL = import.meta.env.VITE_API_URL

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical']

const STATUSES = [
  'Pending',
  'In Progress',
  'For Testing',
  'For Deployment',
  'Resolved',
  'Cancelled'
]

function Field({
  label,
  children
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">
        {label}
      </label>
      {children}
    </div>
  )
}

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
  const [reqProposedDate, setReqProposedDate] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [editingDescription, setEditingDescription] = useState('')
  const [editingPriority, setEditingPriority] = useState('Medium')
  const [editingDateRequested, setEditingDateRequested] = useState('')
  const [editingProposedDate, setEditingProposedDate] = useState('')
  const [editingAssignedTeam, setEditingAssignedTeam] = useState('')
  const [editingStatus, setEditingStatus] = useState('Pending')
  const [editingRemarks, setEditingRemarks] = useState('')
  const [editingDateResolved, setEditingDateResolved] = useState('')
  const [editingError, setEditingError] = useState('')
  const [editingSaving, setEditingSaving] = useState(false)

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')

  const fetchSbRequests = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/sb-requests`)

      if (!res.ok) {
        throw new Error('Failed to fetch SB requests.')
      }

      setSbRequests(await res.json())
    } catch (error) {
      console.error('Error fetching SB requests:', error)
    }
  }, [])

  const fetchSbAnalytics = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/analytics/sb-requests`)

      if (!res.ok) {
        throw new Error('Failed to fetch SB request analytics.')
      }

      setSbAnalytics(await res.json())
    } catch (error) {
      console.error('Error fetching SB request analytics:', error)
    }
  }, [])

  useEffect(() => {
    fetchSbRequests()
    fetchSbAnalytics()
  }, [fetchSbRequests, fetchSbAnalytics])

  const handleAddSbRequest = async () => {
    setReqError('')

    if (
      !reqTitle.trim() ||
      !reqPriority ||
      !reqDateRequested ||
      !reqStatus
    ) {
      setReqError(
        'Title, priority, date requested, and status are required.'
      )
      return
    }

    setReqLoading(true)

    try {
      const res = await fetch(`${API_URL}/api/sb-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: reqTitle,
          description: reqDescription || null,
          priority: reqPriority,
          date_requested: reqDateRequested,
          proposed_date: reqProposedDate || null,
          assigned_team: reqAssignedTeam || null,
          status: reqStatus,
          date_started: null,
          date_resolved: null,
          remarks: reqRemarks || null
        })
      })

      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(errorText || 'Failed to create SB request.')
      }

      setReqTitle('')
      setReqDescription('')
      setReqPriority('Medium')
      setReqDateRequested('')
      setReqProposedDate('')
      setReqAssignedTeam('')
      setReqStatus('Pending')
      setReqRemarks('')

      await fetchSbRequests()
      await fetchSbAnalytics()
    } catch (error) {
      console.error('Error creating SB request:', error)

      setReqError(
        error instanceof Error
          ? error.message
          : 'Failed to create SB request.'
      )
    } finally {
      setReqLoading(false)
    }
  }

  const startEditing = (r: SBRequest) => {
    setEditingId(r.id)
    setEditingTitle(r.title)
    setEditingDescription(r.description ?? '')
    setEditingPriority(r.priority)
    setEditingDateRequested(r.date_requested)
    setEditingProposedDate(r.proposed_date ?? '')
    setEditingAssignedTeam(r.assigned_team ?? '')
    setEditingStatus(r.status)
    setEditingRemarks(r.remarks ?? '')
    setEditingDateResolved(r.date_resolved ?? '')
    setEditingError('')
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditingError('')
  }

  const saveEdit = async (requestId: string) => {
    setEditingError('')

    if (
      !editingTitle.trim() ||
      !editingPriority ||
      !editingDateRequested ||
      !editingStatus
    ) {
      setEditingError(
        'Title, priority, date requested, and status are required.'
      )
      return
    }

    setEditingSaving(true)

    try {
      const res = await fetch(
        `${API_URL}/api/sb-requests/${requestId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: editingTitle,
            description: editingDescription || null,
            priority: editingPriority,
            date_requested: editingDateRequested,
            proposed_date: editingProposedDate || null,
            assigned_team: editingAssignedTeam || null,
            status: editingStatus,
            date_started: null,
            date_resolved: editingDateResolved || null,
            remarks: editingRemarks || null
          })
        }
      )

      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(errorText || 'Failed to update SB request.')
      }

      setEditingId(null)

      await fetchSbRequests()
      await fetchSbAnalytics()
    } catch (error) {
      console.error('Error updating SB request:', error)

      setEditingError(
        error instanceof Error
          ? error.message
          : 'Failed to update SB request.'
      )
    } finally {
      setEditingSaving(false)
    }
  }

  const filteredRequests = sbRequests.filter((r) => {
    if (filterStartDate && r.date_requested < filterStartDate) {
      return false
    }

    if (filterEndDate && r.date_requested > filterEndDate) {
      return false
    }

    return true
  })

  const handleDelete = async () => {
    if (!confirmDeleteId) {
      return
    }

    try {
      const res = await fetch(
        `${API_URL}/api/sb-requests/${confirmDeleteId}`,
        {
          method: 'DELETE'
        }
      )

      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(
          errorText || 'Failed to delete SB request.'
        )
      }

      setConfirmDeleteId(null)

      await fetchSbRequests()
      await fetchSbAnalytics()
    } catch (error) {
      console.error('Error deleting SB request:', error)

      alert(
        error instanceof Error
          ? error.message
          : 'Failed to delete SB request.'
      )
    }
  }

  const statusTone = (status: string) => {
    if (status === 'Resolved') {
      return 'green'
    }

    if (status === 'Cancelled') {
      return 'gray'
    }

    return 'yellow'
  }

  const countdownBadge = (days: number | null) => {
    if (days === null) {
      return (
        <span className="text-slate-400 text-xs">
          —
        </span>
      )
    }

    if (days < 0) {
      return (
        <Badge tone="red">
          {Math.abs(days)}d overdue
        </Badge>
      )
    }

    if (days === 0) {
      return (
        <Badge tone="red">
          Due today
        </Badge>
      )
    }

    if (days <= 3) {
      return (
        <Badge tone="yellow">
          {days}d left
        </Badge>
      )
    }

    return (
      <Badge tone="gray">
        {days}d left
      </Badge>
    )
  }

  return (
    <div className="flex-1 p-8">
      <div className="max-w-4xl space-y-8">

        <PageHeader
          title="SB Requests"
          description="Track programmer requests and their resolution progress."
        />

        {sbAnalytics && (
          <>
            <div className="grid grid-cols-6 gap-3">
              {Object.entries(sbAnalytics.status_counts).map(
                ([status, count]) => (
                  <Card
                    key={status}
                    className="p-3 text-center"
                  >
                    <div className="text-xl font-bold text-slate-900">
                      {count}
                    </div>

                    <div className="text-xs font-medium text-slate-500 mt-1">
                      {status}
                    </div>
                  </Card>
                )
              )}
            </div>

            <Card>
              <CardHeader title="Oldest Pending Requests" />

              <CardBody>
                {sbAnalytics.oldest_pending_requests.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    No pending requests
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {sbAnalytics.oldest_pending_requests.map(
                      (r, i) => (
                        <li
                          key={r.id}
                          className="flex justify-between items-center text-sm"
                        >
                          <span className="text-slate-700">
                            {i + 1}. {r.title}{' '}
                            <span className="text-slate-400 text-xs">
                              ({r.priority})
                            </span>
                          </span>

                          <Badge
                            tone={
                              r.age_days > 10
                                ? 'red'
                                : 'gray'
                            }
                          >
                            {r.age_days} days
                          </Badge>
                        </li>
                      )
                    )}
                  </ul>
                )}
              </CardBody>
            </Card>
          </>
        )}

        <Card>
          <CardHeader title="Add SB Request" />

          <CardBody>
            <div className="mb-3">
              <Field label="Title">
                <input
                  type="text"
                  value={reqTitle}
                  onChange={(e) =>
                    setReqTitle(e.target.value)
                  }
                  placeholder="Short summary of the request"
                  className={`w-full ${inputClass}`}
                />
              </Field>
            </div>

            <div className="mb-3">
              <Field label="Description">
                <textarea
                  value={reqDescription}
                  onChange={(e) =>
                    setReqDescription(e.target.value)
                  }
                  placeholder="Optional details"
                  className={`w-full ${inputClass}`}
                  rows={2}
                />
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-3">
              <Field label="Priority">
                <select
                  value={reqPriority}
                  onChange={(e) =>
                    setReqPriority(e.target.value)
                  }
                  className={`w-full ${inputClass}`}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Date Requested">
                <input
                  type="date"
                  value={reqDateRequested}
                  onChange={(e) =>
                    setReqDateRequested(e.target.value)
                  }
                  className={`w-full ${inputClass}`}
                />
              </Field>

              <Field label="Proposed Date">
                <input
                  type="date"
                  value={reqProposedDate}
                  onChange={(e) =>
                    setReqProposedDate(e.target.value)
                  }
                  className={`w-full ${inputClass}`}
                />
              </Field>

              <Field label="Assigned Team">
                <input
                  type="text"
                  value={reqAssignedTeam}
                  onChange={(e) =>
                    setReqAssignedTeam(e.target.value)
                  }
                  placeholder="Optional"
                  className={`w-full ${inputClass}`}
                />
              </Field>

              <Field label="Status">
                <select
                  value={reqStatus}
                  onChange={(e) =>
                    setReqStatus(e.target.value)
                  }
                  className={`w-full ${inputClass}`}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="mb-3">
              <Field label="Remarks">
                <input
                  type="text"
                  value={reqRemarks}
                  onChange={(e) =>
                    setReqRemarks(e.target.value)
                  }
                  placeholder="Optional"
                  className={`w-full ${inputClass}`}
                />
              </Field>
            </div>

            {reqError && (
              <div className="mb-3 px-3 py-2 rounded-lg bg-rose-50 text-rose-700 text-sm border border-rose-100">
                {reqError}
              </div>
            )}

            <Button
              onClick={handleAddSbRequest}
              disabled={reqLoading}
            >
              {reqLoading ? 'Saving…' : 'Add Request'}
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={`All Requests (${filteredRequests.length} of ${sbRequests.length})`}
          />

          <CardBody className="!p-4 border-b border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-slate-600">
                Requested Date Range:
              </span>

              <input
                type="date"
                value={filterStartDate}
                onChange={(e) =>
                  setFilterStartDate(e.target.value)
                }
                className={inputClass}
              />

              <span className="text-slate-400 text-xs">
                to
              </span>

              <input
                type="date"
                value={filterEndDate}
                onChange={(e) =>
                  setFilterEndDate(e.target.value)
                }
                className={inputClass}
              />

              {(filterStartDate || filterEndDate) && (
                <button
                  onClick={() => {
                    setFilterStartDate('')
                    setFilterEndDate('')
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 ml-2"
                >
                  Clear
                </button>
              )}
            </div>
          </CardBody>

          <CardBody className="!p-0">
            <Table>
              <TableHead
                columns={[
                  'Title',
                  'Date Requested',
                  'Proposed Date',
                  'Priority',
                  'Team',
                  'Status',
                  'Resolution Time',
                  ''
                ]}
              />

              <tbody>
                {filteredRequests.map((r) => (
                  <Fragment key={r.id}>
                    <tr
                      className={`border-b border-slate-50 last:border-0 ${
                        editingId === r.id
                          ? 'bg-blue-50/40'
                          : ''
                      }`}
                    >
                      <td className="px-5 py-3.5 text-slate-800">
                        {r.title}
                      </td>

                      <td className="px-5 py-3.5 text-slate-500">
                        {r.date_requested}
                      </td>

                      <td className="px-5 py-3.5">
                        {r.proposed_date ? (
                          <div>
                            <div className="text-slate-500 text-xs">
                              {r.proposed_date}
                            </div>

                            {countdownBadge(
                              r.days_until_proposed
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">
                            —
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-slate-500">
                        {r.priority}
                      </td>

                      <td className="px-5 py-3.5 text-slate-500">
                        {r.assigned_team ?? '—'}
                      </td>

                      <td className="px-5 py-3.5">
                        <Badge tone={statusTone(r.status)}>
                          {r.status}
                        </Badge>
                      </td>

                      <td className="px-5 py-3.5 text-slate-500">
                        {r.resolution_days !== null
                          ? r.resolution_days === 0
                            ? 'Same day'
                            : `${r.resolution_days} day${
                                r.resolution_days === 1
                                  ? ''
                                  : 's'
                              }`
                          : '—'}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex justify-end gap-1">
                          {editingId === r.id ? (
                            <button
                              onClick={cancelEditing}
                              className="text-slate-400 hover:text-slate-600 p-1"
                            >
                              <X size={15} />
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() =>
                                  startEditing(r)
                                }
                                className="text-slate-400 hover:text-blue-600 p-1"
                              >
                                <Pencil size={15} />
                              </button>

                              <button
                                onClick={() =>
                                  setConfirmDeleteId(r.id)
                                }
                                className="text-slate-400 hover:text-rose-600 p-1"
                              >
                                <Archive size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>

                    {editingId === r.id && (
                      <tr className="bg-blue-50/40 border-b border-slate-100">
                        <td
                          colSpan={8}
                          className="px-5 py-5"
                        >
                          <div className="bg-white rounded-xl border border-slate-200 p-5">

                            <div className="mb-4">
                              <Field label="Title">
                                <input
                                  type="text"
                                  value={editingTitle}
                                  onChange={(e) =>
                                    setEditingTitle(
                                      e.target.value
                                    )
                                  }
                                  className={`w-full ${inputClass}`}
                                />
                              </Field>
                            </div>

                            <div className="mb-4">
                              <Field label="Description">
                                <textarea
                                  value={editingDescription}
                                  onChange={(e) =>
                                    setEditingDescription(
                                      e.target.value
                                    )
                                  }
                                  className={`w-full ${inputClass}`}
                                  rows={2}
                                />
                              </Field>
                            </div>

                            <div className="grid grid-cols-3 gap-4 mb-4">
                              <Field label="Priority">
                                <select
                                  value={editingPriority}
                                  onChange={(e) =>
                                    setEditingPriority(
                                      e.target.value
                                    )
                                  }
                                  className={`w-full ${inputClass}`}
                                >
                                  {PRIORITIES.map((p) => (
                                    <option
                                      key={p}
                                      value={p}
                                    >
                                      {p}
                                    </option>
                                  ))}
                                </select>
                              </Field>

                              <Field label="Date Requested">
                                <input
                                  type="date"
                                  value={editingDateRequested}
                                  onChange={(e) =>
                                    setEditingDateRequested(
                                      e.target.value
                                    )
                                  }
                                  className={`w-full ${inputClass}`}
                                />
                              </Field>

                              <Field label="Proposed Date">
                                <input
                                  type="date"
                                  value={editingProposedDate}
                                  onChange={(e) =>
                                    setEditingProposedDate(
                                      e.target.value
                                    )
                                  }
                                  className={`w-full ${inputClass}`}
                                />
                              </Field>

                              <Field label="Assigned Team">
                                <input
                                  type="text"
                                  value={editingAssignedTeam}
                                  onChange={(e) =>
                                    setEditingAssignedTeam(
                                      e.target.value
                                    )
                                  }
                                  className={`w-full ${inputClass}`}
                                />
                              </Field>

                              <Field label="Status">
                                <select
                                  value={editingStatus}
                                  onChange={(e) =>
                                    setEditingStatus(
                                      e.target.value
                                    )
                                  }
                                  className={`w-full ${inputClass}`}
                                >
                                  {STATUSES.map((s) => (
                                    <option
                                      key={s}
                                      value={s}
                                    >
                                      {s}
                                    </option>
                                  ))}
                                </select>
                              </Field>

                              <Field label="Date Resolved">
                                <input
                                  type="date"
                                  value={editingDateResolved}
                                  onChange={(e) =>
                                    setEditingDateResolved(
                                      e.target.value
                                    )
                                  }
                                  className={`w-full ${inputClass}`}
                                />
                              </Field>
                            </div>

                            <div className="mb-4">
                              <Field label="Remarks">
                                <input
                                  type="text"
                                  value={editingRemarks}
                                  onChange={(e) =>
                                    setEditingRemarks(
                                      e.target.value
                                    )
                                  }
                                  className={`w-full ${inputClass}`}
                                />
                              </Field>
                            </div>

                            {editingError && (
                              <div className="mb-4 px-3 py-2 rounded-lg bg-rose-50 text-rose-700 text-sm border border-rose-100">
                                {editingError}
                              </div>
                            )}

                            <div className="flex justify-end gap-2">
                              <Button
                                variant="secondary"
                                onClick={cancelEditing}
                              >
                                Cancel
                              </Button>

                              <Button
                                onClick={() =>
                                  saveEdit(r.id)
                                }
                                disabled={editingSaving}
                              >
                                {editingSaving
                                  ? 'Saving…'
                                  : 'Save Changes'}
                              </Button>
                            </div>

                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
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