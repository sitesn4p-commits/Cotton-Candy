import { Schema, model } from 'mongoose'

const promotionEmailSchema = new Schema({
  request: { type: Schema.Types.ObjectId, ref: 'ServiceRequest', required: true },
  promotion: { type: Schema.Types.ObjectId, ref: 'Promotion', required: true },
  recipientEmail: { type: String, required: true, trim: true, lowercase: true },
  subject: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  resendEmailId: { type: String, default: '', trim: true },
  sentAt: { type: Date, default: Date.now },
}, { timestamps: true })

promotionEmailSchema.index({ request: 1, promotion: 1, sentAt: -1 })

export const PromotionEmail = model('PromotionEmail', promotionEmailSchema)
