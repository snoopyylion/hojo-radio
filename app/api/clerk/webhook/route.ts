import { Webhook } from "svix";
import { NextResponse } from "next/server";
import { XataClient } from "../../../../src/xata";

const xata = new XataClient();

export async function POST(req: Request) {
  const body = await req.text();
  const headers = Object.fromEntries(req.headers.entries());

  try {
    const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || "");
    const evt = wh.verify(body, headers);

    // Safely assert Clerk event
    const event = evt as {
      type: string;
      data: {
        id: string;
        first_name?: string;
        last_name?: string;
        email_addresses: { email_address: string }[];
        profile_image_url?: string;
      };
    };

    if (event.type === "user.created") {
      const { id, first_name, last_name, email_addresses, profile_image_url } = event.data;
      const email = email_addresses?.[0]?.email_address;

      if (!id || !email) {
        console.warn("Missing Clerk ID or email — cannot create user.");
        return NextResponse.json({ message: "Missing required user data" }, { status: 400 });
      }

      // Check for existing user to avoid duplicates
      const existingUser = await xata.db.users.filter({ clerkId: id }).getFirst();
      if (existingUser) {
        console.log("User already exists:", existingUser);
        return NextResponse.json({ message: "User already exists" });
      }

      const name = [first_name, last_name].filter(Boolean).join(" ") || "Unnamed";
      const image = profile_image_url ?? null;

      // Create user in Xata
      const newUser = await xata.db.users.create({
        clerkId: id,
        email,
        name,
        image,
        role: "user",
      });

      console.log("Created user in Xata:", newUser);
      return NextResponse.json({ status: "ok", user: newUser });
    }

    return NextResponse.json({ message: "Unhandled event" });
  } catch (err: any) {
    console.error("Webhook error:", err.message || err);
    return NextResponse.json(
      { error: err.message || "Webhook verification failed" },
      { status: 400 }
    );
  }
}
