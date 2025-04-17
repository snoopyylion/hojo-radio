import { sanityClient } from '@/lib/sanity/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { postId, userId, text } = body

    if (!postId || !userId || !text) {
      return new Response(JSON.stringify({ message: 'Missing fields' }), {
        status: 400,
      })
    }

    const comment = {
      _type: 'object',
      userId,
      text,
      createdAt: new Date().toISOString(),
      likes: [],
    }

    const result = await sanityClient
      .patch(postId)
      .setIfMissing({ comments: [] })
      .insert('after', 'comments[-1]', [comment])
      .commit()

    return new Response(JSON.stringify({ message: 'Comment added', result }), {
      status: 200,
    })
  } catch (err) {
    console.error('Error adding comment:', err)
    return new Response(JSON.stringify({ message: 'Error adding comment' }), {
      status: 500,
    })
  }
}
