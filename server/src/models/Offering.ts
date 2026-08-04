import { Schema, model } from 'mongoose'

const offeringSchema = new Schema({
  name: { type: String, required: true, trim: true },
  type: { type: String, required: true, enum: ['service', 'hire'] },
  category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
  description: { type: String, default: '', trim: true },
  price: { type: Number, required: true, min: 0 },
  availability: { type: String, enum: ['available', 'limited', 'unavailable'], default: 'available' },
  featured: { type: Boolean, default: false },
  active: { type: Boolean, default: true },
  imageUrl: { type: String, required: true },
  imagePublicId: { type: String, default: '' },
}, { timestamps: true })

export const Offering = model('Offering', offeringSchema)
