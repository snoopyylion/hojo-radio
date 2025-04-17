import type { NextApiRequest, NextApiResponse } from 'next';
import { sanityClient } from '@/lib/sanity/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') return res.status(405).end();

  const { postId } = req.body;

  try {
    await sanityClient.delete(postId);
    res.status(200).json({ message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ error: err });
  }
}
