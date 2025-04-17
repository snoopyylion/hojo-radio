import { sanityClient } from '@/lib/sanity/server'

type LikeData = {
  postId: string
  userId: string
  action: 'like' | 'unlike'
}

export async function POST(req: Request) {
  try {
    const { postId, userId, action }: LikeData = await req.json()

    if (!postId || !userId || !action) {
      return new Response(JSON.stringify({ message: 'Missing fields' }), { status: 400 })
    }

    const patch = sanityClient.patch(postId).setIfMissing({ likes: [] })

    if (action === 'like') {
      patch.append('likes', [userId])
    } else if (action === 'unlike') {
      patch.unset([`likes[_ == "${userId}"]`])
    }

    const result = await patch.commit()

    return new Response(JSON.stringify({ message: `Post ${action}d`, result }), { status: 200 })
  } catch (err) {
    console.error('Error updating like:', err)
    return new Response(JSON.stringify({ message: 'Error updating like' }), { status: 500 })
  }
}
