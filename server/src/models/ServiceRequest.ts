import { Schema, model } from 'mongoose'

const serviceRequestSchema = new Schema({
  trackingId: { type: String, required: true, unique: true, trim: true, uppercase: true },
  type: { type: String, required: true, enum: ['service', 'hire'] },
  offering: { type: Schema.Types.ObjectId, ref: 'Offering' },
  offeringName: { type: String, required: true, trim: true },
  customerName: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, default: '', trim: true },
  eventType: { type: String, default: '', trim: true },
  eventDate: { type: Date },
  notes: { type: String, default: '', trim: true },
  status: { type: String, enum: ['pending', 'active', 'complete', 'cancel'], default: 'pending' },
  hireDays: { type: Number, default: 1, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  subtotal: { type: Number, required: true, min: 0 },
  discountPercent: { type: Number, default: 0, min: 0, max: 100 },
  discountAmount: { type: Number, default: 0, min: 0 },
  totalPrice: { type: Number, required: true, min: 0 },
  promotion: { type: Schema.Types.ObjectId, ref: 'Promotion' },
  promotionTitle: { type: String, default: '', trim: true },
  advancePaymentComplete: { type: Boolean, default: false },
  advancePaymentCompletedAt: { type: Date },
  activeEmailSentAt: { type: Date },
  completedEmailSentAt: { type: Date },
  marketingConsent: { type: Boolean, default: false },
  marketingConsentAt: { type: Date },
  marketingUnsubscribedAt: { type: Date },
}, { timestamps: true })

serviceRequestSchema.index({ email: 1, createdAt: -1 })

export const ServiceRequest = model('ServiceRequest', serviceRequestSchema)
