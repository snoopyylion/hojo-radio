// /app/api/news-verification/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Optional URL parameters for pagination and filtering
        const url = new URL(request.url);
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '10');
        const offset = (page - 1) * limit;
        
        const { data, error, count } = await supabaseAdmin
            .from("verifications")
            .select("id, headline, content, source_url, verdict, credibility_score, created_at", { count: 'exact' })
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error("❌ Fetch error:", error);
            return NextResponse.json({ error: "Failed to fetch verifications" }, { status: 500 });
        }

        return NextResponse.json({ 
            data,
            pagination: {
                total: count,
                page,
                limit,
                totalPages: Math.ceil((count || 0) / limit)
            }
        });
    } catch (error) {
        const err = error as Error
        console.error('Fetch verifications failed:', err.message)
        return NextResponse.json({ error: err.message }, { status: 500 })
      }
}