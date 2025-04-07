import { Webhook } from "svix";
import connectDB from "@/config/db";
import User from "@/models/User";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// Define types for incoming request body
interface SvixEventData {
    id: string;
    first_name: string;
    last_name: string;
    email_addresses: { email_address: string }[];
    image_url: string;
}

// Define the event types for Svix webhook
type SvixEventType = "user.created" | "user.updated" | "user.deleted";

export async function POST(req: NextRequest): Promise<NextResponse> {
    const wh = new Webhook(process.env.SIGNING_SECRET as string);
    const headerPayload = await headers();
    
    // Use Record<string, string> for the headers
    const svixHeaders: Record<string, string> = {
        "svix-id": headerPayload.get("svix-id") || "",
        "svix-timestamp": headerPayload.get("svix-timestamp") || "",
        "svix-signature": headerPayload.get("svix-signature") || "",
    };

    // Get the payload and verify it
    const payload = await req.json();
    const body = JSON.stringify(payload);

    // Explicitly cast the result of wh.verify to match the expected structure
    const { data, type }: { data: SvixEventData; type: SvixEventType } = wh.verify(body, svixHeaders) as { data: SvixEventData; type: SvixEventType };

    // Prepare the user data to be saved in the database
    const userData = {
        _id: data.id,
        email: data.email_addresses[0].email_address,
        name: `${data.first_name} ${data.last_name}`,
        image: data.image_url,
    };

    await connectDB();

    // Handle different event types
    switch (type) {
        case 'user.created':
            await User.create(userData);
            break;
        case 'user.updated':
            await User.findByIdAndUpdate(data.id, userData);
            break;
        case 'user.deleted':
            await User.findByIdAndDelete(data.id);
            break;

        default:
            break;
    }

    return NextResponse.json({ message: "Event received" });
}
