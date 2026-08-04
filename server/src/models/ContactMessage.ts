import { Schema, model } from 'mongoose'

const contactMessageSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, default: '' },
  eventType: { type: String, default: '' },
  eventDate: { type: Date },
  message: { type: String, required: true, trim: true },
  read: { type: Boolean, default: false },
}, { timestamps: true })

export const ContactMessage = model('ContactMessage', contactMessageSchema)
