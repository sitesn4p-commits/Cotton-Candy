import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/useAuth'

type NotificationState = 'loading' | 'unsupported' | 'configured' | 'unconfigured' | 'subscribed' | 'blocked' | 'install-required' | 'error'

function isIosDevice() {
  const userAgent = navigator.userAgent
  return /iPhone|iPad|iPod/i.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function isStandalone() {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true
}

function decodeVapidKey(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  const raw = window.atob(padded)
  return Uint8Array.from(raw, (character) => character.charCodeAt(0))
}

function hasPushSupport() {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
}

export function AdminBrowserNotifications() {
  const { token } = useAuth()
  const [state, setState] = useState<NotificationState>('loading')
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const refresh = async () => {
    if (!hasPushSupport()) { setState('unsupported'); return }
    try {
      const [{ publicKey: nextPublicKey }, registration] = await Promise.all([
        api.webPushPublicKey(),
        navigator.serviceWorker.register('/admin-service-worker.js', { scope: '/' }),
      ])
      setPublicKey(nextPublicKey)
      if (!nextPublicKey) { setState('unconfigured'); return }
      if (isIosDevice() && !isStandalone()) { setState('install-required'); return }
      if (Notification.permission === 'denied') { setState('blocked'); return }
      const subscription = await registration.pushManager.getSubscription()
      setState(subscription ? 'subscribed' : 'configured')
    } catch {
      setState('error')
      setError('Could not check browser notification settings.')
    }
  }

  useEffect(() => { void refresh() }, [])

  const toggleNotifications = async () => {
    if (!token) return
    setBusy(true)
    setError('')
    try {
      if (state === 'subscribed') {
        const registration = await navigator.serviceWorker.ready
        const current = await registration.pushManager.getSubscription()
        if (!current) { setState('configured'); return }
        await api.unregisterWebPushSubscription(token, current.endpoint)
        await current.unsubscribe()
        setState('configured')
        return
      }

      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'blocked' : 'configured')
        return
      }

      const registration = await navigator.serviceWorker.ready
      const key = publicKey || (await api.webPushPublicKey()).publicKey
      if (!key) {
        setState('unconfigured')
        return
      }
      const subscription = await registration.pushManager.getSubscription() || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeVapidKey(key),
      })
      await api.registerWebPushSubscription(token, subscription.toJSON())
      setState('subscribed')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update browser notifications.')
    } finally {
      setBusy(false)
    }
  }

  const label = state === 'subscribed' ? 'Disable alerts'
    : state === 'configured' ? 'Enable alerts'
      : state === 'install-required' ? 'Add to Home Screen to enable alerts'
        : state === 'unconfigured' ? 'Alerts need server setup'
          : state === 'blocked' ? 'Allow alerts in browser settings'
            : state === 'unsupported' ? 'Browser alerts unavailable'
              : state === 'error' ? 'Retry notification setup'
                : 'Checking alerts…'

  return <div className="admin-browser-notifications">
    <button type="button" onClick={() => void toggleNotifications()} disabled={busy || state !== 'configured' && state !== 'subscribed' && state !== 'error'} aria-label={label}>
      {busy ? 'Saving…' : label}
    </button>
    {error ? <span role="status">{error}</span> : null}
  </div>
}
