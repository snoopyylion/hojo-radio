// app/api/users/me/route.ts
//
// Returns the current user's profile from Supabase.
// If core fields (email, first_name) are missing, it enriches the row from Clerk
// and patches Supabase so subsequent requests return full data.

import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── 1. Fetch from Supabase ────────────────────────────────────────────────
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, email, role, author_request, first_name, last_name, username, image_url, is_admin, profile_completed')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // ── 2. If row exists and has an email, return it directly ─────────────────
    if (data?.email) {
      return NextResponse.json(data, { status: 200 });
    }

    // ── 3. Row is missing or incomplete — enrich from Clerk ───────────────────
    console.log(`⚠️  User ${userId} row missing or incomplete in Supabase — enriching from Clerk`);

    const clerkUser = await currentUser();
    if (!clerkUser) {
      // Row exists but Clerk session is stale — return what we have
      if (data) return NextResponse.json(data, { status: 200 });
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const email = clerkUser.emailAddresses?.[0]?.emailAddress ?? null;
    const firstName = clerkUser.firstName ?? null;
    const lastName  = clerkUser.lastName  ?? null;
    const imageUrl  = clerkUser.imageUrl  ?? null;

    // ── 4. Upsert the enriched row ────────────────────────────────────────────
    const upsertPayload = {
      id:         userId,
      email,
      first_name: data?.first_name || firstName,
      last_name:  data?.last_name  || lastName,
      username:   data?.username   ?? null,
      image_url:  data?.image_url  || imageUrl,
      role:       data?.role       ?? 'user',
      author_request: data?.author_request ?? false,
      is_admin:   data?.is_admin   ?? false,
      profile_completed: data?.profile_completed ?? false,
      updated_at: new Date().toISOString(),
    };

    const { data: upserted, error: upsertError } = await supabaseAdmin
      .from('users')
      .upsert(upsertPayload, { onConflict: 'id' })
      .select()
      .single();

    if (upsertError) {
      console.error('Upsert error:', upsertError);
      // Still return what we have from Clerk even if upsert fails
      return NextResponse.json(upsertPayload, { status: 200 });
    }

    console.log(`✅  User ${userId} enriched and saved to Supabase`);
    return NextResponse.json(upserted, { status: 200 });

  } catch (err) {
    console.error('Server error in /api/users/me:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}