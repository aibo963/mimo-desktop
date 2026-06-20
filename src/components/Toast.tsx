import { useToastStore } from '../stores/toastStore'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { cn } from '../lib/utils'

const icons = { success: CheckCircle, error: AlertCircle, info: Info }
const colors = {
  success: 'bg-emerald-950/80 border-emerald-800 text-emerald-400',
  error: 'bg-red-950/80 border-red-800 text-red-400',
  info: 'bg-blue-950/80 border-blue-800 text-blue-400',
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore()
  if (toasts.length === 0) return null
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => {
        const Icon = icons[toast.type]
        return (
          <div
            key={toast.id}
            className={cn(
              'flex items-center gap-2 px-4 py-3 rounded-lg border shadow-lg min-w-[200px] max-w-[400px]',
              colors[toast.type]
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="text-sm flex-1">{toast.message}</span>
            <button onClick={() => removeToast(toast.id)} className="p-0.5 hover:opacity-70">
              <X className="w-3 h-3" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
