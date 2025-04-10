import { Webhook } from "svix";
import { NextResponse } from "next/server";
import { headers as nextHeaders } from "next/headers";
import { XataClient } from "../../../../src/xata";

const xata = new XataClient();

export async function POST(req: Request) {
  const body = await req.text();
  const headerPayload = await nextHeaders();

  const svixHeaders = {
    "svix-id": headerPayload.get("svix-id") || "",
    "svix-timestamp": headerPayload.get("svix-timestamp") || "",
    "svix-signature": headerPayload.get("svix-signature") || "",
  };

  try {
    const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || "");
    const evt = wh.verify(body, svixHeaders);

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

      const existingUser = await xata.db.users.filter({ clerkId: id }).getFirst();
      if (existingUser) {
        console.log("User already exists:", existingUser);
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

      console.log("Created user in Xata:", newUser);
      return NextResponse.json({ status: "ok", user: newUser });
    }

    return NextResponse.json({ message: "Unhandled event" });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Webhook verification failed";
    console.error("Webhook error:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
}
