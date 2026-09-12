import { createContext, useContext, useState, useCallback } from 'react'
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaExclamationTriangle, FaTimes } from 'react-icons/fa'

const ToastContext = createContext(null)

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    // Fallback if rendered outside provider
    return {
      showToast: (msg) => console.log('Toast fallback:', msg),
      success: (msg) => console.log('Toast success fallback:', msg),
      error: (msg) => console.log('Toast error fallback:', msg),
      warning: (msg) => console.log('Toast warning fallback:', msg),
      info: (msg) => console.log('Toast info fallback:', msg),
    }
  }
  return context
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((id) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback((message, type = 'info', duration = 4500) => {
    if (!message) return
    const id = Date.now() + Math.random().toString(36).substring(2, 7)

    setToasts((prevToasts) => {
      // Keep maximum 4 toasts visible at once
      const updated = [...prevToasts, { id, message, type }]
      if (updated.length > 4) {
        return updated.slice(updated.length - 4)
      }
      return updated
    })

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
  }, [removeToast])

  const success = useCallback((msg, duration) => showToast(msg, 'success', duration), [showToast])
  const error = useCallback((msg, duration) => showToast(msg, 'error', duration), [showToast])
  const warning = useCallback((msg, duration) => showToast(msg, 'warning', duration), [showToast])
  const info = useCallback((msg, duration) => showToast(msg, 'info', duration), [showToast])

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}
      <div className="homs-toast-container" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`homs-toast homs-toast-${toast.type} fade-in`}
            role="alert"
          >
            <div className="homs-toast-icon">
              {toast.type === 'success' && <FaCheckCircle className="text-emerald-500 h-5 w-5" />}
              {toast.type === 'error' && <FaExclamationCircle className="text-rose-500 h-5 w-5" />}
              {toast.type === 'warning' && <FaExclamationTriangle className="text-amber-500 h-5 w-5" />}
              {toast.type === 'info' && <FaInfoCircle className="text-teal-500 h-5 w-5" />}
            </div>
            <div className="homs-toast-message">
              {toast.message}
            </div>
            <button
              type="button"
              className="homs-toast-close"
              onClick={() => removeToast(toast.id)}
              aria-label="Close notification"
            >
              <FaTimes className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
