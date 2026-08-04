import { Schema, model } from 'mongoose'

const bookingSchema = new Schema({
  customerName: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, default: '' },
  eventType: { type: String, default: '' },
  eventDate: { type: Date, required: true },
  services: { type: [String], default: [] },
  notes: { type: String, default: '' },
  status: { type: String, enum: ['enquiry', 'pending', 'confirmed'], default: 'enquiry' },
}, { timestamps: true })

export const Booking = model('Booking', bookingSchema)
