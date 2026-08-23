import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Truck, Warehouse, AlertTriangle, ClipboardList } from 'lucide-react'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/driver-tracking', label: 'Driver Tracking', icon: Truck },
  { to: '/depot-monitoring', label: 'Manual Depot Monitoring', icon: Warehouse },
  { to: '/system-breakdown', label: 'System Breakdown', icon: AlertTriangle },
  { to: '/sb-requests', label: 'SB Requests', icon: ClipboardList },
]

function Sidebar() {
  return (
    <div className="w-64 bg-white border-r border-slate-200 min-h-screen flex flex-col">
      <div className="px-5 py-5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
            M
          </div>
          <span className="text-base font-semibold text-slate-900">Monitoring System</span>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <Icon size={18} strokeWidth={2} />
              {item.label}
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}

export default Sidebar