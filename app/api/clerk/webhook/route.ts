import { Webhook } from "svix";
import { NextResponse } from "next/server";
import { XataClient } from "../../../../src/xata";
import { headers as nextHeaders } from "next/headers";

const xata = new XataClient();

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
  const body = await req.text();
  const headerPayload = await nextHeaders();

  const svixHeaders = {
    "svix-id": headerPayload.get("svix-id") ?? "",
    "svix-timestamp": headerPayload.get("svix-timestamp") ?? "",
    "svix-signature": headerPayload.get("svix-signature") ?? "",
  };

  try {
    const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || "");
    const evt = wh.verify(body, svixHeaders) as ClerkEvent;

    const { type, data } = evt;

    console.log("✅ Clerk event received:", type);

    if (type === "user.created") {
      const { id, first_name, last_name, email_addresses, profile_image_url } = data;
      const email = email_addresses?.[0]?.email_address;

      if (!id || !email) {
        console.warn("⚠️ Missing Clerk ID or email.");
        return NextResponse.json({ message: "Missing required user data" }, { status: 400 });
      }

      const existingUser = await xata.db.users.filter({ clerkId: id }).getFirst();
      if (existingUser) {
        return NextResponse.json({ message: "User already exists" });
      }

      const name = [first_name, last_name].filter(Boolean).join(" ") || "Unnamed";
      const image = profile_image_url ?? null;

      const newUser = await xata.db.users.create({
        clerkId: id,
        email,
        name,
        image,
        role: "user",
      });

      console.log("✅ Created user:", newUser);
      return NextResponse.json({ status: "ok", user: newUser });
    }

    if (type === "user.deleted") {
      const { id } = data;

      const user = await xata.db.users.filter({ clerkId: id }).getFirst();
      if (!user) {
        return NextResponse.json({ message: "User not found" }, { status: 404 });
      }

      await xata.db.users.delete(user.id);
      console.log("✅ Deleted user:", id);
      return NextResponse.json({ status: "ok", message: "User deleted" });
    }

    return NextResponse.json({ message: "Unhandled event" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook verification failed";
    console.error("❌ Webhook verification error:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
