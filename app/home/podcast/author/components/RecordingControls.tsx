// app/home/podcast/author/components/RecordingControls.tsx
// Drop this into PodcastStudio alongside AudioControls

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Circle, Square, Loader2, Mic, AlertCircle, Check, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";

interface RecordingControlsProps {
  sessionId: string;
  userId: string;
  /** Called when a recording finishes processing */
  onRecordingComplete?: (episodeId: string) => void;
}

interface PodcastOption {
  id: string;
  name: string;
  seasons: SeasonOption[];
}

interface SeasonOption {
  id: string;
  season_number: number;
  title: string;
}

type RecordingState = "idle" | "selecting" | "recording" | "stopping" | "processing" | "done" | "error";

export function RecordingControls({
  sessionId,
  userId,
  onRecordingComplete,
}: RecordingControlsProps) {
  const [state, setState] = useState<RecordingState>("idle");
  const [podcasts, setPodcasts] = useState<PodcastOption[]>([]);
  const [selectedPodcastId, setSelectedPodcastId] = useState("");
  const [selectedSeasonId, setSelectedSeasonId] = useState("");
  const [episodeTitle, setEpisodeTitle] = useState("");
  const [episodeDescription, setEpisodeDescription] = useState("");
  const [currentEpisodeId, setCurrentEpisodeId] = useState<string | null>(null);
  const [currentEgressId, setCurrentEgressId] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0); // seconds
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // ── Cleanup polling on unmount ────────────────────────────
  useEffect(() => {
    // Listen for the recording to complete via the polling
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, []);

  // ── Show timeout message for long processing ──────────────
  useEffect(() => {
    if (state === "processing") {
      // Show a message that it might take a minute
      const timeoutId = setTimeout(() => {
        toast("⏳ Still processing... Large recordings take longer", {
          duration: 5000,
          icon: "⏳"
        });
      }, 15000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [state]);

  // ── Fetch author's podcasts on mount ─────────────────────
  useEffect(() => {
    fetch(`/api/podcast/manage?type=podcasts&authorId=${userId}`)
      .then((r) => r.json())
      .then(async ({ podcasts: list }) => {
        if (!list?.length) return;

        // For each podcast, fetch its seasons
        const enriched: PodcastOption[] = await Promise.all(
          list.map(async (p: { id: string; name: string }) => {
            const { seasons } = await fetch(
              `/api/podcast/manage?type=seasons&podcastId=${p.id}`
            ).then((r) => r.json());
            return { id: p.id, name: p.name, seasons: seasons || [] };
          })
        );

        setPodcasts(enriched);
        if (enriched.length === 1) {
          setSelectedPodcastId(enriched[0].id);
          if (enriched[0].seasons.length === 1) {
            setSelectedSeasonId(enriched[0].seasons[0].id);
          }
        }
      })
      .catch(console.error);
  }, [userId]);

  // ── Timer ─────────────────────────────────────────────────
  useEffect(() => {
    if (state === "recording") {
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (state === "idle" || state === "selecting") setRecordingTime(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [state]);

  // ── Poll egress status after stopping ────────────────────
  const startPolling = useCallback((episodeId: string, egressId: string) => {
    let pollCount = 0;
    const maxPolls = 60; // Poll for up to 3 minutes (60 * 3s = 180s)
    
    pollRef.current = setInterval(async () => {
      pollCount++;
      
      try {
        console.log(`🔄 Polling recording status (${pollCount}/${maxPolls})...`);
        
        const res = await fetch(
          `/api/podcast/recording?egressId=${egressId}&episodeId=${episodeId}`
        );
        const data = await res.json();

        console.log("📊 Poll response:", data);

        if (data.status === "complete") {
          console.log("✅ Recording complete!");
          clearInterval(pollRef.current!);
          setState("done");
          onRecordingComplete?.(episodeId);
          toast.success(
            `🎙️ Episode saved! ${data.fileSizeMB ? `(${data.fileSizeMB} MB)` : ""}`,
            { duration: 5000 }
          );
        } else if (data.status === "failed") {
          console.error("❌ Recording failed:", data);
          
          // Check if it's just still processing
          if (pollCount < maxPolls) {
            console.log("⏳ Still processing, continuing to poll...");
            return;
          }
          
          clearInterval(pollRef.current!);
          setState("error");
          setError("Recording processing failed. Please try again.");
          toast.error("Recording failed to process");
        } else if (data.status === "processing") {
          console.log(`⏳ Still processing (${pollCount}/${maxPolls})...`);
          
          // Update progress message after 30 seconds
          if (pollCount === 10) {
            toast("⏳ Recording is processing. This may take up to a minute...", { 
              duration: 4000,
              icon: "⏳"
            });
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
        
        // Don't give up on first error
        if (pollCount < maxPolls) {
          console.log("Retrying...");
          return;
        }
        
        clearInterval(pollRef.current!);
        setState("error");
        setError("Failed to check recording status");
        toast.error("Failed to check recording status");
      }
    }, 3000); // Poll every 3 seconds
  }, [onRecordingComplete]);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const selectedPodcast = podcasts.find((p) => p.id === selectedPodcastId);

  // ── Start Recording ───────────────────────────────────────
  const handleStartRecording = useCallback(async () => {
    if (!selectedPodcastId || !selectedSeasonId || !episodeTitle.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setState("recording");
    setError(null);

    try {
      // 1. Pre-create the episode record
      const episodeRes = await fetch("/api/podcast/manage?type=episode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          podcastId: selectedPodcastId,
          seasonId: selectedSeasonId,
          title: episodeTitle.trim(),
          description: episodeDescription.trim() || undefined,
        }),
      });

      if (!episodeRes.ok) throw new Error("Failed to create episode record");
      const { episode } = await episodeRes.json();
      setCurrentEpisodeId(episode.id);

      // 2. Start LiveKit Egress recording
      const recordRes = await fetch("/api/podcast/recording", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          sessionId,
          episodeId: episode.id,
        }),
      });

      if (!recordRes.ok) throw new Error("Failed to start recording");
      const { egressId } = await recordRes.json();
      setCurrentEgressId(egressId);

      toast.success("🔴 Recording started!");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Failed to start recording");
      toast.error("Failed to start recording");
    }
  }, [selectedPodcastId, selectedSeasonId, episodeTitle, episodeDescription, sessionId]);

  // ── Stop Recording ────────────────────────────────────────
  const handleStopRecording = useCallback(async () => {
    if (!currentEgressId || !currentEpisodeId) return;
    setState("stopping");

    try {
      await fetch("/api/podcast/recording", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "stop",
          sessionId,
          episodeId: currentEpisodeId,
          egressId: currentEgressId,
        }),
      });

      setState("processing");
      toast("⏳ Saving and compressing your episode...", { duration: 4000 });
      startPolling(currentEpisodeId, currentEgressId);
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Failed to stop recording");
      toast.error("Failed to stop recording");
    }
  }, [currentEgressId, currentEpisodeId, sessionId, startPolling]);

  const handleReset = () => {
    setState("idle");
    setError(null);
    setCurrentEpisodeId(null);
    setCurrentEgressId(null);
    setEpisodeTitle("");
    setEpisodeDescription("");
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 3600).toString().padStart(2, "0")}:${Math.floor((s % 3600) / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  // ── IDLE: Show "Start Recording" button ───────────────────
  if (state === "idle") {
    return (
      <div className="border border-black dark:border-white border-opacity-20 dark:border-opacity-20 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-black dark:text-white flex items-center gap-2">
            <Mic className="w-4 h-4 text-[#EF3866]" />
            Record This Session
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
            ~14 MB/hour
          </span>
        </div>
        <p className="text-xs text-black dark:text-white opacity-50 mb-5">
          Save this live session as a podcast episode. Audio is compressed to Opus 32kbps for maximum storage efficiency.
        </p>
        <button
          onClick={() => setState("selecting")}
          className="w-full py-3 bg-[#EF3866] hover:bg-[#d12b56] text-white rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2"
        >
          <Circle className="w-4 h-4" />
          Set Up Recording
        </button>
      </div>
    );
  }

  // ── SELECTING: Episode details form ───────────────────────
  if (state === "selecting") {
    return (
      <div className="border border-[#EF3866] rounded-3xl p-6 space-y-5">
        <h3 className="text-base font-semibold text-black dark:text-white flex items-center gap-2">
          <Mic className="w-4 h-4 text-[#EF3866]" />
          Episode Details
        </h3>

        {podcasts.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-black dark:text-white opacity-60 mb-4">
              You don&apos;t have any podcasts yet.
            </p>
            <Link
              href="/home/podcast/create-podcast"
              className="inline-block px-6 py-3 bg-[#EF3866] text-white rounded-xl font-semibold hover:bg-[#d12b56] transition-colors"
            >
              Create Your First Podcast
            </Link>
          </div>
        ) : (
          <>
            {/* Podcast selector */}
            <div>
              <label className="block text-xs font-medium text-black dark:text-white mb-1.5">
                Podcast *
              </label>
              <div className="relative">
                <select
                  value={selectedPodcastId}
                  onChange={(e) => {
                    setSelectedPodcastId(e.target.value);
                    setSelectedSeasonId("");
                  }}
                  className="w-full appearance-none bg-transparent border border-black dark:border-white border-opacity-20 dark:border-opacity-20 rounded-xl px-4 py-3 text-sm text-black dark:text-white focus:outline-none focus:border-[#EF3866] pr-10"
                >
                  <option value="">Select a podcast</option>
                  {podcasts.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* "Create New" link */}
            <div className="text-right -mt-2">
              <Link
                href="/home/podcast/create-podcast"
                className="text-xs text-[#EF3866] hover:underline"
              >
                + Create new podcast
              </Link>
            </div>

            {/* Season selector */}
            {selectedPodcast && (
              <div>
                <label className="block text-xs font-medium text-black dark:text-white mb-1.5">
                  Season *
                </label>
                <div className="relative">
                  <select
                    value={selectedSeasonId}
                    onChange={(e) => setSelectedSeasonId(e.target.value)}
                    className="w-full appearance-none bg-transparent border border-black dark:border-white border-opacity-20 dark:border-opacity-20 rounded-xl px-4 py-3 text-sm text-black dark:text-white focus:outline-none focus:border-[#EF3866] pr-10"
                  >
                    <option value="">Select a season</option>
                    {selectedPodcast.seasons.map((s) => (
                      <option key={s.id} value={s.id}>
                        S{s.season_number}: {s.title}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Episode title */}
            <div>
              <label className="block text-xs font-medium text-black dark:text-white mb-1.5">
                Episode Title *
              </label>
              <input
                type="text"
                value={episodeTitle}
                onChange={(e) => setEpisodeTitle(e.target.value)}
                placeholder="e.g. Building in Public with AI"
                className="w-full bg-transparent border border-black dark:border-white border-opacity-20 dark:border-opacity-20 rounded-xl px-4 py-3 text-sm text-black dark:text-white placeholder-black placeholder-opacity-30 dark:placeholder-white dark:placeholder-opacity-30 focus:outline-none focus:border-[#EF3866]"
              />
            </div>

            {/* Episode description */}
            <div>
              <label className="block text-xs font-medium text-black dark:text-white mb-1.5">
                Description (optional)
              </label>
              <textarea
                value={episodeDescription}
                onChange={(e) => setEpisodeDescription(e.target.value)}
                placeholder="What will you discuss in this episode?"
                rows={2}
                className="w-full resize-none bg-transparent border border-black dark:border-white border-opacity-20 dark:border-opacity-20 rounded-xl px-4 py-3 text-sm text-black dark:text-white placeholder-black placeholder-opacity-30 dark:placeholder-white dark:placeholder-opacity-30 focus:outline-none focus:border-[#EF3866]"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={handleReset}
                className="flex-1 py-3 border border-black dark:border-white border-opacity-20 dark:border-opacity-20 rounded-xl text-sm font-medium text-black dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStartRecording}
                disabled={!selectedPodcastId || !selectedSeasonId || !episodeTitle.trim()}
                className="flex-1 py-3 bg-[#EF3866] hover:bg-[#d12b56] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Circle className="w-3.5 h-3.5 fill-white" />
                Start Recording
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // ── RECORDING: Live indicator + stop button ───────────────
  if (state === "recording") {
    return (
      <div className="border-2 border-[#EF3866] rounded-3xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-[#EF3866] rounded-full animate-pulse" />
            <span className="text-sm font-bold text-[#EF3866] uppercase tracking-wider">Recording</span>
          </div>
          <span className="font-mono text-lg font-bold text-black dark:text-white tabular-nums">
            {formatTime(recordingTime)}
          </span>
        </div>

        <div className="mb-5 text-sm text-black dark:text-white opacity-70">
          <p className="font-medium truncate">{episodeTitle}</p>
          <p className="text-xs opacity-60 mt-0.5">
            {selectedPodcast?.name} · S{selectedPodcast?.seasons.find((s) => s.id === selectedSeasonId)?.season_number}
          </p>
        </div>

        {/* Storage estimate */}
        <div className="mb-5 text-xs text-black dark:text-white opacity-40 flex items-center gap-1.5">
          <span>~{((recordingTime / 3600) * 14).toFixed(1)} MB used so far</span>
        </div>

        <button
          onClick={handleStopRecording}
          className="w-full py-3 bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-black rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <Square className="w-4 h-4 fill-current" />
          Stop & Save Episode
        </button>
      </div>
    );
  }

  // ── STOPPING / PROCESSING ─────────────────────────────────
  if (state === "stopping" || state === "processing") {
    return (
      <div className="border border-black dark:border-white border-opacity-20 dark:border-opacity-20 rounded-3xl p-6 text-center">
        <Loader2 className="w-8 h-8 text-[#EF3866] animate-spin mx-auto mb-3" />
        <p className="text-sm font-medium text-black dark:text-white mb-1">
          {state === "stopping" ? "Stopping recording..." : "Compressing & saving episode..."}
        </p>
        <p className="text-xs text-black dark:text-white opacity-50">
          {state === "processing"
            ? "Converting to Opus format. This may take a moment."
            : "Please wait..."}
        </p>
      </div>
    );
  }

  // ── DONE ─────────────────────────────────────────────────
  if (state === "done") {
    return (
      <div className="border border-green-500 rounded-3xl p-6 text-center bg-green-500/5">
        <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
          <Check className="w-5 h-5 text-green-500" />
        </div>
        <p className="text-sm font-medium text-black dark:text-white mb-1">Episode saved!</p>
        <p className="text-xs text-black dark:text-white opacity-50 mb-4">
          Your episode is now published on your podcast feed.
        </p>
        <button
          onClick={handleReset}
          className="text-sm text-[#EF3866] font-medium hover:underline"
        >
          Record another episode
        </button>
      </div>
    );
  }

  // ── ERROR ─────────────────────────────────────────────────
  return (
    <div className="border border-red-400 rounded-3xl p-6 text-center bg-red-500/5">
      <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
      <p className="text-sm font-medium text-black dark:text-white mb-1">Recording failed</p>
      <p className="text-xs text-red-500 mb-4">{error}</p>
      <button
        onClick={handleReset}
        className="py-2 px-6 bg-[#EF3866] text-white rounded-xl text-sm font-medium hover:bg-[#d12b56] transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}