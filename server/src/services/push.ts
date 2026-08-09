import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getMessaging } from 'firebase-admin/messaging'
import { env } from '../config.js'
import { AdminDevice } from '../models/AdminDevice.js'

type AdminPush = {
  title: string
  body: string
  route: string
}

function firebaseApp() {
  if (!env.firebaseServiceAccountJson) return null
  if (getApps().length) return getApps()[0]

  try {
    const serviceAccount = JSON.parse(env.firebaseServiceAccountJson) as {
      project_id?: string
      client_email?: string
      private_key?: string
    }
    if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) throw new Error('Firebase service account fields are missing.')
    return initializeApp({
      credential: cert({
        projectId: serviceAccount.project_id,
        clientEmail: serviceAccount.client_email,
        privateKey: serviceAccount.private_key.replace(/\\n/g, '\n'),
      }),
    })
  } catch (error) {
    console.error('Firebase push notifications are disabled because FIREBASE_SERVICE_ACCOUNT_JSON is invalid.', error)
    return null
  }
}

function isExpiredToken(errorCode?: string) {
  return errorCode === 'messaging/registration-token-not-registered' || errorCode === 'messaging/invalid-registration-token'
}

export async function sendAdminPush({ title, body, route }: AdminPush) {
  const app = firebaseApp()
  if (!app) return { sent: 0, skipped: true }

  const devices = await AdminDevice.find({ active: true }).select('token')
  if (!devices.length) return { sent: 0, skipped: true }

  const tokens = devices.map((device) => device.token)
  const notificationLink = env.adminAppUrl ? `${env.adminAppUrl}${route}` : undefined
  const response = await getMessaging(app).sendEachForMulticast({
    tokens,
    notification: { title, body },
    data: { route },
    android: { priority: 'high' },
    webpush: {
      notification: { icon: `${env.websiteUrl}/cotton-candy-logo-web.png` },
      ...(notificationLink ? { fcmOptions: { link: notificationLink } } : {}),
    },
  })

  const expiredTokens = response.responses
    .map((result, index) => (result.success || !isExpiredToken(result.error?.code) ? null : tokens[index]))
    .filter((token): token is string => Boolean(token))
  if (expiredTokens.length) await AdminDevice.updateMany({ token: { $in: expiredTokens } }, { $set: { active: false } })
  return { sent: response.successCount, failed: response.failureCount }
}
