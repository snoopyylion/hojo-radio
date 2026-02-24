// app/home/podcast/author/UnifiedSessionForm.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Radio, Upload, Loader2, Calendar, Clock, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";
import { User, LiveSession } from "@/types/podcast";

interface UnifiedSessionFormProps {
  user: User;
  onCancel: () => void;
  onSessionCreated?: (session: LiveSession) => void;
  onEpisodeCreated?: (episodeId: string) => void;
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

export default function UnifiedSessionForm({ 
  user, 
  onCancel, 
  onSessionCreated,
  onEpisodeCreated 
}: UnifiedSessionFormProps) {
  const router = useRouter();
  
  // Session type
  const [sessionType, setSessionType] = useState<'live' | 'recorded'>('live');
  
  // Common fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  
  // Live session specific
  const [recordLiveSession, setRecordLiveSession] = useState(true);
  const [isPublic, setIsPublic] = useState(true);
  
  // Recorded episode specific
  const [podcasts, setPodcasts] = useState<PodcastOption[]>([]);
  const [selectedPodcastId, setSelectedPodcastId] = useState("");
  const [selectedSeasonId, setSelectedSeasonId] = useState("");
  const [scheduleForLater, setScheduleForLater] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  
  // Fetch user's podcasts for recorded episodes
  useEffect(() => {
    if (sessionType === 'recorded') {
      fetch(`/api/podcast/manage?type=podcasts&authorId=${user.id}`)
        .then(r => r.json())
        .then(async ({ podcasts: list }) => {
          if (!list?.length) return;
          
          const enriched: PodcastOption[] = await Promise.all(
            list.map(async (p: { id: string; name: string }) => {
              const { seasons } = await fetch(
                `/api/podcast/manage?type=seasons&podcastId=${p.id}`
              ).then(r => r.json());
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
    }
  }, [sessionType, user.id]);

  const selectedPodcast = podcasts.find(p => p.id === selectedPodcastId);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    if (sessionType === 'recorded' && (!selectedPodcastId || !selectedSeasonId)) {
      toast.error("Please select a podcast and season");
      return;
    }

    setIsCreating(true);

    try {
      if (sessionType === 'live') {
        // Create live session
        const response = await fetch('/api/podcast/create-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            recordSession: recordLiveSession,
            isPublic
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create session');
        }

        const { session } = await response.json();
        toast.success('🎙️ Live session started!');
        
        if (recordLiveSession) {
          toast('Recording will begin automatically when you go live', { duration: 4000 });
        }
        
        onSessionCreated?.(session);
      } else {
        // Create recorded episode
        if (scheduleForLater && (!scheduledDate || !scheduledTime)) {
          toast.error("Please select date and time for scheduling");
          setIsCreating(false);
          return;
        }

        const response = await fetch('/api/podcast/manage?type=episode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            podcastId: selectedPodcastId,
            seasonId: selectedSeasonId,
            title: title.trim(),
            description: description.trim(),
            scheduledFor: scheduleForLater ? `${scheduledDate}T${scheduledTime}` : null
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create episode');
        }

        const { episode } = await response.json();
        
        if (scheduleForLater) {
          toast.success('📅 Episode scheduled!');
        } else {
          toast.success('📝 Episode created! You can now upload audio');
        }
        
        onEpisodeCreated?.(episode.id);
        router.push(`/home/podcast/episode/${episode.id}/upload`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Session Type Toggle */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 dark:bg-gray-900 rounded-2xl">
        <button
          onClick={() => setSessionType('live')}
          className={`py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
            sessionType === 'live' 
              ? 'bg-[#EF3866] text-white shadow-lg' 
              : 'text-black dark:text-white opacity-60 hover:opacity-100'
          }`}
        >
          <Radio className="w-4 h-4" />
          Go Live Now
        </button>
        <button
          onClick={() => setSessionType('recorded')}
          className={`py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
            sessionType === 'recorded' 
              ? 'bg-[#EF3866] text-white shadow-lg' 
              : 'text-black dark:text-white opacity-60 hover:opacity-100'
          }`}
        >
          <Upload className="w-4 h-4" />
          Upload Later
        </button>
      </div>

      {/* Common Fields */}
      <div className="border border-black dark:border-white border-opacity-10 rounded-3xl p-6 space-y-5">
        <h2 className="text-lg font-semibold text-black dark:text-white">
          {sessionType === 'live' ? 'Live Session Details' : 'Episode Details'}
        </h2>

        <div>
          <label className="block text-xs font-medium text-black dark:text-white mb-2">
            Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={sessionType === 'live' ? "Live Q&A: Behind the Scenes" : "Episode 1: The Journey Begins"}
            maxLength={100}
            className="w-full bg-transparent border border-black dark:border-white border-opacity-20 rounded-xl px-4 py-3 text-black dark:text-white placeholder-black placeholder-opacity-30 focus:outline-none focus:border-[#EF3866] transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-black dark:text-white mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={sessionType === 'live' ? "What will you discuss in this live session?" : "What's this episode about?"}
            rows={3}
            maxLength={500}
            className="w-full resize-none bg-transparent border border-black dark:border-white border-opacity-20 rounded-xl px-4 py-3 text-black dark:text-white placeholder-black placeholder-opacity-30 focus:outline-none focus:border-[#EF3866] transition-colors"
          />
        </div>
      </div>

      {/* Live Session Options */}
      {sessionType === 'live' && (
        <div className="border border-black dark:border-white border-opacity-10 rounded-3xl p-6 space-y-4">
          <h3 className="font-medium text-black dark:text-white">Live Options</h3>
          
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-black dark:text-white">Public Session</span>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4 text-[#EF3866] rounded"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-black dark:text-white">Record this session</span>
            <input
              type="checkbox"
              checked={recordLiveSession}
              onChange={(e) => setRecordLiveSession(e.target.checked)}
              className="w-4 h-4 text-[#EF3866] rounded"
            />
          </label>

          {recordLiveSession && (
            <p className="text-xs text-black dark:text-white opacity-50 mt-2">
              Recording will be saved as an episode after your session ends
            </p>
          )}
        </div>
      )}

      {/* Recorded Episode Options */}
      {sessionType === 'recorded' && (
        <div className="border border-black dark:border-white border-opacity-10 rounded-3xl p-6 space-y-5">
          <h3 className="font-medium text-black dark:text-white">Podcast Details</h3>

          {podcasts.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-black dark:text-white opacity-60 mb-3">
                You don&apos;t have a podcast yet.
              </p>
              <a
                href="/home/podcast/create"
                className="text-sm text-[#EF3866] underline"
              >
                Create your first podcast →
              </a>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-black dark:text-white mb-2">
                  Podcast *
                </label>
                <div className="relative">
                  <select
                    value={selectedPodcastId}
                    onChange={(e) => {
                      setSelectedPodcastId(e.target.value);
                      setSelectedSeasonId("");
                    }}
                    className="w-full appearance-none bg-transparent border border-black dark:border-white border-opacity-20 rounded-xl px-4 py-3 text-sm text-black dark:text-white focus:outline-none focus:border-[#EF3866] pr-10"
                  >
                    <option value="">Select a podcast</option>
                    {podcasts.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {selectedPodcast && (
                <div>
                  <label className="block text-xs font-medium text-black dark:text-white mb-2">
                    Season *
                  </label>
                  <div className="relative">
                    <select
                      value={selectedSeasonId}
                      onChange={(e) => setSelectedSeasonId(e.target.value)}
                      className="w-full appearance-none bg-transparent border border-black dark:border-white border-opacity-20 rounded-xl px-4 py-3 text-sm text-black dark:text-white focus:outline-none focus:border-[#EF3866] pr-10"
                    >
                      <option value="">Select a season</option>
                      {selectedPodcast.seasons.map(s => (
                        <option key={s.id} value={s.id}>
                          S{s.season_number}: {s.title}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-black dark:border-white border-opacity-10">
                <label className="flex items-center gap-3 cursor-pointer mb-4">
                  <input
                    type="checkbox"
                    checked={scheduleForLater}
                    onChange={(e) => setScheduleForLater(e.target.checked)}
                    className="w-4 h-4 text-[#EF3866] rounded"
                  />
                  <span className="text-sm text-black dark:text-white">Schedule for later</span>
                </label>

                {scheduleForLater && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-black dark:text-white mb-2">
                        Date
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="date"
                          value={scheduledDate}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full bg-transparent border border-black dark:border-white border-opacity-20 rounded-xl pl-10 pr-4 py-3 text-sm text-black dark:text-white focus:outline-none focus:border-[#EF3866]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-black dark:text-white mb-2">
                        Time
                      </label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="time"
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                          className="w-full bg-transparent border border-black dark:border-white border-opacity-20 rounded-xl pl-10 pr-4 py-3 text-sm text-black dark:text-white focus:outline-none focus:border-[#EF3866]"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          disabled={isCreating}
          className="flex-1 py-3.5 border border-black dark:border-white border-opacity-20 rounded-full font-semibold text-black dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={isCreating || !title.trim() || (sessionType === 'recorded' && (!selectedPodcastId || !selectedSeasonId))}
          className="flex-1 py-3.5 bg-[#EF3866] hover:bg-[#d12b56] disabled:opacity-50 text-white rounded-full font-semibold transition-colors flex items-center justify-center gap-2 shadow-lg"
        >
          {isCreating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {sessionType === 'live' ? 'Starting...' : 'Creating...'}
            </>
          ) : (
            <>
              {sessionType === 'live' ? <Radio className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
              {sessionType === 'live' ? 'Go Live' : 'Create Episode'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}