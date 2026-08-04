import mongoose from 'mongoose'
import { connectDatabase } from '../database.js'
import { MediaAsset } from '../models/MediaAsset.js'

const galleryImages = [
  { title: 'Modern romance', category: 'Weddings', url: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1000&q=85' },
  { title: 'Colour-pop birthday', category: 'Birthdays', url: 'https://images.unsplash.com/photo-1513159446162-54eb8bdaa79b?auto=format&fit=crop&w=1000&q=85' },
  { title: 'Little love baby shower', category: 'Baby showers', url: 'https://images.unsplash.com/photo-1507504031003-b417219a0fde?auto=format&fit=crop&w=1000&q=85' },
  { title: 'Garden party details', category: 'Weddings', url: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1000&q=85' },
]

async function seedStarterGallery() {
  await connectDatabase()

  for (const image of galleryImages) {
    await MediaAsset.updateOne(
      { kind: 'image', url: image.url },
      { $setOnInsert: { ...image, kind: 'image', source: 'upload' } },
      { upsert: true },
    )
  }

  console.info('Starter gallery images are ready to manage in the admin panel.')
}

seedStarterGallery().catch((error: unknown) => {
  console.error('Unable to seed starter gallery images.', error)
  process.exitCode = 1
}).finally(async () => {
  await mongoose.disconnect()
})
