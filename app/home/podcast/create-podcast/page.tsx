"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, X } from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";

export default function CreatePodcastPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Podcast name is required");
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("description", description);
      formData.append("category", category);
      if (coverImage) {
        formData.append("coverImage", coverImage);
      }

      const response = await fetch("/api/podcast/manage?type=podcast", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create podcast");
      }

      const { podcast } = await response.json();
      toast.success("Podcast created successfully!");
      router.push(`/home/podcast/${podcast.slug}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create podcast");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Create New Podcast</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cover Image Upload */}
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-6 text-center">
            {coverPreview ? (
              <div className="relative w-48 h-48 mx-auto">
                <Image
                  src={coverPreview}
                  alt="Cover preview"
                  fill
                  className="object-cover rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => {
                    setCoverImage(null);
                    setCoverPreview(null);
                  }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div>
                <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <label className="cursor-pointer">
                  <span className="text-[#EF3866] hover:underline">Upload cover image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
                <p className="text-sm text-gray-500 mt-2">PNG, JPG up to 5MB</p>
              </div>
            )}
          </div>

          {/* Podcast Name */}
          <div>
            <label className="block text-sm font-medium mb-2">Podcast Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-transparent focus:outline-none focus:border-[#EF3866]"
              placeholder="My Awesome Podcast"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-transparent focus:outline-none focus:border-[#EF3866]"
              placeholder="What's your podcast about?"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium mb-2">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-transparent focus:outline-none focus:border-[#EF3866]"
            >
              <option value="general">General</option>
              <option value="technology">Technology</option>
              <option value="entertainment">Entertainment</option>
              <option value="business">Business</option>
              <option value="education">Education</option>
            </select>
          </div>

          {/* Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 py-3 border border-gray-300 dark:border-gray-700 rounded-full font-medium hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="flex-1 py-3 bg-[#EF3866] text-white rounded-full font-medium hover:bg-[#d12b56] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Podcast"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}