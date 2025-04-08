import type { NextApiRequest, NextApiResponse } from 'next';
import { Webhook } from 'svix';
import { buffer } from 'micro';
import { getXataClient } from '@/src/xata';

const xata = getXataClient();

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const payload = (await buffer(req)).toString();

  const headers = {
    'svix-id': req.headers['svix-id'] as string,
    'svix-timestamp': req.headers['svix-timestamp'] as string,
    'svix-signature': req.headers['svix-signature'] as string,
  };

  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || '');
  let evt: any;

  try {
    evt = wh.verify(payload, headers);
  } catch (err) {
    return res.status(400).json({ error: 'Webhook verification failed' });
  }

  const { id, email_addresses } = evt.data;

  if (evt.type === 'user.created') {
    const email = email_addresses?.[0]?.email_address || '';

    // Save to Xata with default role
    await xata.db.users.create({
      clerkId: id,
      email,
      role: 'viewer',
    });
  }

  res.status(200).json({ success: true });
}
