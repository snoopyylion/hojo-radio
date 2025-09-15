// app/api/podcast/network-monitor/route.ts - FIXED
import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Define the expected shape of network stats
interface NetworkStats {
  latency: number;
  jitter: number;
  packetLoss: number;
  bandwidth?: number;
}

// Network quality thresholds
const QUALITY_THRESHOLDS = {
  excellent: { latency: 50, jitter: 10, packetLoss: 0.1 },
  good: { latency: 100, jitter: 20, packetLoss: 0.5 },
  fair: { latency: 200, jitter: 50, packetLoss: 1.0 },
  poor: { latency: 500, jitter: 100, packetLoss: 3.0 },
};

function analyzeNetworkQuality(stats: NetworkStats): "high" | "medium" | "low" {
  const { latency, jitter, packetLoss } = stats;

  if (
    latency <= QUALITY_THRESHOLDS.excellent.latency &&
    jitter <= QUALITY_THRESHOLDS.excellent.jitter &&
    packetLoss <= QUALITY_THRESHOLDS.excellent.packetLoss
  ) {
    return "high";
  }

  if (
    latency <= QUALITY_THRESHOLDS.good.latency &&
    jitter <= QUALITY_THRESHOLDS.good.jitter &&
    packetLoss <= QUALITY_THRESHOLDS.good.packetLoss
  ) {
    return "medium";
  }

  return "low";
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { sessionId, networkStats, deviceInfo, connectionType, timestamp } = body;

    if (!sessionId || !networkStats) {
      return NextResponse.json(
        { error: "Missing required data" },
        { status: 400 }
      );
    }

    // Analyze network quality
    const detectedQuality = analyzeNetworkQuality(networkStats as NetworkStats);

    // Store network monitoring data
    const { error: monitorError } = await supabase
      .from("network_monitoring")
      .insert({
        session_id: sessionId,
        user_id: userId,
        network_stats: JSON.stringify(networkStats),
        device_info: JSON.stringify(deviceInfo),
        connection_type: connectionType,
        detected_quality: detectedQuality,
        timestamp: timestamp || new Date().toISOString(),
      })
      .select()
      .single();

    if (monitorError) {
      console.error("Network monitoring storage error:", monitorError);
    }

    // Get session info
    const { data: session } = await supabase
      .from("live_sessions")
      .select("id, listener_count, network_optimization_enabled")
      .eq("id", sessionId)
      .single();

    // Recommendations
    const recommendations = {
      quality: detectedQuality,
      adaptiveStreaming: detectedQuality !== "high",
      audioOnlyMode: detectedQuality === "low",
      bufferOptimization: detectedQuality === "low",
      reconnectOptimization: networkStats.packetLoss > 1.0,
      bandwidthLimit:
        detectedQuality === "low"
          ? "64k"
          : detectedQuality === "medium"
          ? "128k"
          : "256k",
    };

    // Immediate optimization check
    const needsImmediateOptimization =
      detectedQuality === "low" ||
      networkStats.packetLoss > 2.0 ||
      networkStats.latency > 300;

    if (needsImmediateOptimization && session) {
      await supabase
        .from("live_sessions")
        .update({
          network_optimization_enabled: true,
          auto_quality_adjustment: true,
          last_optimization: new Date().toISOString(),
        })
        .eq("id", sessionId);
    }

    return NextResponse.json({
      success: true,
      networkQuality: detectedQuality,
      recommendations,
      autoOptimizationApplied: needsImmediateOptimization,
      stats: {
        latency: networkStats.latency,
        jitter: networkStats.jitter,
        packetLoss: networkStats.packetLoss,
        bandwidth: networkStats.bandwidth ?? null,
      },
      thresholds: QUALITY_THRESHOLDS,
    });
  } catch (error) {
    console.error("Network monitoring error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId");
    const timeRange = url.searchParams.get("timeRange") || "1h"; // 1h, 24h, 7d

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID required" },
        { status: 400 }
      );
    }

    // Calculate time range
    const now = new Date();
    const timeRangeMs =
      {
        "1h": 60 * 60 * 1000,
        "24h": 24 * 60 * 60 * 1000,
        "7d": 7 * 24 * 60 * 60 * 1000,
      }[timeRange] || 60 * 60 * 1000;

    const startTime = new Date(now.getTime() - timeRangeMs);

    // Fetch history
    const { data: networkHistory, error: historyError } = await supabase
      .from("network_monitoring")
      .select("*")
      .eq("session_id", sessionId)
      .gte("timestamp", startTime.toISOString())
      .order("timestamp", { ascending: true });

    if (historyError) {
      console.error("Network history error:", historyError);
      return NextResponse.json(
        { error: "Failed to fetch network history" },
        { status: 500 }
      );
    }

    // Trend analysis
    const qualityTrend =
      networkHistory?.map((record) => ({
        timestamp: record.timestamp,
        quality: record.detected_quality,
        stats: JSON.parse(record.network_stats || "{}") as NetworkStats,
      })) || [];

    // Averages
    const avgStats = qualityTrend.reduce(
      (acc, record) => {
        const stats = record.stats;
        acc.latency += stats.latency || 0;
        acc.jitter += stats.jitter || 0;
        acc.packetLoss += stats.packetLoss || 0;
        acc.bandwidth += stats.bandwidth || 0;
        return acc;
      },
      { latency: 0, jitter: 0, packetLoss: 0, bandwidth: 0 }
    );

    const recordCount = qualityTrend.length || 1;
    Object.keys(avgStats).forEach((key) => {
      avgStats[key as keyof typeof avgStats] /= recordCount;
    });

    // Distribution
    const qualityDistribution = qualityTrend.reduce(
      (acc, record) => {
        acc[record.quality] = (acc[record.quality] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return NextResponse.json({
      success: true,
      timeRange,
      recordCount,
      averageStats: avgStats,
      qualityTrend,
      qualityDistribution,
      currentQuality:
        qualityTrend[qualityTrend.length - 1]?.quality || "unknown",
      recommendations: {
        overallQuality: Object.keys(qualityDistribution).reduce((a, b) =>
          qualityDistribution[a] > qualityDistribution[b] ? a : b
        ),
        stabilityScore:
          recordCount > 0
            ? 1 - (Object.keys(qualityDistribution).length - 1) / recordCount
            : 0,
        needsOptimization: avgStats.latency > 200 || avgStats.packetLoss > 1.0,
      },
    });
  } catch (error) {
    console.error("Network monitoring GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
