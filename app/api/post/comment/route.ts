import type { NextApiRequest, NextApiResponse } from 'next';
import { sanityClient } from '@/lib/sanity/server';

type CommentData = {
  postId: string;
  userId: string;
  text: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { postId, userId, text } = req.body as CommentData;

  if (!postId || !userId || !text) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  const comment = {
    _type: 'object',
    userId,
    text,
    createdAt: new Date().toISOString(),
    likes: [], // For future comment likes
  };

  try {
    const result = await sanityClient
      .patch(postId)
      .setIfMissing({ comments: [] })
      .insert('after', 'comments[-1]', [comment])
      .commit();

    return res.status(200).json({ message: 'Comment added', result });
  } catch (err) {
    console.error('Error adding comment:', err);
    return res.status(500).json({ message: 'Error adding comment' });
  }
}
