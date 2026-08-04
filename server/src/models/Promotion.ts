import { Schema, model } from 'mongoose'

const promotionSchema = new Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  desktopImageUrl: { type: String, required: true },
  desktopImagePublicId: { type: String, default: '' },
  mobileImageUrl: { type: String, required: true },
  mobileImagePublicId: { type: String, default: '' },
  discountPercent: { type: Number, default: 0, min: 0, max: 100 },
  appliesTo: { type: String, enum: ['all', 'service', 'hire'], default: 'all' },
  enabled: { type: Boolean, default: true },
  showOnLoad: { type: Boolean, default: false },
}, { timestamps: true })

export const Promotion = model('Promotion', promotionSchema)
