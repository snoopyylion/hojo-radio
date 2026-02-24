// app/api/podcast/manage/route.ts
// CRUD for podcasts, seasons, episodes + image upload

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function slugify(text: string) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

// ============================================================
// POST - Create podcast, season, or episode
// ============================================================
export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const url = new URL(req.url);
        const type = url.searchParams.get("type"); // "podcast" | "season" | "episode"

        // ── CREATE PODCAST ──────────────────────────────────────
        if (type === "podcast") {
            const formData = await req.formData();
            const name = formData.get("name") as string;
            const description = formData.get("description") as string;
            const category = formData.get("category") as string;
            const tags = JSON.parse(formData.get("tags") as string || "[]");
            const coverImage = formData.get("coverImage") as File | null;

            if (!name) return NextResponse.json({ error: "Podcast name required" }, { status: 400 });

            // Check author role
            const { data: user } = await supabase
                .from("users")
                .select("role")
                .eq("id", userId)
                .single();

            if (user?.role !== "author") {
                return NextResponse.json({ error: "Only authors can create podcasts" }, { status: 403 });
            }

            // Upload cover image if provided
            let coverImageUrl: string | null = null;
            let coverImagePath: string | null = null;

            if (coverImage && coverImage.size > 0) {
                const ext = coverImage.name.split(".").pop() || "jpg";
                const path = `covers/${userId}/${Date.now()}.${ext}`;
                const buffer = Buffer.from(await coverImage.arrayBuffer());

                const { error: uploadError } = await supabase.storage
                    .from("podcast-images")
                    .upload(path, buffer, {
                        contentType: coverImage.type,
                        cacheControl: "3600",
                        upsert: false,
                    });

                if (!uploadError) {
                    const { data: urlData } = supabase.storage
                        .from("podcast-images")
                        .getPublicUrl(path);
                    coverImageUrl = urlData?.publicUrl || null;
                    coverImagePath = path;
                }
            }

            // Ensure unique slug
            let slug = slugify(name);
            const { data: existing } = await supabase
                .from("podcasts")
                .select("slug")
                .like("slug", `${slug}%`);
            if (existing && existing.length > 0) {
                slug = `${slug}-${existing.length}`;
            }

            const { data: podcast, error } = await supabase
                .from("podcasts")
                .insert({
                    author_id: userId,
                    name,
                    slug,
                    description: description || null,
                    cover_image_url: coverImageUrl,
                    cover_image_path: coverImagePath,
                    category: category || "general",
                    tags,
                })
                .select()
                .single();

            if (error) throw error;

            // Auto-create Season 1
            const { data: season } = await supabase
                .from("podcast_seasons")
                .insert({
                    podcast_id: podcast.id,
                    author_id: userId,
                    season_number: 1,
                    title: "Season 1",
                    description: "First season",
                })
                .select()
                .single();

            return NextResponse.json({ podcast, firstSeason: season, success: true });
        }

        // ── CREATE SEASON ────────────────────────────────────────
        if (type === "season") {
            const formData = await req.formData();
            const podcastId = formData.get("podcastId") as string;
            const title = formData.get("title") as string;
            const description = formData.get("description") as string;
            const coverImage = formData.get("coverImage") as File | null;

            if (!podcastId || !title) {
                return NextResponse.json({ error: "podcastId and title required" }, { status: 400 });
            }

            // Verify ownership
            const { data: podcast } = await supabase
                .from("podcasts")
                .select("id, author_id")
                .eq("id", podcastId)
                .eq("author_id", userId)
                .single();

            if (!podcast) return NextResponse.json({ error: "Podcast not found" }, { status: 404 });

            // Get next season number
            const { data: seasons } = await supabase
                .from("podcast_seasons")
                .select("season_number")
                .eq("podcast_id", podcastId)
                .order("season_number", { ascending: false })
                .limit(1);

            const nextSeasonNumber = (seasons?.[0]?.season_number || 0) + 1;

            // Upload season cover if provided
            let coverImageUrl: string | null = null;
            let coverImagePath: string | null = null;

            if (coverImage && coverImage.size > 0) {
                const ext = coverImage.name.split(".").pop() || "jpg";
                const path = `covers/${userId}/season-${podcastId}-${Date.now()}.${ext}`;
                const buffer = Buffer.from(await coverImage.arrayBuffer());

                const { error: uploadError } = await supabase.storage
                    .from("podcast-images")
                    .upload(path, buffer, { contentType: coverImage.type, upsert: false });

                if (!uploadError) {
                    const { data: urlData } = supabase.storage
                        .from("podcast-images")
                        .getPublicUrl(path);
                    coverImageUrl = urlData?.publicUrl || null;
                    coverImagePath = path;
                }
            }

            const { data: season, error } = await supabase
                .from("podcast_seasons")
                .insert({
                    podcast_id: podcastId,
                    author_id: userId,
                    season_number: nextSeasonNumber,
                    title,
                    description: description || null,
                    cover_image_url: coverImageUrl,
                    cover_image_path: coverImagePath,
                })
                .select()
                .single();

            if (error) throw error;

            return NextResponse.json({ season, success: true });
        }

        // ── CREATE EPISODE (pre-create before recording) ─────────
        if (type === "episode") {
            const body = await req.json();
            const { podcastId, seasonId, title, description } = body;

            if (!podcastId || !seasonId || !title) {
                return NextResponse.json({ error: "podcastId, seasonId, and title required" }, { status: 400 });
            }

            // Verify ownership
            const { data: podcast } = await supabase
                .from("podcasts")
                .select("id")
                .eq("id", podcastId)
                .eq("author_id", userId)
                .single();

            if (!podcast) return NextResponse.json({ error: "Podcast not found" }, { status: 404 });

            // Get next episode number for this season
            const { data: episodes } = await supabase
                .from("podcast_episodes")
                .select("episode_number")
                .eq("season_id", seasonId)
                .order("episode_number", { ascending: false })
                .limit(1);

            const nextEpisodeNumber = (episodes?.[0]?.episode_number || 0) + 1;

            const { data: episode, error } = await supabase
                .from("podcast_episodes")
                .insert({
                    podcast_id: podcastId,
                    season_id: seasonId,
                    author_id: userId,
                    episode_number: nextEpisodeNumber,
                    title,
                    description: description || null,
                    recording_status: "pending",
                })
                .select()
                .single();

            if (error) throw error;

            return NextResponse.json({ episode, success: true });
        }

        return NextResponse.json({ error: "Invalid type" }, { status: 400 });

    } catch (error) {
        console.error("[Podcast Manage] Error:", error);
        return NextResponse.json(
            { error: "Operation failed", details: error instanceof Error ? error.message : "Unknown" },
            { status: 500 }
        );
    }
}

// ============================================================
// GET - Fetch podcasts, seasons, episodes
// ============================================================
export async function GET(req: NextRequest) {
    try {
        console.log("🔍 GET /api/podcast/manage called");
        
        const { userId } = await auth();
        console.log("👤 User ID:", userId);
        
        if (!userId) {
            console.log("❌ No user ID");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const url = new URL(req.url);
        const type = url.searchParams.get("type");
        const podcastId = url.searchParams.get("podcastId");
        const seasonId = url.searchParams.get("seasonId");
        const authorId = url.searchParams.get("authorId");
        const limit = parseInt(url.searchParams.get("limit") || "20");
        const offset = parseInt(url.searchParams.get("offset") || "0");
        
        console.log("📋 Query params:", { type, podcastId, seasonId, authorId, offset, limit });

        // Test Supabase connection first
        const { error: testError } = await supabase.from("podcasts").select("count").limit(1);
        if (testError) {
            console.error("❌ Supabase connection error:", testError);
            throw new Error(`Supabase connection failed: ${testError.message}`);
        }
        console.log("✅ Supabase connected");

        if (type === "podcasts") {
            console.log("📡 Fetching podcasts...");
            
            let query = supabase
                .from("podcasts")
                .select(`
                    *,
                    seasons:podcast_seasons(count)
                `)
                .eq("is_public", true)
                .order("created_at", { ascending: false })
                .range(offset, offset + limit - 1);

            if (authorId) {
                console.log("🔍 Filtering by author:", authorId);
                query = query.eq("author_id", authorId);
            }

            const { data, error } = await query;
            
            if (error) {
                console.error("❌ Podcasts fetch error:", error);
                throw error;
            }
            
            console.log(`✅ Found ${data?.length || 0} podcasts`);
            return NextResponse.json({ podcasts: data || [] });
        }

        if (type === "seasons" && podcastId) {
            console.log("📡 Fetching seasons for podcast:", podcastId);
            
            // First, get all seasons for this podcast
            const { data: seasons, error: seasonsError } = await supabase
                .from("podcast_seasons")
                .select(`
                    id,
                    podcast_id,
                    author_id,
                    season_number,
                    title,
                    description,
                    cover_image_url,
                    is_active,
                    created_at,
                    updated_at
                `)
                .eq("podcast_id", podcastId)
                .eq("is_active", true)
                .order("season_number", { ascending: true });

            if (seasonsError) {
                console.error("❌ Seasons fetch error:", seasonsError);
                throw seasonsError;
            }
            
            console.log(`✅ Found ${seasons?.length || 0} seasons`);

            // Then, get episode counts for each season separately
            const seasonsWithCounts = await Promise.all(
                (seasons || []).map(async (season) => {
                    const { count, error: countError } = await supabase
                        .from("podcast_episodes")
                        .select("*", { count: "exact", head: true })
                        .eq("season_id", season.id);

                    if (countError) {
                        console.error(`❌ Error counting episodes for season ${season.id}:`, countError);
                        return {
                            ...season,
                            episode_count: 0,
                            podcast_episodes: [{ count: 0 }]
                        };
                    }

                    return {
                        ...season,
                        episode_count: count || 0,
                        podcast_episodes: [{ count: count || 0 }]
                    };
                })
            );

            console.log("📦 Seasons data with counts:", seasonsWithCounts);
            return NextResponse.json({ seasons: seasonsWithCounts || [] });
        }

        // ── UPDATED EPISODES SECTION ─────────────────────────────
        if (type === "episodes") {
            console.log("📡 Fetching episodes...");
            
            try {
                let query = supabase
                    .from("podcast_episodes")
                    .select(`
                        *,
                        podcast:podcasts!podcast_id(id, name, slug, cover_image_url, author_id),
                        season:podcast_seasons!season_id(id, title, season_number),
                        author:users!author_id(first_name, last_name)
                    `)
                    .eq("is_published", true)
                    .eq("recording_status", "ready")
                    .order("published_at", { ascending: false, nullsFirst: false })
                    .limit(50);

                if (seasonId) query = query.eq("season_id", seasonId);
                if (podcastId) query = query.eq("podcast_id", podcastId);

                const { data, error } = await query;
                
                if (error) {
                    console.error("❌ Episodes fetch error:", error);
                    return NextResponse.json({ error: error.message }, { status: 500 });
                }
                
                console.log(`✅ Found ${data?.length || 0} episodes`);
                return NextResponse.json({ episodes: data || [] });
            } catch (err) {
                console.error("💥 Episodes catch error:", err);
                return NextResponse.json(
                    { 
                        error: "Failed to fetch episodes", 
                        details: err instanceof Error ? err.message : "Unknown" 
                    },
                    { status: 500 }
                );
            }
        }

        if (type === "podcast" && podcastId) {
            console.log("📡 Fetching single podcast:", podcastId);
            
            const { data, error } = await supabase
                .from("podcasts")
                .select("slug, name")
                .eq("id", podcastId)
                .single();

            if (error) {
                console.error("❌ Podcast fetch error:", error);
                throw error;
            }
            
            console.log("✅ Found podcast:", data);
            return NextResponse.json({ podcast: data });
        }

        console.log("❌ Invalid type:", type);
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });

    } catch (error) {
        console.error("💥 [Podcast GET] Error details:", {
            message: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
            error
        });
        
        return NextResponse.json(
            { 
                error: "Failed to fetch", 
                details: error instanceof Error ? error.message : "Unknown error" 
            },
            { status: 500 }
        );
    }
}