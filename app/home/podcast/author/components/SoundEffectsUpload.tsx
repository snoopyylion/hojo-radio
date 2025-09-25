// components/SoundEffectsUpload.tsx
"use client";

import React, { useState, useRef } from 'react';
import { Upload, X, Music, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from "@clerk/nextjs";

const CATEGORIES = [
  'general',
  'music',
  'voice',
  'nature',
  'mechanical',
  'electronic',
  'comedy',
  'drama',
  'transition'
];

type SoundEffectsUploadProps = {
  className?: string;
  /** 
   * Optional callback to override upload handling.
   * Return true if upload succeeded, false if failed.
   */
  onUpload?: (formData: FormData) => Promise<boolean>;
};

export function SoundEffectsUpload({ className = '', onUpload }: SoundEffectsUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { getToken } = useAuth();

  const [formData, setFormData] = useState({
    title: '',
    category: 'general',
    tags: '',
  });
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    setError(null);
    
    // Validate file type
    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/m4a'];
    if (!validTypes.includes(file.type)) {
      setError('Please select a valid audio file (MP3, WAV, OGG, M4A)');
      return;
    }
    
    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }
    
    setSelectedFile(file);
    
    // Auto-fill title from filename
    if (!formData.title) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      setFormData(prev => ({ ...prev, title: nameWithoutExt }));
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setUploadSuccess(false);

    if (!selectedFile || !formData.title.trim()) {
      setError("Please select a file and enter a title");
      return;
    }

    const uploadData = new FormData();
    uploadData.append("file", selectedFile);
    uploadData.append("title", formData.title.trim());
    uploadData.append("category", formData.category);
    uploadData.append("tags", formData.tags);

    setUploading(true);

    try {
      let success = false;

      if (onUpload) {
        // ✅ let parent handle it
        success = await onUpload(uploadData);
      } else {
        // ✅ default internal upload flow
        const token = await getToken();
        const res = await fetch("/api/podcast/sound-effects/upload", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: uploadData,
        });

        success = res.ok;
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(errText || "Upload failed");
        }
      }

      if (success) {
        setUploadSuccess(true);
        // Reset form after short delay
        setTimeout(() => {
          setFormData({ title: "", category: "general", tags: "" });
          setSelectedFile(null);
          setIsOpen(false);
          setUploadSuccess(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }, 1500);
      } else {
        setError("Upload failed, please try again.");
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "An unexpected error occurred");
      } else if (typeof err === "string") {
        setError(err);
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFormData({ title: "", category: "general", tags: "" });
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-2 px-4 py-2 bg-[#EF3866] text-white rounded-lg hover:bg-[#d12b56] transition-colors ${className}`}
      >
        <Upload size={16} />
        Upload Sound Effect
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Upload Sound Effect
          </h3>
          <button
            onClick={() => {
              setIsOpen(false);
              resetForm();
            }}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragActive
                ? 'border-[#EF3866] bg-[#EF3866]/5'
                : 'border-gray-300 dark:border-gray-600'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileInputChange}
              className="hidden"
            />
            
            {selectedFile ? (
              <div className="space-y-2">
                <Music className="mx-auto h-8 w-8 text-[#EF3866]" />
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-gray-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm text-[#EF3866] hover:text-[#d12b56]"
                >
                  Change file
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="mx-auto h-8 w-8 text-gray-400" />
                <div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-sm text-[#EF3866] hover:text-[#d12b56] font-medium"
                  >
                    Click to upload
                  </button>
                  <p className="text-xs text-gray-500">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">
                  MP3, WAV, OGG, M4A (max 10MB)
                </p>
              </div>
            )}
          </div>

          {/* Title Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#EF3866] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Enter sound effect title"
              required
            />
          </div>

          {/* Category Select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#EF3866] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Tags Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tags
            </label>
            <input
              type="text"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#EF3866] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="comedy, intro, outro (comma separated)"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {uploadSuccess && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
              <CheckCircle2 size={16} /> Uploaded successfully!
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                resetForm();
              }}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !selectedFile || !formData.title.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#EF3866] text-white rounded-lg hover:bg-[#d12b56] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {uploading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Uploading...
                </>
              ) : (
                'Upload'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}