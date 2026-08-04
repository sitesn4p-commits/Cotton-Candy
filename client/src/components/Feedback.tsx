import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

type FeedbackTone = 'success' | 'error' | 'info'
type Toast = { id: number; title: string; message?: string; tone: FeedbackTone }
type ToastInput = { title: string; message?: string; tone?: FeedbackTone }
type ConfirmInput = { title: string; message: string; confirmLabel?: string; tone?: Extract<FeedbackTone, 'error' | 'info'> }
type Confirmation = ConfirmInput & { resolve: (accepted: boolean) => void }
type FeedbackContextValue = { notify: (toast: ToastInput) => void; confirm: (options: ConfirmInput) => Promise<boolean> }

const FeedbackContext = createContext<FeedbackContextValue | null>(null)

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const nextToastId = useRef(0)

  const dismiss = useCallback((id: number) => setToasts((current) => current.filter((toast) => toast.id !== id)), [])
  const notify = useCallback(({ title, message, tone = 'success' }: ToastInput) => {
    const id = ++nextToastId.current
    setToasts((current) => [...current.slice(-3), { id, title, message, tone }])
    window.setTimeout(() => dismiss(id), 5200)
  }, [dismiss])
  const confirm = useCallback((options: ConfirmInput) => new Promise<boolean>((resolve) => setConfirmation({ ...options, resolve })), [])
  const resolveConfirmation = useCallback((accepted: boolean) => {
    setConfirmation((current) => {
      current?.resolve(accepted)
      return null
    })
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape' && confirmation) resolveConfirmation(false) }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [confirmation, resolveConfirmation])

  return <FeedbackContext.Provider value={{ notify, confirm }}>{children}<div className="feedback-toasts" aria-live="polite">{toasts.map((toast) => <article className={`feedback-toast ${toast.tone}`} key={toast.id}><span className="feedback-toast-icon" aria-hidden="true">{toast.tone === 'success' ? '✦' : toast.tone === 'error' ? '!' : 'i'}</span><div><strong>{toast.title}</strong>{toast.message ? <p>{toast.message}</p> : null}</div><button type="button" aria-label="Dismiss message" onClick={() => dismiss(toast.id)}>×</button></article>)}</div>{confirmation ? <div className="feedback-confirm-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) resolveConfirmation(false) }}><section className={`feedback-confirm ${confirmation.tone || 'error'}`} aria-describedby="feedback-confirm-message" aria-labelledby="feedback-confirm-title" aria-modal="true" role="dialog"><button className="feedback-confirm-close" type="button" aria-label="Close confirmation" onClick={() => resolveConfirmation(false)}>×</button><span className="feedback-confirm-icon" aria-hidden="true">{confirmation.tone === 'info' ? '✦' : '!'}</span><p className="eyebrow">Please confirm</p><h2 id="feedback-confirm-title">{confirmation.title}</h2><p id="feedback-confirm-message">{confirmation.message}</p><div className="feedback-confirm-actions"><button className="feedback-cancel" type="button" onClick={() => resolveConfirmation(false)}>Keep it</button><button className="feedback-approve" type="button" onClick={() => resolveConfirmation(true)}>{confirmation.confirmLabel || 'Yes, remove it'}</button></div></section></div> : null}</FeedbackContext.Provider>
}

export function useFeedback() {
  const feedback = useContext(FeedbackContext)
  if (!feedback) throw new Error('useFeedback must be used within FeedbackProvider.')
  return feedback
}
