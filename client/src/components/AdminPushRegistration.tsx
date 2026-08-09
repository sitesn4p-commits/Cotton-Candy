import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { useEffect } from 'react'
import { api } from '../lib/api'
import { isWebPushConfigured, registerWebPush } from '../lib/firebase'
import { useAuth } from '../lib/useAuth'
import { useFeedback } from './Feedback'

const pushTokenKey = 'cotton-candy-admin-push-token-v1'

export function storedAdminPushToken() {
  return localStorage.getItem(pushTokenKey)
}

export function AdminPushRegistration() {
  const { token } = useAuth()
  const { notify } = useFeedback()

  useEffect(() => {
    if (!token) return

    if (!Capacitor.isNativePlatform()) {
      let unsubscribe: () => void = () => undefined
      if (!isWebPushConfigured()) return
      void registerWebPush((payload) => {
        notify({ tone: 'info', title: payload.notification?.title || 'New dashboard update', message: payload.notification?.body })
      }).then((registration) => {
        if (!registration?.token) return
        unsubscribe = registration.unsubscribe
        localStorage.setItem(pushTokenKey, registration.token)
        return api.registerAdminPushDevice(token, { token: registration.token, platform: 'web', userAgent: navigator.userAgent })
      }).catch(() => notify({ tone: 'error', title: 'Notifications could not be enabled', message: 'Check the Firebase web configuration, then refresh the dashboard.' }))
      return () => unsubscribe()
    }

    let disposed = false
    const listeners: Array<{ remove: () => Promise<void> }> = []
    const registerForPush = async () => {
      listeners.push(await PushNotifications.addListener('registration', ({ value }) => {
        if (disposed) return
        localStorage.setItem(pushTokenKey, value)
        void api.registerAdminPushDevice(token, { token: value, platform: 'android', userAgent: navigator.userAgent })
          .catch(() => notify({ tone: 'error', title: 'Notifications could not be enabled', message: 'Refresh the app and try again.' }))
      }))
      listeners.push(await PushNotifications.addListener('registrationError', () => {
        if (!disposed) notify({ tone: 'error', title: 'Notifications could not be enabled', message: 'Check the Firebase Android setup, then refresh the app.' })
      }))
      listeners.push(await PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
        const route = notification.data?.route
        if (typeof route === 'string' && route.startsWith('/manage-cotton-candy/')) window.location.assign(route)
      }))

      const currentPermission = await PushNotifications.checkPermissions()
      const permission = currentPermission.receive === 'prompt' ? await PushNotifications.requestPermissions() : currentPermission
      if (permission.receive !== 'granted') {
        notify({ tone: 'info', title: 'Notifications are off', message: 'Enable notifications in your phone settings to receive booking alerts.' })
        return
      }
      await PushNotifications.register()
    }

    void registerForPush()
    return () => {
      disposed = true
      void Promise.all(listeners.map((listener) => listener.remove()))
    }
  }, [notify, token])

  return null
}
