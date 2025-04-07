import { Webhook } from "svix";
import connectDB from "@/config/db";
import User from "@/models/User";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const wh = new Webhook(process.env.SIGNING_SECRET);
    const headerPayload = await headers();
    const svixHeaders = {
        "svix-id": headerPayload.get("svix-id"),
        "svix-timestamp": headerPayload.get("svix-timestamp"),
        "svix-signature": headerPayload.get("svix-signature"),
    };

    // Get the payload and verify it
    const payload = await req.json();
    const body = JSON.stringify(payload);
    const { data, type } = wh.verify(body, svixHeaders);

    // Prepare the user data to be saved in the database
    const userData = {
        _id: data.id,
        email: data.email_addresses[0].email_address,
        name: `${data.first_name} ${data.last_name}`,
        image: data.image_url,
        role: data.public_metadata?.role || "user", // Default role is "user"
    };

    await connectDB();

    switch (type) {
        case 'user.created':
            // Create new user and assign role
            await User.create(userData);
            break;
        case 'user.updated':
            // Update user data and role
            await User.findByIdAndUpdate(data.id, userData);
            break;
        case 'user.deleted':
            // Delete user if needed
            await User.findByIdAndDelete(data.id);
            break;
        default:
            break;
    }

    return NextResponse.json({ message: "Event received" });
}
