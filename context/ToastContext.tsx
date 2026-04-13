'use client'

import { createContext, useContext, useState, ReactNode, useCallback } from 'react'

interface ToastCtx { show: (msg: string) => void }
const ToastContext = createContext<ToastCtx>({ show: () => {} })

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null)

  const show = useCallback((msg: string) => {
    setMessage(msg)
    setTimeout(() => setMessage(null), 2500)
  }, [])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {message && (
        <div
          className="fixed bottom-5 right-5 z-50 text-white text-sm px-4 py-2.5 rounded-xl border border-white/10"
          style={{ backgroundColor: '#042C53', animation: 'fadeIn 0.3s ease' }}
        >
          {message}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
