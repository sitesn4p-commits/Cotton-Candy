import { Schema, model } from 'mongoose'

const galleryImageSchema = new Schema({
  title: { type: String, required: true, trim: true },
  category: { type: String, required: true, enum: ['weddings', 'birthdays', 'showers', 'corporate'] },
  imageUrl: { type: String, required: true },
}, { timestamps: true })

export const GalleryImage = model('GalleryImage', galleryImageSchema)
