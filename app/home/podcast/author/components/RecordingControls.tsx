// app/home/podcast/author/components/RecordingControls.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Circle, Square, Loader2, Mic, AlertCircle, Check, ChevronDown, Radio } from "lucide-react";
import toast from "react-hot-toast";

interface RecordingControlsProps {
  sessionId: string;
  userId: string;
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

// ── Shared panel shell ────────────────────────────────────────────────────────
function Panel({
  children,
  accent = false,
  color,
}: {
  children: React.ReactNode;
  accent?: boolean;
  color?: "pink" | "green" | "red";
}) {
  const borderClass =
    color === "green" ? "border-emerald-500/40 bg-emerald-500/4" :
    color === "red"   ? "border-red-500/40 bg-red-500/4" :
    accent            ? "border-[#EF3866]/50 bg-[#EF3866]/3" :
                        "border-black/10 dark:border-white/10 bg-white dark:bg-black";
  return (
    <div className={`border rounded-2xl overflow-hidden ${borderClass}`}>
      {children}
    </div>
  );
}

// ── Shared label ──────────────────────────────────────────────────────────────
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block font-sora text-[10px] font-semibold uppercase tracking-widest text-black/40 dark:text-white/40 mb-1.5">
      {children}
    </label>
  );
}

// ── Shared select ─────────────────────────────────────────────────────────────
function StyledSelect({
  value,
  onChange,
  placeholder,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none bg-transparent border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 font-sora text-sm text-black dark:text-white focus:outline-none focus:border-[#EF3866] pr-9 transition-colors"
      >
        <option value="">{placeholder}</option>
        {children}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/30 dark:text-white/30 pointer-events-none" />
    </div>
  );
}

export function RecordingControls({ sessionId, userId, onRecordingComplete }: RecordingControlsProps) {
  const [state, setState] = useState<RecordingState>("idle");
  const [podcasts, setPodcasts] = useState<PodcastOption[]>([]);
  const [selectedPodcastId, setSelectedPodcastId] = useState("");
  const [selectedSeasonId, setSelectedSeasonId] = useState("");
  const [episodeTitle, setEpisodeTitle] = useState("");
  const [episodeDescription, setEpisodeDescription] = useState("");
  const [currentEpisodeId, setCurrentEpisodeId] = useState<string | null>(null);
  const [currentEgressId, setCurrentEgressId] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  useEffect(() => {
    if (state === "processing") {
      const id = setTimeout(() => toast("⏳ Still processing… large recordings take longer", { duration: 5000 }), 15000);
      return () => clearTimeout(id);
    }
  }, [state]);

  useEffect(() => {
    fetch(`/api/podcast/manage?type=podcasts&authorId=${userId}`)
      .then(r => r.json())
      .then(async ({ podcasts: list }) => {
        if (!list?.length) return;
        const enriched: PodcastOption[] = await Promise.all(
          list.map(async (p: { id: string; name: string }) => {
            const { seasons } = await fetch(`/api/podcast/manage?type=seasons&podcastId=${p.id}`).then(r => r.json());
            return { id: p.id, name: p.name, seasons: seasons || [] };
          })
        );
        setPodcasts(enriched);
        if (enriched.length === 1) {
          setSelectedPodcastId(enriched[0].id);
          if (enriched[0].seasons.length === 1) setSelectedSeasonId(enriched[0].seasons[0].id);
        }
      })
      .catch(console.error);
  }, [userId]);

  useEffect(() => {
    if (state === "recording") {
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (state === "idle" || state === "selecting") setRecordingTime(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [state]);

  const startPolling = useCallback((episodeId: string, egressId: string) => {
    let count = 0;
    const max = 60;
    pollRef.current = setInterval(async () => {
      count++;
      try {
        const res = await fetch(`/api/podcast/recording?egressId=${egressId}&episodeId=${episodeId}`);
        const data = await res.json();
        if (data.status === "complete") {
          clearInterval(pollRef.current!);
          setState("done");
          onRecordingComplete?.(episodeId);
          toast.success(`🎙️ Episode saved!${data.fileSizeMB ? ` (${data.fileSizeMB} MB)` : ""}`, { duration: 5000 });
        } else if (data.status === "failed" && count >= max) {
          clearInterval(pollRef.current!);
          setState("error");
          setError("Recording processing failed. Please try again.");
          toast.error("Recording failed to process");
        } else if (data.status === "processing" && count === 10) {
          toast("⏳ Recording is processing. This may take up to a minute…", { duration: 4000 });
        }
      } catch {
        if (count >= max) {
          clearInterval(pollRef.current!);
          setState("error");
          setError("Failed to check recording status");
        }
      }
    }, 3000);
  }, [onRecordingComplete]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const selectedPodcast = podcasts.find(p => p.id === selectedPodcastId);

  const handleStartRecording = useCallback(async () => {
    if (!selectedPodcastId || !selectedSeasonId || !episodeTitle.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    setState("recording");
    setError(null);
    try {
      const episodeRes = await fetch("/api/podcast/manage?type=episode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ podcastId: selectedPodcastId, seasonId: selectedSeasonId, title: episodeTitle.trim(), description: episodeDescription.trim() || undefined }),
      });
      if (!episodeRes.ok) throw new Error("Failed to create episode record");
      const { episode } = await episodeRes.json();
      setCurrentEpisodeId(episode.id);

      const recordRes = await fetch("/api/podcast/recording", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", sessionId, episodeId: episode.id }),
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

  const handleStopRecording = useCallback(async () => {
    if (!currentEgressId || !currentEpisodeId) return;
    setState("stopping");
    try {
      await fetch("/api/podcast/recording", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop", sessionId, episodeId: currentEpisodeId, egressId: currentEgressId }),
      });
      setState("processing");
      toast("⏳ Saving and compressing your episode…", { duration: 4000 });
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

  // ── IDLE ─────────────────────────────────────────────────────────────────────
  if (state === "idle") {
    return (
      <Panel>
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#EF3866]/10 rounded-xl flex items-center justify-center">
              <Mic className="w-4 h-4 text-[#EF3866]" />
            </div>
            <h3 className="font-sora font-semibold text-sm text-black dark:text-white">Record Session</h3>
          </div>
          <span className="font-sora text-[10px] font-medium text-black/35 dark:text-white/35 bg-black/5 dark:bg-white/5 px-2.5 py-1 rounded-full">
            ~14 MB / hr
          </span>
        </div>
        <div className="px-5 py-4">
          <p className="font-sora text-xs text-black/50 dark:text-white/50 leading-relaxed mb-4">
            Save this live session as a podcast episode. Audio is compressed to Opus 32 kbps for maximum storage efficiency.
          </p>
          <button
            onClick={() => setState("selecting")}
            className="w-full py-2.5 bg-[#EF3866] hover:bg-[#d12b56] text-white font-sora text-sm font-semibold rounded-xl transition-all duration-200 active:scale-[0.98] shadow-md shadow-[#EF3866]/20 flex items-center justify-center gap-2"
          >
            <Circle className="w-3.5 h-3.5" />
            Set Up Recording
          </button>
        </div>
      </Panel>
    );
  }

  // ── SELECTING ────────────────────────────────────────────────────────────────
  if (state === "selecting") {
    return (
      <Panel accent>
        {/* Header */}
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[#EF3866]/15">
          <div className="w-8 h-8 bg-[#EF3866]/10 rounded-xl flex items-center justify-center">
            <Mic className="w-4 h-4 text-[#EF3866]" />
          </div>
          <h3 className="font-sora font-semibold text-sm text-black dark:text-white">Episode Details</h3>
        </div>

        <div className="px-5 py-4 space-y-4">
          {podcasts.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-10 h-10 bg-black/5 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Mic className="w-5 h-5 text-black/20 dark:text-white/20" />
              </div>
              <p className="font-sora text-sm font-medium text-black/50 dark:text-white/50 mb-1">No podcasts yet</p>
              <p className="font-sora text-xs text-black/30 dark:text-white/30 mb-4">Create a podcast to start recording</p>
              <Link
                href="/home/podcast/create-podcast"
                className="inline-block px-5 py-2.5 bg-[#EF3866] text-white font-sora text-sm font-semibold rounded-xl hover:bg-[#d12b56] transition-colors"
              >
                Create Your First Podcast
              </Link>
            </div>
          ) : (
            <>
              {/* Podcast */}
              <div>
                <FieldLabel>Podcast *</FieldLabel>
                <StyledSelect
                  value={selectedPodcastId}
                  onChange={(v) => { setSelectedPodcastId(v); setSelectedSeasonId(""); }}
                  placeholder="Select a podcast"
                >
                  {podcasts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </StyledSelect>
                <div className="text-right mt-1.5">
                  <Link href="/home/podcast/create-podcast" className="font-sora text-[11px] text-[#EF3866] hover:underline">
                    + Create new podcast
                  </Link>
                </div>
              </div>

              {/* Season */}
              {selectedPodcast && (
                <div>
                  <FieldLabel>Season *</FieldLabel>
                  <StyledSelect value={selectedSeasonId} onChange={setSelectedSeasonId} placeholder="Select a season">
                    {selectedPodcast.seasons.map(s => (
                      <option key={s.id} value={s.id}>S{s.season_number}: {s.title}</option>
                    ))}
                  </StyledSelect>
                </div>
              )}

              {/* Episode title */}
              <div>
                <FieldLabel>Episode Title *</FieldLabel>
                <input
                  type="text"
                  value={episodeTitle}
                  onChange={(e) => setEpisodeTitle(e.target.value)}
                  placeholder="e.g. Building in Public with AI"
                  className="w-full bg-transparent border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 font-sora text-sm text-black dark:text-white placeholder-black/25 dark:placeholder-white/25 focus:outline-none focus:border-[#EF3866] transition-colors"
                />
              </div>

              {/* Description */}
              <div>
                <FieldLabel>Description <span className="normal-case font-normal">(optional)</span></FieldLabel>
                <textarea
                  value={episodeDescription}
                  onChange={(e) => setEpisodeDescription(e.target.value)}
                  placeholder="What will you discuss in this episode?"
                  rows={2}
                  className="w-full resize-none bg-transparent border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 font-sora text-sm text-black dark:text-white placeholder-black/25 dark:placeholder-white/25 focus:outline-none focus:border-[#EF3866] transition-colors"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2.5 pt-1">
                <button
                  onClick={handleReset}
                  className="flex-1 py-2.5 border border-black/10 dark:border-white/10 rounded-xl font-sora text-sm font-medium text-black/60 dark:text-white/60 hover:border-black/20 dark:hover:border-white/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartRecording}
                  disabled={!selectedPodcastId || !selectedSeasonId || !episodeTitle.trim()}
                  className="flex-1 py-2.5 bg-[#EF3866] hover:bg-[#d12b56] disabled:opacity-40 disabled:cursor-not-allowed text-white font-sora text-sm font-semibold rounded-xl transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Circle className="w-3.5 h-3.5 fill-white" />
                  Start Recording
                </button>
              </div>
            </>
          )}
        </div>
      </Panel>
    );
  }

  // ── RECORDING ────────────────────────────────────────────────────────────────
  if (state === "recording") {
    return (
      <Panel accent>
        {/* Live header bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EF3866]/15">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#EF3866] opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#EF3866]" />
            </span>
            <span className="font-sora text-xs font-bold text-[#EF3866] uppercase tracking-widest">Recording</span>
          </div>
          {/* Timer */}
          <span className="font-mono text-xl font-bold text-black dark:text-white tabular-nums tracking-tight">
            {formatTime(recordingTime)}
          </span>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Episode info */}
          <div className="p-3 bg-black/3 dark:bg-white/3 border border-black/8 dark:border-white/8 rounded-xl">
            <p className="font-sora text-sm font-semibold text-black dark:text-white truncate">{episodeTitle}</p>
            <p className="font-sora text-xs text-black/40 dark:text-white/40 mt-0.5">
              {selectedPodcast?.name}
              {selectedPodcast && " · "}
              S{selectedPodcast?.seasons.find(s => s.id === selectedSeasonId)?.season_number}
            </p>
          </div>

          {/* Storage estimate */}
          <div className="flex items-center justify-between font-sora text-[11px] text-black/30 dark:text-white/30">
            <span>Storage used</span>
            <span>~{((recordingTime / 3600) * 14).toFixed(2)} MB</span>
          </div>

          {/* Stop button */}
          <button
            onClick={handleStopRecording}
            className="w-full py-2.5 bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-black font-sora text-sm font-semibold rounded-xl transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            Stop & Save Episode
          </button>
        </div>
      </Panel>
    );
  }

  // ── STOPPING / PROCESSING ────────────────────────────────────────────────────
  if (state === "stopping" || state === "processing") {
    return (
      <Panel>
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-black/5 dark:border-white/5">
          <div className="w-8 h-8 bg-[#EF3866]/10 rounded-xl flex items-center justify-center">
            <Radio className="w-4 h-4 text-[#EF3866]" />
          </div>
          <h3 className="font-sora font-semibold text-sm text-black dark:text-white">
            {state === "stopping" ? "Stopping…" : "Processing…"}
          </h3>
        </div>
        <div className="flex flex-col items-center py-8 px-5 text-center">
          <Loader2 className="w-7 h-7 text-[#EF3866] animate-spin mb-3" />
          <p className="font-sora text-sm font-medium text-black dark:text-white mb-1">
            {state === "stopping" ? "Stopping recording" : "Compressing & saving episode"}
          </p>
          <p className="font-sora text-xs text-black/40 dark:text-white/40">
            {state === "processing" ? "Converting to Opus format. This may take a moment." : "Please wait…"}
          </p>
          {state === "processing" && (
            <div className="mt-4 w-full bg-black/5 dark:bg-white/5 rounded-full h-1 overflow-hidden">
              <div className="h-full bg-[#EF3866] rounded-full animate-pulse w-2/3" />
            </div>
          )}
        </div>
      </Panel>
    );
  }

  // ── DONE ─────────────────────────────────────────────────────────────────────
  if (state === "done") {
    return (
      <Panel color="green">
        <div className="flex flex-col items-center py-8 px-5 text-center">
          <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-3">
            <Check className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="font-sora text-sm font-semibold text-black dark:text-white mb-1">Episode saved!</p>
          <p className="font-sora text-xs text-black/40 dark:text-white/40 mb-5 leading-relaxed">
            Your episode is now published on your podcast feed.
          </p>
          <button
            onClick={handleReset}
            className="px-5 py-2 border border-[#EF3866]/30 text-[#EF3866] font-sora text-xs font-semibold rounded-xl hover:bg-[#EF3866] hover:text-white transition-all duration-200"
          >
            Record Another Episode
          </button>
        </div>
      </Panel>
    );
  }

  // ── ERROR ─────────────────────────────────────────────────────────────────────
  return (
    <Panel color="red">
      <div className="flex flex-col items-center py-8 px-5 text-center">
        <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center mb-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
        </div>
        <p className="font-sora text-sm font-semibold text-black dark:text-white mb-1">Recording failed</p>
        <p className="font-sora text-xs text-red-500/80 mb-5 leading-relaxed max-w-xs">{error}</p>
        <button
          onClick={handleReset}
          className="px-5 py-2 bg-[#EF3866] text-white font-sora text-xs font-semibold rounded-xl hover:bg-[#d12b56] transition-colors"
        >
          Try Again
        </button>
      </div>
    </Panel>
  );
}