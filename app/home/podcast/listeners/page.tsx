"use client";

import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";

export default function ListenerPage({ token }: { token: string }) {
  return (
    <div className="p-6 max-w-lg mx-auto bg-white dark:bg-black rounded-2xl shadow-lg space-y-4">
      <h2 className="text-2xl font-bold text-center">🎧 Listening to Hojo Live</h2>

      <LiveKitRoom
        token={token}
        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
        connect={true}
      >
        {/* Plays all audio tracks from remote participants */}
        <RoomAudioRenderer />
      </LiveKitRoom>

      <p className="text-center text-sm text-gray-600 dark:text-gray-300">
        You’re now connected. Sit back and enjoy the live podcast.
      </p>
    </div>
  );
}
