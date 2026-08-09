import { useEffect } from 'react'

export function AdminAppInstall() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    void navigator.serviceWorker.register('/admin-sw.js', { scope: '/' }).catch(() => undefined)
  }, [])

  return null
}
