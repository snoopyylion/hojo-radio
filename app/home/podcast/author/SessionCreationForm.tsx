// app/home/podcast/author/SessionCreationForm.tsx
"use client";
import { useState } from "react";
import { LiveSession, User } from "@/types/podcast";
import { Radio, Mic, Users, Clock, Lightbulb, AlertCircle } from "lucide-react";

interface Props {
  user: User;
  onCancel: () => void;
  onSessionCreated: (session: LiveSession) => void;
}

export default function SessionCreationForm({ user, onCancel, onSessionCreated }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  const handleCreateSession = async () => {
    if (!title.trim()) {
      setError("Please enter a session title");
      return;
    }

    setIsCreating(true);
    setError("");

    try {
      const response = await fetch("/api/podcast/create-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          authorId: user.id,
          authorName: user.name,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create session");
      }

      const { session } = await response.json();
      
      // Transform the database session to match our LiveSession type
      const liveSession: LiveSession = {
        id: session.id,
        authorId: session.author_id,
        authorName: session.author_name,
        title: session.title,
        description: session.description || "",
        roomName: session.room_name,
        startedAt: session.started_at,
        listenerCount: session.listener_count || 0,
        isActive: session.is_active,
      };

      onSessionCreated(liveSession);
    } catch (err) {
      console.error("Error creating session:", err);
      setError(err instanceof Error ? err.message : "Failed to create session");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="text-center border border-black dark:border-white rounded-3xl p-8">
        <div className="w-20 h-20 bg-[#EF3866] bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Radio className="w-10 h-10 text-[#EF3866]" />
        </div>
        
        <h1 className="text-3xl font-bold text-black dark:text-white mb-3">
          Start Your Live Podcast
        </h1>
        
        <p className="text-black dark:text-white opacity-70 max-w-md mx-auto">
          Set up your broadcast details and go live to connect with your audience instantly
        </p>

        <div className="flex items-center justify-center space-x-8 text-sm text-black dark:text-white opacity-60 mt-6">
          <div className="flex items-center space-x-2">
            <Mic className="w-4 h-4" />
            <span>Professional Audio</span>
          </div>
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>Live Audience</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4" />
            <span>Instant Start</span>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="border border-[#EF3866] rounded-3xl p-4 bg-[#EF3866] bg-opacity-5">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-[#EF3866] mr-3 flex-shrink-0" />
            <div className="text-[#EF3866] text-sm font-medium">{error}</div>
          </div>
        </div>
      )}

      {/* Form Section */}
      <div className="border border-black dark:border-white rounded-3xl p-8">
        <h3 className="text-lg font-semibold text-black dark:text-white mb-6 flex items-center">
          <Radio className="w-5 h-5 mr-3" />
          Session Details
        </h3>

        <div className="space-y-6">
          {/* Title Input */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-black dark:text-white mb-3">
              Session Title *
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What will you be discussing today?"
              className="w-full px-6 py-4 border border-black dark:border-white border-opacity-20 dark:border-opacity-20 rounded-2xl focus:border-[#EF3866] focus:outline-none bg-transparent text-black dark:text-white placeholder-black placeholder-opacity-40 dark:placeholder-white dark:placeholder-opacity-40 transition-all duration-200"
              maxLength={100}
              disabled={isCreating}
            />
            <div className="flex justify-between items-center mt-2">
              <div className="text-xs text-black dark:text-white opacity-40">
                Make it engaging and descriptive
              </div>
              <div className="text-xs text-black dark:text-white opacity-60">
                {title.length}/100
              </div>
            </div>
          </div>

          {/* Description Input */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-black dark:text-white mb-3">
              Description (Optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Give your listeners a preview of what to expect in this session..."
              rows={4}
              className="w-full px-6 py-4 border border-black dark:border-white border-opacity-20 dark:border-opacity-20 rounded-2xl focus:border-[#EF3866] focus:outline-none bg-transparent text-black dark:text-white placeholder-black placeholder-opacity-40 dark:placeholder-white dark:placeholder-opacity-40 transition-all duration-200 resize-none"
              maxLength={500}
              disabled={isCreating}
            />
            <div className="flex justify-between items-center mt-2">
              <div className="text-xs text-black dark:text-white opacity-40">
                Optional but recommended for better engagement
              </div>
              <div className="text-xs text-black dark:text-white opacity-60">
                {description.length}/500
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tips Section */}
      <div className="border border-black dark:border-white border-opacity-20 dark:border-opacity-20 rounded-3xl p-6">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-[#EF3866] bg-opacity-10 rounded-full flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-6 h-6 text-[#EF3866]" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-black dark:text-white mb-3">
              Tips for a Successful Live Session
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-black dark:text-white opacity-70">
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-[#EF3866] rounded-full mt-2 flex-shrink-0"></div>
                <span>Use clear, engaging titles</span>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-[#EF3866] rounded-full mt-2 flex-shrink-0"></div>
                <span>Test audio before going live</span>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-[#EF3866] rounded-full mt-2 flex-shrink-0"></div>
                <span>Prepare talking points</span>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-[#EF3866] rounded-full mt-2 flex-shrink-0"></div>
                <span>Upload intro music/jingles</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Host Info */}
      <div className="border border-black dark:border-white border-opacity-10 dark:border-opacity-10 rounded-3xl p-6">
        <div className="text-center">
          <div className="text-sm font-medium text-black dark:text-white mb-2">
            Broadcasting as
          </div>
          <div className="text-lg font-bold text-black dark:text-white">
            {user.name}
          </div>
          <div className="text-sm text-black dark:text-white opacity-60 mt-2">
            Listeners will see this as the host name
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-4">
        <button
          onClick={onCancel}
          disabled={isCreating}
          className="flex-1 px-8 py-4 border border-black dark:border-white rounded-full font-semibold text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          Cancel
        </button>
        
        <button
          onClick={handleCreateSession}
          disabled={isCreating || !title.trim()}
          className="flex-1 px-8 py-4 bg-[#EF3866] hover:bg-[#d12b56] text-white rounded-full font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
        >
          {isCreating ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
              Setting up studio...
            </>
          ) : (
            <>
              <div className="w-3 h-3 bg-white rounded-full mr-3"></div>
              Go Live
            </>
          )}
        </button>
      </div>
    </div>
  );
}