// app/api/webhooks/clerk/route.ts
import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

interface ClerkUserEvent {
  type: "user.created" | "user.updated" | "user.deleted";
  data: {
    id: string;
    first_name?: string;
    last_name?: string;
    email_addresses?: { email_address: string; id: string }[];
    profile_image_url?: string;
    image_url?: string;
    external_accounts?: {
      provider?: string;
      first_name?: string;
      last_name?: string;
      given_name?: string;
      family_name?: string;
      email_address?: string;
    }[];
    unsafe_metadata?: {
      firstName?: string;
      lastName?: string;
    };
    public_metadata?: {
      username?: string;
    };
  };
}

export async function POST(req: Request) {
  const body = await req.text();
  const headerPayload = await headers();

  const svixHeaders = {
    "svix-id": headerPayload.get("svix-id") ?? "",
    "svix-timestamp": headerPayload.get("svix-timestamp") ?? "",
    "svix-signature": headerPayload.get("svix-signature") ?? "",
  };

  try {
    const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || "");
    const evt = wh.verify(body, svixHeaders) as ClerkUserEvent;

    const { type, data } = evt;

    console.log(`📣 Clerk webhook event received: ${type}`);
    console.log('🔍 Event data:', {
      id: data.id,
      emailCount: data.email_addresses?.length || 0,
      hasFirstName: !!data.first_name,
      hasLastName: !!data.last_name,
      hasImage: !!(data.profile_image_url || data.image_url),
      externalAccountsCount: data.external_accounts?.length || 0
    });

    const {
      id,
      email_addresses,
      profile_image_url,
      image_url,
      first_name,
      last_name,
      external_accounts,
      unsafe_metadata,
      public_metadata,
    } = data;

    const email = email_addresses?.find(e => e.email_address)?.email_address ?? null;
    const imageUrl = profile_image_url || image_url || null;
    const username = public_metadata?.username || null;

    // Enhanced name resolution
    let resolvedFirstName = first_name || "";
    let resolvedLastName = last_name || "";

    // Try external accounts (OAuth providers like Google, Apple)
    if ((!resolvedFirstName || !resolvedLastName) && external_accounts?.length) {
      const oauthAccount = external_accounts[0];
      resolvedFirstName = resolvedFirstName || oauthAccount.first_name || oauthAccount.given_name || "";
      resolvedLastName = resolvedLastName || oauthAccount.last_name || oauthAccount.family_name || "";
      
      console.log('🔍 OAuth data used:', {
        provider: oauthAccount.provider,
        hasFirstName: !!resolvedFirstName,
        hasLastName: !!resolvedLastName
      });
    }

    // Try unsafe metadata as fallback
    if ((!resolvedFirstName || !resolvedLastName) && unsafe_metadata) {
      resolvedFirstName = resolvedFirstName || unsafe_metadata.firstName || "";
      resolvedLastName = resolvedLastName || unsafe_metadata.lastName || "";
    }

    // Extract from email as last resort
    if (!resolvedFirstName && !resolvedLastName && email) {
      const emailName = email.split('@')[0];
      if (emailName.includes('.')) {
        const parts = emailName.split('.');
        resolvedFirstName = parts[0];
        resolvedLastName = parts[1] || "";
      } else {
        resolvedFirstName = emailName;
      }
      console.log('📧 Names extracted from email');
    }

    console.log('📝 Final resolved data:', {
      firstName: resolvedFirstName || 'empty',
      lastName: resolvedLastName || 'empty',
      email: email || 'empty',
      imageUrl: imageUrl || 'empty',
      username: username || 'empty'
    });

    if (!id) {
      console.warn("⚠️ Missing user ID, skipping...");
      return NextResponse.json({ success: false }, { status: 400 });
    }

    if (type === "user.created" || type === "user.updated") {
      if (!email) {
        console.warn("⚠️ Missing email, skipping...");
        return NextResponse.json({ success: false }, { status: 400 });
      }

      // Determine if profile needs completion
      const needsCompletion = !resolvedFirstName.trim() || !resolvedLastName.trim() || !username;

      const userData = {
        id,
        email,
        first_name: resolvedFirstName.trim() || null,
        last_name: resolvedLastName.trim() || null,
        image_url: imageUrl,
        role: "user",
        username,
        profile_completed: !needsCompletion,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log('💾 Webhook upserting user:', {
        id: userData.id,
        email: userData.email,
        hasFirstName: !!userData.first_name,
        hasLastName: !!userData.last_name,
        hasImageUrl: !!userData.image_url,
        hasUsername: !!userData.username,
        profileCompleted: userData.profile_completed
      });

      const { error, data: upsertedData } = await supabaseAdmin
        .from("users")
        .upsert([userData], {
          onConflict: 'id',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (error) {
        console.error("❌ Supabase upsert error:", error);
        return NextResponse.json({ error: "Supabase upsert failed" }, { status: 500 });
      }

      console.log('✅ Webhook user upserted successfully:', {
        id: upsertedData.id,
        email: upsertedData.email,
        profileCompleted: upsertedData.profile_completed
      });

      return NextResponse.json({
        message: `✅ User ${type === "user.created" ? "created" : "updated"} in Supabase`,
        userData: upsertedData
      });
    }

    if (type === "user.deleted") {
      const { error } = await supabaseAdmin.from("users").delete().eq("id", id);

      if (error) {
        console.error("❌ Supabase delete error:", error);
        return NextResponse.json({ error: "Supabase delete failed" }, { status: 500 });
      }

      console.log('🗑️ User deleted from database:', id);
      return NextResponse.json({ message: "🗑️ User deleted from Supabase" });
    }

    return NextResponse.json({ message: "ℹ️ Event type not handled" });
  } catch (err) {
    console.error("❌ Webhook verification failed:", err);
    return NextResponse.json({ error: "Webhook verification failed" }, { status: 400 });
  }
}