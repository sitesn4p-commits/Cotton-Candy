import 'dotenv/config'

const port = Number(process.env.PORT || 5000)
const clientUrls = (process.env.CLIENT_URLS || process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean)

export const env = {
  port,
  mongoUri: process.env.MONGODB_URI || '',
  clientUrls,
  serverUrl: process.env.SERVER_URL || `http://localhost:${port}`,
  cloudinaryUrl: process.env.CLOUDINARY_URL || '',
  jwtSecret: process.env.JWT_SECRET || '',
  adminEmail: (process.env.ADMIN_EMAIL || '').trim().toLowerCase(),
  adminPassword: process.env.ADMIN_PASSWORD || '',
}
