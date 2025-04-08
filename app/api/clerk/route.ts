import type { NextRequest } from 'next/server';
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { getXataClient } from '@/src/xata';

const xata = getXataClient();

interface ClerkEvent {
  data: {
    id: string;
    email_addresses: { email_address: string }[];
  };
  type: 'user.created' | 'user.updated' | 'user.deleted';
}

/*************  ✨ Windsurf Command ⭐  *************/
/**
 * Handles incoming Clerk webhooks.
 *
 * Currently, only the 'user.created' event is handled, which creates a
 * new user in the Xata database with the Clerk-provided ID and email
 * address.
 *
 * Other events are ignored.
 *
 * @param req - The incoming NextRequest object.
 */
/*******  d5100b1b-af53-4b21-8f4d-c44d4e557fbc  *******/
export async function POST(req: NextRequest) {
  const payload = await req.text();

  const headerPayload = await headers();
  const svixHeaders = {
    'svix-id': headerPayload.get('svix-id') ?? '',
    'svix-timestamp': headerPayload.get('svix-timestamp') ?? '',
    'svix-signature': headerPayload.get('svix-signature') ?? '',
  };

  const wh = new Webhook(process.env.SIGNING_SECRET || '');
  let evt: ClerkEvent;

  try {
    evt = wh.verify(payload, svixHeaders) as ClerkEvent;
  } catch {
    return new Response('Webhook verification failed', { status: 400 });
  }

  const { id, email_addresses } = evt.data;

  if (evt.type === 'user.created') {
    const email = email_addresses?.[0]?.email_address || '';

    await xata.db.users.create({
      clerkId: id,
      email,
      role: 'viewer',
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
