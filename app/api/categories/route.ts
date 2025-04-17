// app/api/categories/route.ts
import { NextResponse } from 'next/server';
import { client } from '@/sanity/lib/client';

export async function GET() {
  try {
    // Use proper error handling and timeout
    const categories = await Promise.race([
      client.fetch(`*[_type == "category"] | order(title asc) { _id, title }`),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Categories fetch timeout')), 5000)
      )
    ]) as Array<{_id: string, title: string}>;
    
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}