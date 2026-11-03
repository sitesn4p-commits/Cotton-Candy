import { useEffect, useState } from 'react'

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

function isIosDevice() {
  const userAgent = window.navigator.userAgent
  const isAppleMobile = /iPhone|iPad|iPod/i.test(userAgent)
  const isTouchMac = window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1
  return isAppleMobile || isTouchMac
}

function isStandalone() {
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true
}

export function AdminPwaInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)
  const [isIos, setIsIos] = useState(false)
  const [installed, setInstalled] = useState(isStandalone)
  const [showIosSteps, setShowIosSteps] = useState(false)

  useEffect(() => {
    setIsIos(isIosDevice())
    const handleBeforeInstall = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as InstallPromptEvent)
    }
    const handleInstalled = () => {
      setInstalled(true)
      setInstallPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('appinstalled', handleInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  if (installed || (!installPrompt && !isIos)) return null

  const install = async () => {
    if (isIos || !installPrompt) {
      setShowIosSteps((value) => !value)
      return
    }
    await installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
  }

  return <aside className="admin-pwa-prompt" aria-label="Install Cotton Candy Admin">
    <div className="admin-pwa-prompt-copy">
      <strong>Keep Cotton Candy Admin close</strong>
      <span>{isIos ? 'Add the admin workspace to your iPhone Home Screen.' : 'Install the admin workspace for quick access.'}</span>
      {showIosSteps ? <span className="admin-pwa-ios-steps">In Safari, tap Share, choose Add to Home Screen, turn on Open as Web App, then tap Add.</span> : null}
    </div>
    <div className="admin-pwa-prompt-actions">
      <button type="button" onClick={() => void install()}>{isIos ? (showIosSteps ? 'Got it' : 'How to install') : 'Install app'}</button>
      <button className="admin-pwa-dismiss" type="button" aria-label="Dismiss install suggestion" onClick={() => setInstalled(true)}>×</button>
    </div>
  </aside>
}
