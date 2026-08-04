import { Schema, model } from 'mongoose'

const mediaAssetSchema = new Schema({
  title: { type: String, required: true, trim: true },
  kind: { type: String, required: true, enum: ['image', 'video'] },
  category: { type: String, default: 'celebrations', trim: true },
  url: { type: String, required: true },
  source: { type: String, enum: ['upload', 'youtube'], default: 'upload' },
  publicId: { type: String, default: '' },
}, { timestamps: true })

export const MediaAsset = model('MediaAsset', mediaAssetSchema)
