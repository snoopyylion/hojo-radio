import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

interface UserComment {
    id: string;
    user_id: string;
    post_id: string;
    comment: string;
    created_at: string;
    post_title?: string;
}

interface CommentStats {
    totalComments: number;
    commentsThisMonth: number;
    commentsToday: number;
    recentComments: UserComment[];
}

// Simple comment interface without posts join
interface SimpleComment {
    id: string;
    user_id: string;
    post_id: string;
    comment: string;
    created_at: string;
}

export async function GET() {
    const { userId } = await auth();
    
    console.log("🔍 API Debug - User ID:", userId);

    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Get total comment count for the user
        console.log("📊 Fetching total comments...");
        const { count: totalComments, error: countError } = await supabaseAdmin
            .from("comments")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId);

        console.log("📊 Total comments result:", { totalComments, countError });

        if (countError) {
            console.error("Error fetching comment count:", countError);
            return NextResponse.json({ error: countError.message }, { status: 500 });
        }

        // Get comments from this month
        const thisMonth = new Date();
        thisMonth.setDate(1);
        thisMonth.setHours(0, 0, 0, 0);

        const { count: commentsThisMonth, error: monthError } = await supabaseAdmin
            .from("comments")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId)
            .gte("created_at", thisMonth.toISOString());

        if (monthError) {
            console.error("Error fetching monthly comments:", monthError);
        }

        // Get comments from today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { count: commentsToday, error: todayError } = await supabaseAdmin
            .from("comments")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId)
            .gte("created_at", today.toISOString());

        if (todayError) {
            console.error("Error fetching today's comments:", todayError);
        }

        // Get recent comments WITHOUT joining posts table (since it doesn't exist)
        console.log("🔍 Fetching recent comments...");
        const { data: recentComments, error: recentError } = await supabaseAdmin
            .from("comments")
            .select(`
                id,
                user_id,
                post_id,
                comment,
                created_at
            `)
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(10) as { data: SimpleComment[] | null, error: any };

        console.log("🔍 Recent comments result:", { 
            recentComments, 
            recentError,
            count: recentComments?.length 
        });

        if (recentError) {
            console.error("Error fetching recent comments:", recentError);
        }

        // Format recent comments (without post titles for now)
        const formattedRecentComments: UserComment[] = (recentComments || []).map(comment => ({
            id: comment.id,
            user_id: comment.user_id,
            post_id: comment.post_id,
            comment: comment.comment,
            created_at: comment.created_at,
            post_title: `Post ${comment.post_id}` // Placeholder since we don't have posts table
        }));

        const stats: CommentStats = {
            totalComments: totalComments || 0,
            commentsThisMonth: commentsThisMonth || 0,
            commentsToday: commentsToday || 0,
            recentComments: formattedRecentComments
        };

        console.log("📊 Final stats:", stats);
        return NextResponse.json(stats);

    } catch (error) {
        console.error("❌ API Error:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
