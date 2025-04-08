'use server'

import { connectToDatabase } from '@/lib/db'
import Product from '@/lib/db/models/product.model'
import type { IProduct } from '@/lib/db/models/product.model'

export async function getAllCategories() {
  await connectToDatabase()
  const categories = await Product.distinct('category', { isPublished: true }) // More efficient query
  return categories
}

export async function getProductsForCard({
  tag,
  limit = 4,
}: {
  tag: string
  limit?: number
}) {
  await connectToDatabase()
  const products = await Product.aggregate([
    // Fixed using aggregation pipeline
    {
      $match: {
        tags: { $in: [tag] },
        isPublished: true,
      },
    },
    {
      $project: {
        _id: 0,
        name: 1,
        href: { $concat: ['/product/', '$slug'] },
        image: { $arrayElemAt: ['$images', 0] },
      },
    },
    { $sort: { createdAt: -1 } },
    { $limit: limit },
  ])

  return JSON.parse(JSON.stringify(products)) as {
    name: string
    href: string
    image: string
  }[]
}

// GET PRODUCTS BY TAG
export async function getProductsByTag({
  tag,
  limit = 10,
}: {
  tag: string
  limit?: number
}) {
  await connectToDatabase()
  const products = await Product.find({
    tags: { $in: [tag] },
    isPublished: true,
  })
    .sort({ createdAt: 'desc' })
    .limit(limit)
    .lean() // Convert to plain objects

  return JSON.parse(JSON.stringify(products)) as IProduct[]
}
