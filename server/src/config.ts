import 'dotenv/config'

const port = Number(process.env.PORT || 5000)
const clientUrls = [
  process.env.CLIENT_URLS || process.env.CLIENT_URL || 'http://localhost:5173',
  process.env.ADMIN_CLIENT_URL || '',
]
  .flatMap((urls) => urls.split(','))
  .map((url) => url.trim())
  .filter(Boolean)

export const env = {
  port,
  mongoUri: process.env.MONGODB_URI || '',
  clientUrls,
  serverUrl: process.env.SERVER_URL || `http://localhost:${port}`,
  websiteUrl: (process.env.WEBSITE_URL || clientUrls[0] || '').replace(/\/$/, ''),
  cloudinaryUrl: process.env.CLOUDINARY_URL || '',
  jwtSecret: process.env.JWT_SECRET || '',
  adminEmail: (process.env.ADMIN_EMAIL || '').trim().toLowerCase(),
  adminPassword: process.env.ADMIN_PASSWORD || '',
  resendApiKey: process.env.RESEND_API_KEY || '',
  emailFrom: process.env.EMAIL_FROM || '',
  emailReplyTo: process.env.EMAIL_REPLY_TO || '',
  resendBookingTemplateId: process.env.RESEND_BOOKING_TEMPLATE_ID || '',
  resendCompletionTemplateId: process.env.RESEND_COMPLETION_TEMPLATE_ID || '',
}
