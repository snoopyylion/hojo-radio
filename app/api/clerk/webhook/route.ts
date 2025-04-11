import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

interface ClerkUserCreatedEvent {
  data: {
    id: string;
    first_name?: string;
    last_name?: string;
    email_addresses: { email_address: string }[];
    profile_image_url?: string;
  };
  type: "user.created";
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
    const evt = wh.verify(body, svixHeaders) as ClerkUserCreatedEvent;

    const { data } = evt;
    const email = data.email_addresses?.[0]?.email_address;
    const name = [data.first_name, data.last_name].filter(Boolean).join(" ");
    const image = data.profile_image_url ?? null;

    const { error } = await supabaseAdmin.from("users").insert([
        {
            id: data.id,
            email,
            first_name: data.first_name ?? "",
            last_name: data.last_name ?? "",
            image_url: image, // 👈 make sure it's image_url now
            role: "user",
          },
        ]);

    if (error) {
      console.error("❌ Supabase insert error:", error);
      return NextResponse.json({ error: "Supabase insert failed" }, { status: 500 });
    }

    return NextResponse.json({ message: "✅ User synced to Supabase" });
  } catch (err) {
    console.error("❌ Webhook error:", err);
    return NextResponse.json({ error: "Webhook verification failed" }, { status: 400 });
  }
}
