// app/home/podcast/episode/[episodeId]/upload/EpisodeUploadForm.tsx
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, Mic, Check } from "lucide-react";
import toast from "react-hot-toast";

interface Episode {
  id: string;
  title: string;
  episode_number: number;
  podcast: {
    name: string;
    slug: string;
  };
  season: {
    season_number: number;
    title: string;
  };
}

export default function EpisodeUploadForm({ episode }: { episode: Episode }) {
  const router = useRouter();
  const audioInputRef = useRef<HTMLInputElement>(null);
  
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioName, setAudioName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleAudioSelect = (file: File) => {
    if (!file.type.startsWith("audio/")) {
      toast.error("Please select an audio file");
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      toast.error("Audio must be under 500MB");
      return;
    }
    setAudioFile(file);
    setAudioName(file.name);
  };

  const handleUpload = async () => {
    if (!audioFile) {
      toast.error("Please select an audio file");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("audio", audioFile);
    formData.append("episodeId", episode.id);

    try {
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          setUploadProgress(Math.round((e.loaded * 100) / e.total));
        }
      });

      await new Promise((resolve, reject) => {
        xhr.open("POST", "/api/podcast/episode/upload");
        xhr.onload = () => {
          if (xhr.status === 200) {
            resolve(JSON.parse(xhr.response));
          } else {
            reject(new Error("Upload failed"));
          }
        };
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.send(formData);
      });

      toast.success("Episode uploaded successfully!");
      router.push(`/home/podcast/${episode.podcast.slug}/episode/${episode.id}`);
    } catch {
      toast.error("Failed to upload episode");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
        
        <div className="text-center">
          <div className="w-16 h-16 bg-[#EF3866]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mic className="w-8 h-8 text-[#EF3866]" />
          </div>
          <h1 className="text-3xl font-bold text-black dark:text-white">
            Upload Episode Audio
          </h1>
          <p className="text-sm text-black dark:text-white opacity-60 mt-2">
            {episode.podcast.name} · S{episode.season.season_number}: {episode.season.title} · Ep {episode.episode_number}
          </p>
          <p className="text-lg font-medium text-black dark:text-white mt-4">
            {episode.title}
          </p>
        </div>

        <div
          onClick={() => audioInputRef.current?.click()}
          className="relative w-full h-48 rounded-3xl border-2 border-dashed border-black dark:border-white border-opacity-20 hover:border-[#EF3866] cursor-pointer transition-all duration-200 flex items-center justify-center"
        >
          {audioFile ? (
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-[#EF3866]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check className="w-6 h-6 text-[#EF3866]" />
              </div>
              <p className="text-sm font-medium text-black dark:text-white mb-1">
                {audioName}
              </p>
              <p className="text-xs text-black dark:text-white opacity-40">
                {(audioFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
          ) : (
            <div className="text-center p-4">
              <Upload className="w-8 h-8 text-[#EF3866] mx-auto mb-2" />
              <p className="text-xs text-black dark:text-white opacity-60">
                Click to select audio file
              </p>
              <p className="text-xs text-black dark:text-white opacity-40 mt-1">
                MP3, M4A, WAV · max 500MB
              </p>
            </div>
          )}
        </div>

        <input
          ref={audioInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleAudioSelect(e.target.files[0])}
        />

        {isUploading && (
          <div className="space-y-2">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#EF3866] transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-xs text-center text-black dark:text-white opacity-60">
              Uploading... {uploadProgress}%
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => router.back()}
            disabled={isUploading}
            className="flex-1 py-3.5 border border-black dark:border-white border-opacity-20 rounded-full font-semibold text-black dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={isUploading || !audioFile}
            className="flex-1 py-3.5 bg-[#EF3866] hover:bg-[#d12b56] disabled:opacity-50 text-white rounded-full font-semibold transition-colors flex items-center justify-center gap-2 shadow-lg"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload Episode
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}