// app/home/podcast/author/SessionCreationForm.tsx
"use client";
import { useState } from "react";
import { LiveSession, User } from "@/types/podcast";

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
    <div className="max-w-2xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎙️</div>
          <h1 className="text-3xl font-bold mb-2">Start Your Live Podcast</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Fill out the details below to go live and connect with your audience
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="text-red-400 mr-3">⚠️</div>
              <div className="text-red-700 dark:text-red-300 text-sm">{error}</div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-2">
              Session Title *
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What will you be talking about today?"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              maxLength={100}
              disabled={isCreating}
            />
            <div className="text-xs text-gray-500 mt-1">
              {title.length}/100 characters
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-2">
              Description (Optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Give your listeners a preview of what to expect..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
              maxLength={500}
              disabled={isCreating}
            />
            <div className="text-xs text-gray-500 mt-1">
              {description.length}/500 characters
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start">
              <div className="text-blue-500 mr-3 mt-0.5">💡</div>
              <div className="text-sm">
                <div className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                  Tips for a great live session:
                </div>
                <ul className="text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• Use a clear, engaging title that describes your topic</li>
                  <li>• Test your microphone before going live</li>
                  <li>• Have a rough outline of what you want to discuss</li>
                  <li>• Engage with your listeners through the chat</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex space-x-4 pt-4">
            <button
              onClick={onCancel}
              disabled={isCreating}
              className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateSession}
              disabled={isCreating || !title.trim()}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg hover:from-pink-700 hover:to-purple-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
            >
              {isCreating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  🔴 Go Live
                </>
              )}
            </button>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="text-center text-sm text-gray-500">
            <p>Host: <span className="font-medium">{user.name}</span></p>
            <p className="mt-1">Once you go live, listeners can join your session instantly</p>
          </div>
        </div>
      </div>
    </div>
  );
}