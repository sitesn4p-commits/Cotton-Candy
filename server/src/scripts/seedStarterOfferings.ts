import mongoose from 'mongoose'
import { connectDatabase } from '../database.js'
import { Category } from '../models/Category.js'
import { Offering } from '../models/Offering.js'

const categories = [
  { name: 'Balloon artistry', slug: 'balloon-artistry', type: 'service' as const },
  { name: 'Event styling', slug: 'event-styling', type: 'service' as const },
  { name: 'Backdrops', slug: 'backdrops', type: 'hire' as const },
  { name: 'Plinths', slug: 'plinths', type: 'hire' as const },
]

const offerings = [
  { name: 'Signature balloon artistry', type: 'service' as const, categorySlug: 'balloon-artistry', description: 'Organic balloon garlands and custom installations designed around your colour palette and celebration.', price: 32000, availability: 'available', featured: true, imageUrl: 'https://images.unsplash.com/photo-1513159446162-54eb8bdaa79b?auto=format&fit=crop&w=900&q=85' },
  { name: 'Full event styling', type: 'service' as const, categorySlug: 'event-styling', description: 'A beautifully considered event from concept to the final little flourish.', price: 90000, availability: 'available', featured: true, imageUrl: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=900&q=85' },
  { name: 'Blush arched backdrop', type: 'hire' as const, categorySlug: 'backdrops', description: 'A soft, modern backdrop made for the sweetest photos and celebrations.', price: 13000, availability: 'available', featured: true, imageUrl: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=900&q=85' },
  { name: 'Classic white plinth set', type: 'hire' as const, categorySlug: 'plinths', description: 'A set of sculptural plinths that makes every cake and flower arrangement shine.', price: 9500, availability: 'limited', featured: false, imageUrl: 'https://images.unsplash.com/photo-1529634806980-85c3dd6d34ac?auto=format&fit=crop&w=900&q=85' },
]

async function seedStarterOfferings() {
  await connectDatabase()

  for (const category of categories) {
    await Category.updateOne({ type: category.type, slug: category.slug }, { $setOnInsert: { ...category, active: true } }, { upsert: true })
  }

  for (const offering of offerings) {
    const category = await Category.findOne({ type: offering.type, slug: offering.categorySlug })
    if (!category) throw new Error(`Starter category ${offering.categorySlug} was not created.`)
    await Offering.updateOne(
      { type: offering.type, name: offering.name },
      { $setOnInsert: { name: offering.name, type: offering.type, category: category._id, description: offering.description, price: offering.price, availability: offering.availability, featured: offering.featured, active: true, imageUrl: offering.imageUrl } },
      { upsert: true },
    )
  }

  console.info('Starter services and hire items are ready to manage in the admin panel.')
}

seedStarterOfferings().catch((error: unknown) => {
  console.error('Unable to seed starter offerings.', error)
  process.exitCode = 1
}).finally(async () => {
  await mongoose.disconnect()
})
