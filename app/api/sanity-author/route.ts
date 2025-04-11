import { NextResponse } from 'next/server'
import { client } from '@/sanity/lib/client' // your sanity client setup

export async function POST(req: Request) {
  const { name, userId, imageUrl } = await req.json()

  const authorDoc = {
    _type: 'author',
    name,
    userId,
    ...(imageUrl && {
      image: {
        _type: 'image',
        asset: {
          _type: 'reference',
          _ref: imageUrl, // you can upload images separately if needed
        },
      },
    }),
  }

  await client.createIfNotExists(authorDoc)

  return NextResponse.json({ success: true })
}
