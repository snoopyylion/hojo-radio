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
      first_name?: string;
      last_name?: string;
    }[];
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
    console.log(JSON.stringify(data, null, 2));

    const {
      id,
      email_addresses,
      profile_image_url,
      first_name,
      last_name,
      external_accounts,
    } = data;

    const email = email_addresses?.[0]?.email_address ?? null;
    const image_url = profile_image_url ?? null;

    //fallback and external account because thats where apple stores firstname and last name on clerk
    const fallbackFirstName = external_accounts?.[0]?.first_name ?? "";
    const fallbackLastName = external_accounts?.[0]?.last_name ?? "";

    const resolvedFirstName = first_name || fallbackFirstName;
    const resolvedLastName = last_name || fallbackLastName;

    if (!id) {
      console.warn("⚠️ Missing user ID, skipping...");
      return NextResponse.json({ success: false }, { status: 400 });
    }

    if (type === "user.created" || type === "user.updated") {
      if (!email) {
        console.warn("⚠️ Missing email, skipping...");
        return NextResponse.json({ success: false }, { status: 400 });
      }

      const { error } = await supabaseAdmin.from("users").upsert([
        {
          id,
          email,
          first_name: resolvedFirstName,
          last_name: resolvedLastName,
          image_url,
          role: "user",
        },
      ]);

      if (error) {
        console.error("❌ Supabase upsert error:", error);
        return NextResponse.json({ error: "Supabase upsert failed" }, { status: 500 });
      }

      return NextResponse.json({
        message: `✅ User ${type === "user.created" ? "created" : "updated"} in Supabase`,
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
