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
    email_addresses?: { email_address: string }[];
    profile_image_url?: string;
    external_accounts?: {
      provider: string;
      first_name?: string;
      last_name?: string;
      email_address?: string;
    }[];
    public_metadata?: {
      username?: string;
    };
    unsafe_metadata?: {
      firstName?: string;
      lastName?: string;
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

  console.log("🔍 Webhook headers:", svixHeaders);

  try {
    const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || "");
    const evt = wh.verify(body, svixHeaders) as ClerkUserEvent;

    const { type, data } = evt;

    console.log(`📣 Clerk webhook event received: ${type}`);
    console.log("📦 Event data:", JSON.stringify(data, null, 2));
    
    const {
      id,
      email_addresses,
      profile_image_url,
      first_name,
      last_name,
      external_accounts,
      unsafe_metadata,
      public_metadata,
    } = data;

    const email = email_addresses?.[0]?.email_address ?? null;
    const image_url = profile_image_url ?? null;
    const username = public_metadata?.username ?? null;

    // Enhanced name resolution for OAuth providers
    let resolvedFirstName = "";
    let resolvedLastName = "";

    if (first_name && last_name) {
      // Direct from Clerk (most reliable)
      resolvedFirstName = first_name;
      resolvedLastName = last_name;
      console.log(`📝 Using direct Clerk names: ${resolvedFirstName} ${resolvedLastName}`);
    } else if (external_accounts && external_accounts.length > 0) {
      // From OAuth provider - Enhanced extraction
      const oauthAccount = external_accounts[0];
      
      // Try different possible field names for OAuth data
      resolvedFirstName = oauthAccount.first_name || 
                         (oauthAccount as any).firstName || 
                         (oauthAccount as any).given_name || "";
      resolvedLastName = oauthAccount.last_name || 
                        (oauthAccount as any).lastName || 
                        (oauthAccount as any).family_name || "";
      
      console.log(`🔍 OAuth account data:`, oauthAccount);
      console.log(`📝 Extracted OAuth names: ${resolvedFirstName} ${resolvedLastName}`);
    } else if (unsafe_metadata?.firstName && unsafe_metadata?.lastName) {
      // From form submission
      resolvedFirstName = unsafe_metadata.firstName;
      resolvedLastName = unsafe_metadata.lastName;
      console.log(`📝 Using unsafe metadata names: ${resolvedFirstName} ${resolvedLastName}`);
    }

    // If we still don't have names, try to extract from email
    if (!resolvedFirstName && !resolvedLastName && email) {
      const emailName = email.split('@')[0];
      if (emailName.includes('.')) {
        const parts = emailName.split('.');
        resolvedFirstName = parts[0];
        resolvedLastName = parts[1] || "";
      } else {
        resolvedFirstName = emailName;
      }
      console.log(`📝 Fallback email extraction: ${resolvedFirstName} ${resolvedLastName}`);
    }

    if (!id) {
      console.warn("⚠️ Missing user ID, skipping...");
      return NextResponse.json({ success: false }, { status: 400 });
    }

    if (type === "user.created" || type === "user.updated") {
      if (!email) {
        console.warn("⚠️ Missing email, skipping...");
        return NextResponse.json({ success: false }, { status: 400 });
      }

      // For OAuth users, names might be empty initially but will be populated
      // We'll mark profile as incomplete if username is missing (always the case for OAuth)
      const needsProfileCompletion = !username || 
                                   !resolvedFirstName.trim() || 
                                   !resolvedLastName.trim();

      console.log(`🎯 Profile completion needed: ${needsProfileCompletion}`);
      console.log(`🎯 Username: ${username || 'MISSING'}`);
      console.log(`🎯 First name: ${resolvedFirstName || 'MISSING'}`);
      console.log(`🎯 Last name: ${resolvedLastName || 'MISSING'}`);

      const userData = {
        id,
        email,
        first_name: resolvedFirstName.trim() || null,
        last_name: resolvedLastName.trim() || null,
        image_url,
        role: "user",
        username: username || null,
        profile_completed: !needsProfileCompletion,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log(`💾 Upserting user data:`, userData);

      const { error } = await supabaseAdmin
        .from("users")
        .upsert([userData], { 
          onConflict: 'id',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error("❌ Supabase upsert error:", error);
        return NextResponse.json({ error: "Supabase upsert failed" }, { status: 500 });
      }

      console.log(`✅ User ${type === "user.created" ? "created" : "updated"} successfully`);

      return NextResponse.json({
        message: `✅ User ${type === "user.created" ? "created" : "updated"} in Supabase`,
        needsProfileCompletion,
        userData: { ...userData, password: undefined }
      });
    }

    if (type === "user.deleted") {
      const { error } = await supabaseAdmin.from("users").delete().eq("id", id);

      if (error) {
        console.error("❌ Supabase delete error:", error);
        return NextResponse.json({ error: "Supabase delete failed" }, { status: 500 });
      }

      return NextResponse.json({ message: "🗑️ User deleted from Supabase" });
    }

    return NextResponse.json({ message: "ℹ️ Event type not handled" });
  } catch (err) {
    console.error("❌ Webhook verification failed:", err);
    return NextResponse.json({ error: "Webhook verification failed" }, { status: 400 });
  }
}