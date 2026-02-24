"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mic, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@clerk/nextjs";

interface Podcast {
    id: string;
    name: string;
    total_episodes?: number;
}

interface Season {
    id: string;
    season_number: number;
    title: string;
}

export default function CreatePodcastPage() {
    const router = useRouter();
    const { userId } = useAuth();

    const [step, setStep] = useState(1); // 1: podcast/season selection, 2: episode details
    const [podcasts, setPodcasts] = useState<Podcast[]>([]);
    const [selectedPodcastId, setSelectedPodcastId] = useState("");
    const [seasons, setSeasons] = useState<Season[]>([]);
    const [selectedSeasonId, setSelectedSeasonId] = useState("");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    // Fetch user's podcasts on mount
    useEffect(() => {
        if (userId) {
            fetch(`/api/podcast/manage?type=podcasts&authorId=${userId}`)
                .then(r => r.json())
                .then(data => setPodcasts(data.podcasts || []))
                .catch(console.error);
        }
    }, [userId]); // Add userId as dependency

    const handlePodcastSelect = async (podcastId: string) => {
        setSelectedPodcastId(podcastId);
        const res = await fetch(`/api/podcast/manage?type=seasons&podcastId=${podcastId}`);
        const data = await res.json();
        setSeasons(data.seasons || []);
        setStep(2);
    };

    const handleCreateEpisode = async () => {
        if (!title.trim()) {
            toast.error("Please enter an episode title");
            return;
        }

        setIsCreating(true);
        try {
            const response = await fetch("/api/podcast/manage?type=episode", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    podcastId: selectedPodcastId,
                    seasonId: selectedSeasonId,
                    title: title.trim(),
                    description: description.trim() || undefined,
                }),
            });

            if (!response.ok) throw new Error("Failed to create episode");

            const { episode } = await response.json();

            // Get the podcast slug
            const podcastRes = await fetch(`/api/podcast/manage?type=podcast&id=${selectedPodcastId}`);
            const podcastData = await podcastRes.json();
            const slug = podcastData.podcast?.slug || selectedPodcastId;

            toast.success("Episode created! Now upload your audio.");
            router.push(`/home/podcast/${slug}/episode/${episode.id}/upload`);
        } catch {
            toast.error("Failed to create episode");
        } finally {
            setIsCreating(false);
        }
    };

    if (step === 1) {
        return (
            <div className="min-h-screen bg-white dark:bg-black py-12 px-4">
                <div className="max-w-2xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <h1 className="text-3xl font-bold">Create New Episode</h1>
                        <Link
                            href="/home/podcast/create-podcast"
                            className="px-4 py-2 bg-[#EF3866] text-white rounded-full text-sm font-semibold hover:bg-[#d12b56] transition-colors"
                        >
                            + New Podcast
                        </Link>
                    </div>
                    
                    <div className="border border-black dark:border-white rounded-3xl p-6">
                        <h2 className="text-lg font-semibold mb-4">Select a Podcast</h2>
                        {podcasts.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-sm opacity-60 mb-4">You don&apos;t have any podcasts yet.</p>
                                <Link
                                    href="/home/podcast/create-podcast"
                                    className="inline-block px-6 py-3 bg-[#EF3866] text-white rounded-full font-semibold hover:bg-[#d12b56] transition-colors"
                                >
                                    Create Your First Podcast
                                </Link>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-3 mb-4">
                                    {podcasts.map((podcast) => (
                                        <button
                                            key={podcast.id}
                                            onClick={() => handlePodcastSelect(podcast.id)}
                                            className="w-full p-4 border border-black dark:border-white rounded-xl hover:border-[#EF3866] transition-colors text-left"
                                        >
                                            <h3 className="font-semibold">{podcast.name}</h3>
                                            <p className="text-sm opacity-60">{podcast.total_episodes || 0} episodes</p>
                                        </button>
                                    ))}
                                </div>
                                <div className="text-center pt-4 border-t border-black dark:border-white border-opacity-10">
                                    <Link
                                        href="/home/podcast/create-podcast"
                                        className="text-sm text-[#EF3866] hover:underline"
                                    >
                                        + Create a new podcast
                                    </Link>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white dark:bg-black py-12 px-4">
            <div className="max-w-2xl mx-auto space-y-6">
                <button onClick={() => setStep(1)} className="text-sm opacity-60 hover:opacity-100">
                    ← Back to podcasts
                </button>

                <h1 className="text-3xl font-bold">Episode Details</h1>

                <div className="border border-black dark:border-white rounded-3xl p-6 space-y-5">
                    <div>
                        <label className="block text-xs font-medium mb-2">Season *</label>
                        <select
                            value={selectedSeasonId}
                            onChange={(e) => setSelectedSeasonId(e.target.value)}
                            className="w-full px-4 py-3 border border-black dark:border-white rounded-xl bg-transparent"
                        >
                            <option value="">Select a season</option>
                            {seasons.map((s) => (
                                <option key={s.id} value={s.id}>
                                    S{s.season_number}: {s.title}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium mb-2">Episode Title *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-3 border border-black dark:border-white rounded-xl bg-transparent"
                            placeholder="Episode 1: The Beginning"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium mb-2">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={4}
                            className="w-full px-4 py-3 border border-black dark:border-white rounded-xl bg-transparent resize-none"
                            placeholder="What's this episode about?"
                        />
                    </div>

                    <button
                        onClick={handleCreateEpisode}
                        disabled={isCreating || !selectedSeasonId || !title.trim()}
                        className="w-full py-3 bg-[#EF3866] text-white rounded-xl font-semibold hover:bg-[#d12b56] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                    >
                        {isCreating ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            <>
                                <Mic className="w-4 h-4" />
                                Create & Upload Episode
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}