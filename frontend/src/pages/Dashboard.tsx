  import { useEffect, useState } from 'react'
  import { AlertTriangle } from 'lucide-react'
  import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
  import { PageHeader, Card, CardHeader, CardBody, StatCard, Badge } from '../components/ui'

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

  interface DashboardData {
    totals: {
      total_depots: number
      total_truckers: number
      total_drivers: number
      drivers_not_using: number
      depots_not_using: number
      system_breakdowns_this_month: number
      pending_sb_requests: number
    }
    driver_tracking: {
      overall: {
        total_drivers: number
        using: number
        not_using: number
        not_monitored: number
        usage_rate: number
        non_usage_rate: number
      }
      top_truckers_by_non_usage_rate: TruckerStat[]
    }
    depot_monitoring: {
      total_depots: number
      using: number
      not_using: number
      partial: number
      not_monitored: number
      usage_percentage: number
    }
    breakdown: {
      this_week: number
      this_month: number
      total_downtime_minutes: number
      average_downtime_minutes: number
    }
    sb_requests: {
      status_counts: Record<string, number>
      oldest_pending_requests: {
        id: string
        title: string
        priority: string
        age_days: number
      }[]
    }
    attention_required: string[]
  }

  const API_URL = 'https://monitoring-system-backend.onrender.com'

  function Dashboard() {
    const [data, setData] = useState<DashboardData | null>(null)
    const [customStart, setCustomStart] = useState('')
    const [customEnd, setCustomEnd] = useState('')
    const [appliedStart, setAppliedStart] = useState('')
    const [appliedEnd, setAppliedEnd] = useState('')

    const fetchDashboard = async () => {
  const params = new URLSearchParams()
  if (appliedStart) params.set('start_date', appliedStart)
  if (appliedEnd) params.set('end_date', appliedEnd)
  const res = await fetch(`${API_URL}/api/dashboard?${params.toString()}`)
  setData(await res.json())
}

const applyRange = () => {
  setAppliedStart(customStart)
  setAppliedEnd(customEnd)
}

const clearRange = () => {
  setCustomStart('')
  setCustomEnd('')
  setAppliedStart('')
  setAppliedEnd('')
}

    useEffect(() => {
  void fetchDashboard()
}, [appliedStart, appliedEnd])

    const formatMinutes = (mins: number) => {
      const h = Math.floor(mins / 60)
      const m = Math.round(mins % 60)
      return h > 0 ? `${h}h ${m}m` : `${m}m`
    }

    if (!data) {
      return (
        <div className="flex-1 p-8">
          <p className="text-slate-400 text-sm">Loading dashboard…</p>
        </div>
      )
    }

    const driverPieData = [
      { name: 'Using', value: data.driver_tracking.overall.using, color: '#10b981' },
      { name: 'Not Using', value: data.driver_tracking.overall.not_using, color: '#f43f5e' },
      { name: 'Not Monitored', value: data.driver_tracking.overall.not_monitored, color: '#cbd5e1' },
    ]

    const depotBarData = [
      { name: 'Using', count: data.depot_monitoring.using },
      { name: 'Not Using', count: data.depot_monitoring.not_using },
      { name: 'Partial', count: data.depot_monitoring.partial },
      { name: 'Not Monitored', count: data.depot_monitoring.not_monitored },
    ]

    const sbStatusBarData = Object.entries(data.sb_requests.status_counts).map(([status, count]) => ({
      name: status,
      count,
    }))

    return (
      <div className="flex-1 p-8">
        <div className="max-w-6xl space-y-8">
          <PageHeader title="Dashboard" description="A live overview of your entire monitoring system." />

          {/* PERIOD FILTER */}
<Card className="p-4">
  <div className="flex flex-wrap items-center gap-2">
    <span className="text-sm font-medium text-slate-600 mr-1">Date Range:</span>
    <input
      type="date"
      value={customStart}
      onChange={(e) => setCustomStart(e.target.value)}
      className="border border-slate-300 rounded-lg px-2 py-1.5 text-xs"
    />
    <span className="text-slate-400 text-xs">to</span>
    <input
      type="date"
      value={customEnd}
      onChange={(e) => setCustomEnd(e.target.value)}
      className="border border-slate-300 rounded-lg px-2 py-1.5 text-xs"
    />
    <button
      onClick={applyRange}
      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition"
    >
      Apply
    </button>
    {(appliedStart || appliedEnd) && (
      <button
        onClick={clearRange}
        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
      >
        Clear (All Time)
      </button>
    )}
  </div>
</Card>

          {/* TOP SUMMARY */}
          <div className="grid grid-cols-4 gap-4">
            <StatCard label="Total Depots" value={data.totals.total_depots} />
            <StatCard label="Total Truckers" value={data.totals.total_truckers} />
            <StatCard label="Total Drivers" value={data.totals.total_drivers} />
            <StatCard label="Drivers Not Using SB" value={data.totals.drivers_not_using} tone="red" />
            <StatCard label="Depots Not Using SB" value={data.totals.depots_not_using} tone="red" />
            <StatCard label="Breakdowns This Month" value={data.totals.system_breakdowns_this_month} tone="yellow" />
            <StatCard label="Pending SB Requests" value={data.totals.pending_sb_requests} tone="yellow" />
          </div>

          {/* ATTENTION REQUIRED */}
          {data.attention_required.length > 0 && (
            <Card className="border-rose-200 bg-rose-50/40">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-rose-100">
                <AlertTriangle size={18} className="text-rose-600" />
                <h3 className="text-sm font-semibold text-rose-800">Attention Required</h3>
              </div>
              <CardBody>
                <ul className="space-y-2.5">
                  {data.attention_required.map((msg, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                      {msg}
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}

          {/* DRIVER TRACKING SUMMARY */}
          <section>
            <h2 className="text-base font-semibold text-slate-800 mb-3">Driver Tracking Summary</h2>
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardBody>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-slate-900">{data.driver_tracking.overall.total_drivers}</div>
                      <div className="text-xs text-slate-500 mt-1">Total Drivers</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-emerald-600">{data.driver_tracking.overall.usage_rate}%</div>
                      <div className="text-xs text-slate-500 mt-1">Usage Rate</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-rose-600">{data.driver_tracking.overall.non_usage_rate}%</div>
                      <div className="text-xs text-slate-500 mt-1">Non-Usage Rate</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-slate-400">{data.driver_tracking.overall.not_monitored}</div>
                      <div className="text-xs text-slate-500 mt-1">Not Monitored</div>
                    </div>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardHeader title="Truckers with Highest Non-Usage" />
                <CardBody>
                  {data.driver_tracking.top_truckers_by_non_usage_rate.length === 0 ? (
                    <p className="text-xs text-slate-400">No data</p>
                  ) : (
                    <ul className="space-y-3">
                      {data.driver_tracking.top_truckers_by_non_usage_rate.slice(0, 5).map((t) => (
                        <li key={t.trucker_id} className="flex items-center justify-between text-sm">
                          <span className="text-slate-700">
                            {t.trucker_name} <span className="text-slate-400 text-xs">({t.depot_name})</span>
                          </span>
                          <Badge tone="red">{t.non_usage_rate}%</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardBody>
              </Card>
            </div>
          </section>

          {/* CHARTS */}
          <section>
            <h2 className="text-base font-semibold text-slate-800 mb-3">Visual Overview</h2>
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader title="Driver Usage" />
                <CardBody>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={driverPieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={78} paddingAngle={3}>
                        {driverPieData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardBody>
              </Card>

              <Card>
                <CardHeader title="Depot Status" />
                <CardBody>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={depotBarData}>
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="#94a3b8" />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardBody>
              </Card>

              <Card>
                <CardHeader title="SB Requests by Status" />
                <CardBody>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={sbStatusBarData}>
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" height={45} stroke="#94a3b8" />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="#94a3b8" />
                      <Tooltip />
                      <Bar dataKey="count" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardBody>
              </Card>
            </div>
          </section>

          {/* DEPOT MONITORING SUMMARY */}
          <section>
            <h2 className="text-base font-semibold text-slate-800 mb-3">Depot Monitoring Summary</h2>
            <Card>
              <CardBody>
                <div className="grid grid-cols-5 gap-4 text-center">
                  <div>
                    <div className="text-xl font-bold text-slate-900">{data.depot_monitoring.total_depots}</div>
                    <div className="text-xs text-slate-500 mt-1">Total</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-emerald-600">{data.depot_monitoring.using}</div>
                    <div className="text-xs text-slate-500 mt-1">Using</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-rose-600">{data.depot_monitoring.not_using}</div>
                    <div className="text-xs text-slate-500 mt-1">Not Using</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-amber-600">{data.depot_monitoring.partial}</div>
                    <div className="text-xs text-slate-500 mt-1">Partial</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-slate-900">{data.depot_monitoring.usage_percentage}%</div>
                    <div className="text-xs text-slate-500 mt-1">Usage %</div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </section>

          {/* SYSTEM BREAKDOWN SUMMARY */}
          <section>
            <h2 className="text-base font-semibold text-slate-800 mb-3">System Breakdown Summary</h2>
            <Card>
              <CardBody>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-xl font-bold text-slate-900">{data.breakdown.this_week}</div>
                    <div className="text-xs text-slate-500 mt-1">This Week</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-slate-900">{data.breakdown.this_month}</div>
                    <div className="text-xs text-slate-500 mt-1">This Month</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-slate-900">{formatMinutes(data.breakdown.total_downtime_minutes)}</div>
                    <div className="text-xs text-slate-500 mt-1">Total Downtime</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-slate-900">{formatMinutes(data.breakdown.average_downtime_minutes)}</div>
                    <div className="text-xs text-slate-500 mt-1">Avg Downtime</div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </section>

          {/* SB REQUEST SUMMARY */}
          <section>
            <h2 className="text-base font-semibold text-slate-800 mb-3">SB Request Summary</h2>
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardBody>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    {Object.entries(data.sb_requests.status_counts).map(([status, count]) => (
                      <div key={status}>
                        <div className="text-lg font-bold text-slate-900">{count}</div>
                        <div className="text-xs text-slate-500 mt-1">{status}</div>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardHeader title="Oldest Pending Requests" />
                <CardBody>
                  {data.sb_requests.oldest_pending_requests.length === 0 ? (
                    <p className="text-xs text-slate-400">None</p>
                  ) : (
                    <ul className="space-y-3">
                      {data.sb_requests.oldest_pending_requests.slice(0, 5).map((r, i) => (
                        <li key={r.id} className="flex items-center justify-between text-sm">
                          <span className="text-slate-700">{i + 1}. {r.title}</span>
                          <Badge tone={r.age_days > 10 ? 'red' : 'gray'}>{r.age_days} days</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardBody>
              </Card>
            </div>
          </section>
        </div>
      </div>
    )
  }

  export default Dashboard