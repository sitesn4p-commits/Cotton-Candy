import { Schema, model } from 'mongoose'

const adminDeviceSchema = new Schema({
  token: { type: String, required: true, unique: true, trim: true },
  platform: { type: String, required: true, enum: ['web', 'android', 'desktop'] },
  adminEmail: { type: String, required: true, trim: true, lowercase: true },
  userAgent: { type: String, default: '', trim: true },
  active: { type: Boolean, default: true },
  lastSeenAt: { type: Date, default: Date.now },
}, { timestamps: true })

export const AdminDevice = model('AdminDevice', adminDeviceSchema)
