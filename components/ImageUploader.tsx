// Add this to your package.json dependencies:
// "browser-image-compression": "^2.0.2"

"use client";

import React, { useState } from "react";
import { Input } from './ui/input';
import { Button } from './ui/button';
import { AlertCircle, Upload } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import Image from "next/image";

interface ImageUploaderProps {
    onImageReady: (imageUrl: string) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageReady }) => {
    const [imageUrl, setImageUrl] = useState<string>("");
    const [urlError, setUrlError] = useState<string>("");
    const [isCompressing, setIsCompressing] = useState<boolean>(false);
    const [uploadMode, setUploadMode] = useState<'url' | 'file'>('url');

    // Function to handle direct URL input
    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setImageUrl(e.target.value);
        setUrlError("");

        if (e.target.value) {
            onImageReady(e.target.value);
        }
    };

    // Function to handle file upload and compression
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsCompressing(true);

            // Compression options
            const options = {
                maxSizeMB: 1, // Compress to max 1MB
                maxWidthOrHeight: 1920, // Resize if larger than 1920px
                useWebWorker: true
            };

            // If the image is already small, don't compress heavily
            if (file.size < 2 * 1024 * 1024) {
                options.maxSizeMB = Math.min(file.size / (1024 * 1024), 1);
            }

            // Compress the image
            const compressedFile = await imageCompression(file, options);

            const reader = new FileReader();
            reader.onloadend = () => {
                // This will give you a base64 string
                const base64String = reader.result as string;
                // Set the state and pass to parent component
                setImageUrl(base64String);
                onImageReady(base64String);
            };
            reader.readAsDataURL(compressedFile); // Use the compressed file instead of original

            // Optional: If you want to display file size info
            console.log(`Original size: ${file.size / 1024 / 1024} MB`);
            console.log(`Compressed size: ${compressedFile.size / 1024 / 1024} MB`);
        } catch (error) {
            console.error("Compression error:", error);
            setUrlError("Failed to process image. Please try another file.");
        } finally {
            setIsCompressing(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Mode Toggle Buttons */}
            <div className="grid grid-cols-2 gap-4">
                <Button
                    type="button"
                    variant={uploadMode === 'url' ? 'default' : 'outline'}
                    onClick={() => setUploadMode('url')}
                    className="w-full"
                >
                    Use URL
                </Button>
                <Button
                    type="button"
                    variant={uploadMode === 'file' ? 'default' : 'outline'}
                    onClick={() => setUploadMode('file')}
                    className="w-full"
                >
                    Upload File
                </Button>
            </div>

            {/* Upload by URL */}
            {uploadMode === 'url' && (
                <div className="space-y-2">
                    <label htmlFor="imageUrl" className="text-sm font-medium text-muted-foreground">
                        Image URL <span className="text-xs text-muted">(.jpg, .png, etc.)</span>
                    </label>
                    <Input
                        id="imageUrl"
                        name="imageUrl"
                        placeholder="https://example.com/image.jpg"
                        className="w-full rounded-xl"
                        required
                        value={imageUrl}
                        onChange={handleUrlChange}
                    />
                </div>
            )}

            {/* Upload by File */}
            {uploadMode === 'file' && (
                <div className="space-y-2">
                    <label htmlFor="imageFile" className="text-sm font-medium text-muted-foreground">
                        Upload Image <span className="text-xs text-muted">(Auto-compressed under 5MB)</span>
                    </label>
                    <div className="relative border-2 border-dashed border-gray-300 rounded-xl p-6 text-center bg-muted/20">
                        <Input
                            id="imageFile"
                            name="imageFile"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileUpload}
                        />
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => document.getElementById('imageFile')?.click()}
                            className="inline-flex items-center gap-2"
                            disabled={isCompressing}
                        >
                            {isCompressing ? "Compressing..." : "Choose File"}
                            <Upload className="w-4 h-4" />
                        </Button>

                        {imageUrl && (
                            <div className="mt-4">
                                <p className="text-sm text-muted-foreground">Image preview:</p>
                                <div className="mt-2 w-32 h-32 mx-auto relative">
                                    <Image
                                        src={imageUrl}
                                        alt="Preview"
                                        fill
                                        className="object-cover rounded-xl shadow-md"
                                        unoptimized={imageUrl.startsWith('data:')}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Error Message */}
            {urlError && <p className="text-sm text-destructive">{urlError}</p>}

            {/* Tips Box */}
            <div className="flex gap-3 p-4 bg-blue-50 dark:bg-blue-950 rounded-xl border border-blue-100 dark:border-blue-800 shadow-sm">
                <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                <div className="text-sm text-blue-700 dark:text-blue-200">
                    <p className="font-semibold">Image Tips:</p>
                    <ul className="list-disc list-inside text-sm space-y-1 mt-1">
                        <li>File uploads are compressed automatically under 5MB.</li>
                        <li>URL must link directly to an image (e.g., .jpg, .png).</li>
                    </ul>
                </div>
            </div>

            {/* Hidden Input for submission */}
            <input type="hidden" name="imageUrl" value={imageUrl} />
        </div>

    );
};

export default ImageUploader;