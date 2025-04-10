import { Webhook } from "svix";
import { XataClient } from "../../../../src/xata";
import { NextResponse } from "next/server";

const xata = new XataClient();

type ClerkUserCreatedEvent = {
  type: "user.created";
  data: {
    id: string;
    email_addresses: { email_address: string }[];
    first_name: string;
    last_name: string;
    image_url: string;
  };
};

export async function POST(req: Request) {
  const payload = await req.text();
  const headers = Object.fromEntries(req.headers.entries());

  try {
    const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || "");
    const evt = wh.verify(payload, headers) as ClerkUserCreatedEvent;

    if (evt.type === "user.created") {
      const { id, email_addresses, first_name, last_name, image_url } = evt.data;
      const email = email_addresses?.[0]?.email_address;

      await xata.db.users.create({
        clerkId: id,
        email,
        name: `${first_name} ${last_name}`,
        image: image_url,
        role: "user",
      });
    }

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }
}
