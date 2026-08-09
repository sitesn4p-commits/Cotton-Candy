import { Schema, model } from 'mongoose'

const orderNotificationSchema = new Schema({
  request: { type: Schema.Types.ObjectId, ref: 'ServiceRequest', required: true, index: true },
  type: { type: String, required: true, enum: ['updated', 'cancelled'] },
  message: { type: String, required: true, trim: true },
  details: { type: String, default: '', trim: true },
  read: { type: Boolean, default: false },
}, { timestamps: true })

export const OrderNotification = model('OrderNotification', orderNotificationSchema)
