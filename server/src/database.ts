import mongoose from 'mongoose'
import { env } from './config.js'

mongoose.set('bufferCommands', false)

export async function connectDatabase() {
  if (!env.mongoUri) {
    console.warn('MONGODB_URI is not configured. API routes that use the database will be unavailable.')
    return
  }
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 10000 })
  console.info('Connected to MongoDB.')
}
