import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { isWebPushConfigured, registerWebPush } from '../lib/firebase'
import { useAuth } from '../lib/useAuth'
import { useFeedback } from './Feedback'

const pushTokenKey = 'cotton-candy-admin-push-token-v1'

type NativeListener = { remove: () => Promise<void> }

export function storedAdminPushToken() {
  return localStorage.getItem(pushTokenKey)
}

export function AdminPushRegistration() {
  const { token } = useAuth()
  const { notify } = useFeedback()
  const [isWorking, setIsWorking] = useState(false)
  const [isEnabled, setIsEnabled] = useState(Boolean(storedAdminPushToken()))
  const foregroundUnsubscribe = useRef<(() => void) | null>(null)
  const nativeListeners = useRef<NativeListener[]>([])

  const saveToken = async (deviceToken: string, platform: 'web' | 'android') => {
    if (!token) return
    localStorage.setItem(pushTokenKey, deviceToken)
    await api.registerAdminPushDevice(token, { token: deviceToken, platform, userAgent: navigator.userAgent })
    setIsEnabled(true)
  }

  const enableWebPush = async (announce: boolean) => {
    if (!isWebPushConfigured()) {
      notify({ tone: 'error', title: 'Notifications are not configured', message: 'Refresh the app once, then try again.' })
      return
    }

    const registration = await registerWebPush((payload) => {
      notify({
        tone: 'info',
        title: payload.notification?.title || payload.data?.title || 'New dashboard update',
        message: payload.notification?.body || payload.data?.body,
      })
    })

    if (!registration?.token) {
      if (announce) notify({ tone: 'info', title: 'Allow notifications first', message: 'Allow notifications in your browser prompt, then select Enable notifications again.' })
      return
    }

    foregroundUnsubscribe.current?.()
    foregroundUnsubscribe.current = registration.unsubscribe
    await saveToken(registration.token, 'web')
    if (announce) notify({ title: 'Notifications enabled', message: 'Booking and contact alerts will now appear on this device.' })
  }

  const enableNativePush = async (announce: boolean) => {
    if (!nativeListeners.current.length) {
      nativeListeners.current.push(await PushNotifications.addListener('registration', ({ value }) => {
        void saveToken(value, 'android').then(() => {
          if (announce) notify({ title: 'Notifications enabled', message: 'Booking and contact alerts will now appear on this device.' })
        }).catch(() => notify({ tone: 'error', title: 'Notifications could not be enabled', message: 'Refresh the app and try again.' }))
      }))
      nativeListeners.current.push(await PushNotifications.addListener('registrationError', () => {
        notify({ tone: 'error', title: 'Notifications could not be enabled', message: 'Check the Firebase Android setup, then refresh the app.' })
      }))
      nativeListeners.current.push(await PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
        const route = notification.data?.route
        if (typeof route === 'string' && route.startsWith('/manage-cotton-candy/')) window.location.assign(route)
      }))
    }

    const currentPermission = await PushNotifications.checkPermissions()
    const permission = currentPermission.receive === 'prompt' ? await PushNotifications.requestPermissions() : currentPermission
    if (permission.receive !== 'granted') {
      if (announce) notify({ tone: 'info', title: 'Notifications are off', message: 'Enable notifications in your phone settings to receive booking alerts.' })
      return
    }
    await PushNotifications.register()
  }

  const enableNotifications = async () => {
    if (!token || isWorking) return
    setIsWorking(true)
    try {
      if (Capacitor.isNativePlatform()) await enableNativePush(true)
      else await enableWebPush(true)
    } catch (error) {
      const unsupportedBrowser = error instanceof Error && error.message.includes('unsupported-browser')
      notify({
        tone: 'error',
        title: 'Notifications could not be enabled',
        message: unsupportedBrowser
          ? 'Open the admin panel directly in Chrome or Edge. In-app previews cannot receive web notifications.'
          : 'Refresh the admin app, then click Enable notifications again.',
      })
    } finally {
      setIsWorking(false)
    }
  }

  useEffect(() => {
    if (!token || Capacitor.isNativePlatform() || Notification.permission !== 'granted' || !isWebPushConfigured()) return
    void enableWebPush(false).catch(() => undefined)
  }, [token])

  useEffect(() => () => {
    foregroundUnsubscribe.current?.()
    void Promise.all(nativeListeners.current.map((listener) => listener.remove()))
  }, [])

  return <button className="admin-push-action" type="button" onClick={() => void enableNotifications()} disabled={isWorking || isEnabled}>
    {isEnabled ? 'Notifications on' : isWorking ? 'Enabling notifications' : 'Enable notifications'}
  </button>
}
