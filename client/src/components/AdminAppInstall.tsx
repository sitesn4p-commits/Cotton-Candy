import { useEffect, useState } from 'react'
import { useFeedback } from './Feedback'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent
  }
}

export function AdminAppInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const { notify } = useFeedback()

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    void navigator.serviceWorker.register('/admin-sw.js', { scope: '/' }).catch(() => {
      notify({ tone: 'error', title: 'App install is unavailable', message: 'Refresh the dashboard and try again.' })
    })
  }, [notify])

  useEffect(() => {
    const listenForInstall = (event: BeforeInstallPromptEvent) => {
      event.preventDefault()
      setInstallPrompt(event)
    }
    const clearInstallPrompt = () => setInstallPrompt(null)
    window.addEventListener('beforeinstallprompt', listenForInstall)
    window.addEventListener('appinstalled', clearInstallPrompt)
    return () => {
      window.removeEventListener('beforeinstallprompt', listenForInstall)
      window.removeEventListener('appinstalled', clearInstallPrompt)
    }
  }, [])

  const install = async () => {
    if (!installPrompt) {
      notify({ tone: 'info', title: 'Use your browser menu to install', message: 'Choose “Install app” or “Add to Home screen”.' })
      return
    }
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    setInstallPrompt(null)
    if (choice.outcome === 'accepted') notify({ title: 'Cotton Candy Admin installed', message: 'Open it from your desktop or home screen.' })
  }

  return <button className="admin-install-action" type="button" onClick={() => void install()}>Install app</button>
}
