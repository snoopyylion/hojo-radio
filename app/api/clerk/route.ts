import { Webhook, WebhookRequiredHeaders } from "svix";
import connectDB from "@/config/db";
import User from "@/models/User";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

interface SvixUserEventData {
  id: string;
  email_addresses: { email_address: string }[];
  first_name: string;
  last_name: string;
  image_url: string;
  public_metadata?: {
    role?: string;
  };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const signingSecret = process.env.SIGNING_SECRET;

  if (!signingSecret) {
    return NextResponse.json({ error: "Missing SIGNING_SECRET" }, { status: 500 });
  }

  const wh = new Webhook(signingSecret);

  const headerPayload = headers();
  const svixHeaders: WebhookRequiredHeaders = {
    "svix-id": headerPayload.get("svix-id") || "",
    "svix-timestamp": headerPayload.get("svix-timestamp") || "",
    "svix-signature": headerPayload.get("svix-signature") || "",
  };

  const payload = await req.json();
  const body = JSON.stringify(payload);

  let event: { data: SvixUserEventData; type: string };

  try {
    event = wh.verify(body, svixHeaders) as typeof event;
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  const { data, type } = event;

  const userData = {
    _id: data.id,
    email: data.email_addresses[0]?.email_address,
    name: `${data.first_name} ${data.last_name}`,
    image: data.image_url,
    role: data.public_metadata?.role || "user",
  };

  await connectDB();

  try {
    switch (type) {
      case "user.created":
        await User.create(userData);
        break;
      case "user.updated":
        await User.findByIdAndUpdate(data.id, userData);
        break;
      case "user.deleted":
        await User.findByIdAndDelete(data.id);
        break;
      default:
        console.warn("Unhandled event type:", type);
    }

    return NextResponse.json({ message: "Event received" });
  } catch (error) {
    console.error("Error handling event:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
