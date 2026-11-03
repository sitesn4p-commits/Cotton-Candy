import webpush, { type PushSubscription } from 'web-push'
import { env } from '../config.js'
import { AdminWebPushSubscription } from '../models/AdminWebPushSubscription.js'

type AdminWebPushMessage = {
  title: string
  body: string
  url: string
}

type StoredSubscription = {
  _id: unknown
  endpoint: string
  keys?: { p256dh: string; auth: string } | null
}

function isConfigured() {
  return Boolean(env.webPushPublicKey && env.webPushPrivateKey)
}

function configureWebPush() {
  if (!isConfigured()) return false
  webpush.setVapidDetails(env.webPushSubject, env.webPushPublicKey, env.webPushPrivateKey)
  return true
}

export async function sendAdminWebPushNotification(message: AdminWebPushMessage) {
  if (!configureWebPush()) return

  let subscriptions: StoredSubscription[]
  try {
    subscriptions = await AdminWebPushSubscription.find({ active: true }).select('_id endpoint keys').lean() as StoredSubscription[]
  } catch (error) {
    console.error('Could not load admin web push subscriptions.', error)
    return
  }

  await Promise.all(subscriptions.map(async (subscription) => {
    if (!subscription.keys?.p256dh || !subscription.keys.auth) {
      await AdminWebPushSubscription.deleteOne({ _id: subscription._id }).catch(() => undefined)
      return
    }
    try {
      await webpush.sendNotification(
        { endpoint: subscription.endpoint, keys: subscription.keys } as PushSubscription,
        JSON.stringify(message),
        { TTL: 60 * 60, urgency: 'high' },
      )
    } catch (error) {
      const statusCode = typeof error === 'object' && error !== null && 'statusCode' in error
        ? Number(error.statusCode)
        : 0
      if (statusCode === 404 || statusCode === 410) {
        await AdminWebPushSubscription.deleteOne({ _id: subscription._id }).catch(() => undefined)
      } else {
        console.error('Could not send an admin web push notification.', error)
      }
    }
  }))
}

export function getWebPushPublicKey() {
  return isConfigured() ? env.webPushPublicKey : null
}
