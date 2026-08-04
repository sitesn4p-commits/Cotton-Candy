import { Schema, model } from 'mongoose'

const productSchema = new Schema({
  name: { type: String, required: true, trim: true },
  category: { type: String, required: true, enum: ['backdrops', 'plinths', 'tablescape', 'signage'] },
  price: { type: Number, required: true, min: 0 },
  availability: { type: String, enum: ['available', 'limited', 'unavailable'], default: 'available' },
  imageUrl: { type: String, required: true },
  featured: { type: Boolean, default: false },
}, { timestamps: true })

export const Product = model('Product', productSchema)
