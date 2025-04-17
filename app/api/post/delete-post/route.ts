import { sanityClient } from '@/lib/sanity/server'

export async function DELETE(req: Request) {
  try {
    const body = await req.json()
    const { postId } = body

    if (!postId) {
      return new Response(JSON.stringify({ message: 'Missing postId' }), { status: 400 })
    }

    await sanityClient.delete(postId)

    return new Response(JSON.stringify({ message: 'Post deleted' }), { status: 200 })
  } catch (err) {
    console.error('Error deleting post:', err)
    return new Response(JSON.stringify({ message: 'Error deleting post' }), { status: 500 })
  }
}
