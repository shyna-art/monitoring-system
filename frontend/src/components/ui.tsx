import type { ReactNode } from 'react'

export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">{title}</h1>
      {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
    </div>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>
      {children}
    </div>
  )
}

export function CardHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      {action}
    </div>
  )
}

export function CardBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`p-5 ${className}`}>{children}</div>
}

export function StatCard({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string | number
  tone?: 'default' | 'green' | 'red' | 'yellow' | 'gray'
}) {
  const toneMap: Record<string, string> = {
    default: 'text-slate-900',
    green: 'text-emerald-600',
    red: 'text-rose-600',
    yellow: 'text-amber-600',
    gray: 'text-slate-400',
  }
  return (
    <Card className="p-4 text-center">
      <div className={`text-2xl font-bold ${toneMap[tone]}`}>{value}</div>
      <div className="text-xs font-medium text-slate-500 mt-1">{label}</div>
    </Card>
  )
}

export function Badge({
  children,
  tone = 'gray',
}: {
  children: ReactNode
  tone?: 'green' | 'red' | 'yellow' | 'gray'
}) {
  const toneMap: Record<string, string> = {
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    red: 'bg-rose-50 text-rose-700 ring-rose-600/20',
    yellow: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    gray: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${toneMap[tone]}`}>
      {children}
    </span>
  )
}

export function Button({
  children,
  onClick,
  disabled,
  variant = 'primary',
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'ghost'
  type?: 'button' | 'submit'
}) {
  const base = 'inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed'
  const variants: Record<string, string> = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm',
    secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50',
    ghost: 'text-slate-500 hover:text-slate-700 hover:bg-slate-100',
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]}`}>
      {children}
    </button>
  )
}

export const inputClass =
  'border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition'

export function Table({ children }: { children: ReactNode }) {
  return (
    <table className="w-full text-sm">
      {children}
    </table>
  )
}

export function TableHead({ columns }: { columns: string[] }) {
  return (
    <thead>
      <tr className="text-left text-slate-500 border-b border-slate-100 bg-slate-50/50">
        {columns.map((col, i) => (
          <th key={i} className="px-5 py-3 font-medium">{col}</th>
        ))}
      </tr>
    </thead>
  )
}

export function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg max-w-sm w-full p-6">
        <h3 className="text-base font-semibold text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-600 mb-5">{message}</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" onClick={onConfirm}>Archive</Button>
        </div>
      </div>
    </div>
  )
}