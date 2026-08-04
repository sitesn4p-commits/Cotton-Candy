import { Schema, model } from 'mongoose'

const siteSettingsSchema = new Schema({
  key: { type: String, required: true, unique: true, default: 'main' },
  heroMainUrl: { type: String, default: '' },
  heroMainPublicId: { type: String, default: '' },
  heroSmallUrl: { type: String, default: '' },
  heroSmallPublicId: { type: String, default: '' },
}, { timestamps: true })

export const SiteSettings = model('SiteSettings', siteSettingsSchema)
