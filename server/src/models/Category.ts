import { Schema, model } from 'mongoose'

const categorySchema = new Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, trim: true, lowercase: true },
  type: { type: String, required: true, enum: ['service', 'hire'] },
  description: { type: String, default: '', trim: true },
  active: { type: Boolean, default: true },
}, { timestamps: true })

categorySchema.index({ type: 1, slug: 1 }, { unique: true })
export const Category = model('Category', categorySchema)
