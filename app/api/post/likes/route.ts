import type { NextApiRequest, NextApiResponse } from 'next';
import { sanityClient } from '@/lib/sanity/server';

type LikeData = {
  postId: string;
  userId: string;
  action: 'like' | 'unlike';
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { postId, userId, action } = req.body as LikeData;

  if (!postId || !userId || !action) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  try {
    const patch = sanityClient.patch(postId).setIfMissing({ likes: [] });

    if (action === 'like') {
      patch.append('likes', [userId]);
    } else if (action === 'unlike') {
      patch.unset([`likes[_ == "${userId}"]`]);
    }

    const result = await patch.commit();

    return res.status(200).json({ message: `Post ${action}d`, result });
  } catch (err) {
    console.error('Error updating like:', err);
    return res.status(500).json({ message: 'Error updating like' });
  }
}
