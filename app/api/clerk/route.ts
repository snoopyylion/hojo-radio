interface EmailAddress {
    email_address: string;
  }
  
  interface ClerkUserData {
    id: string;
    email_addresses: EmailAddress[];
    first_name?: string;
    last_name?: string;
    image_url?: string;
  }
  
  interface ClerkWebhookEventBase {
    object: string;
    type: string;
  }
  
  interface UserCreatedEvent extends ClerkWebhookEventBase {
    type: "user.created";
    data: ClerkUserData;
  }
  
  interface UserUpdatedEvent extends ClerkWebhookEventBase {
    type: "user.updated";
    data: ClerkUserData;
  }
  
  interface UserDeletedEvent extends ClerkWebhookEventBase {
    type: "user.deleted";
    data: { id: string };
  }
  
  type WebhookEvent = UserCreatedEvent | UserUpdatedEvent | UserDeletedEvent;
  
  import { Webhook } from "svix";
  import { headers } from "next/headers";
  import { NextResponse } from "next/server";
  import { getXataClient } from "@/src/xata";
  
  const xata = getXataClient();
  
  export async function POST(req: Request): Promise<NextResponse> {
    const SIGNING_SECRET = process.env.SIGNING_SECRET;
  
    if (!SIGNING_SECRET) {
      return NextResponse.json({ error: "Missing SIGNING_SECRET" }, { status: 400 });
    }
  
    console.log('XATA_BRANCH:', process.env.XATA_BRANCH);

    const headerPayload = await headers();
    const svixHeaders = {
      "svix-id": headerPayload.get("svix-id") ?? "",
      "svix-timestamp": headerPayload.get("svix-timestamp") ?? "",
      "svix-signature": headerPayload.get("svix-signature") ?? "",
    };
  
    const payload = await req.text();
    const wh = new Webhook(SIGNING_SECRET);
  
    let evt: WebhookEvent;
  
    try {
      evt = wh.verify(payload, svixHeaders) as WebhookEvent;
    } catch (err) {
      console.error(err);
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
    }
  
    const { type } = evt;
  
    try {
      switch (type) {
        case "user.created": {
          const { data } = evt;
  
          const userData = {
            clerkId: data.id,
            email: data.email_addresses?.[0]?.email_address ?? "",
            name: `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim(),
            image: data.image_url ?? "",
            role: "user",
          };
  
          await xata.db.users.create(userData);
          break;
        }
  
        case "user.updated": {
            const { data } = evt;
          
            const existingUser = await xata.db.users
              .filter({ clerkId: data.id })
              .getFirst();
          
            if (existingUser) {
                const userId = (existingUser as unknown as { id: string }).id;

          
              await xata.db.users.update(userId, {
                email: data.email_addresses?.[0]?.email_address ?? "",
                name: `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim(),
                image: data.image_url ?? "",
              });
            }
            break;
          }
          
          case "user.deleted": {
            const { data } = evt;
          
            const existingUser = await xata.db.users
              .filter({ clerkId: data.id })
              .getFirst();
          
            if (existingUser) {
                const userId = (existingUser as unknown as { id: string }).id;
              await xata.db.users.delete(userId);
            }
            break;
          }
          
  
        default:
          console.warn("Unhandled webhook event type:", type);
      }
  
      return NextResponse.json({ message: "Event received" });
    } catch (error) {
      console.error("Webhook handler error:", error);
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
  }
  