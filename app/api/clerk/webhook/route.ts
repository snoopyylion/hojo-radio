import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

interface ClerkEvent {
  type: string;
  data: {
    id: string;
    first_name?: string;
    last_name?: string;
    email_addresses?: { email_address: string }[];
    profile_image_url?: string;
  };
}

export async function POST(req: Request) {
  const body = await req.text()
  const headerPayload = await headers()

  const svixHeaders = {
    'svix-id': headerPayload.get('svix-id') ?? '',
    'svix-timestamp': headerPayload.get('svix-timestamp') ?? '',
    'svix-signature': headerPayload.get('svix-signature') ?? ''
  }

  try {
    const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || '')
    const evt = wh.verify(body, svixHeaders) as ClerkEvent

    if (evt.type === 'user.created') {
      const data = evt.data
      const email = data.email_addresses?.[0]?.email_address
      const name = [data.first_name, data.last_name].filter(Boolean).join(' ')
      const image = data.profile_image_url ?? null

      await supabase.from('users').insert([
        {
          id: data.id,
          email,
          name,
          image,
          role: 'user',
        }
      ])

      return NextResponse.json({ message: 'User synced' })
    }

    return NextResponse.json({ message: 'Unhandled event' })
  } catch (err) {
    console.error('Webhook error:', err)
    return NextResponse.json({ error: 'Webhook verification failed' }, { status: 400 })
  }
}
