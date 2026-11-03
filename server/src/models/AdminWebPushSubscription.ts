import { Schema, model } from 'mongoose'

const adminWebPushSubscriptionSchema = new Schema({
  endpoint: { type: String, required: true, trim: true, unique: true },
  keys: {
    p256dh: { type: String, required: true, trim: true },
    auth: { type: String, required: true, trim: true },
  },
  adminId: { type: String, required: true, trim: true, index: true },
  active: { type: Boolean, default: true, index: true },
}, { timestamps: true })

export const AdminWebPushSubscription = model('AdminWebPushSubscription', adminWebPushSubscriptionSchema)
