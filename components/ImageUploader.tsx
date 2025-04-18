// Add this to your package.json dependencies:
// "browser-image-compression": "^2.0.2"

"use client";

import React, { useState } from "react";
import { Input } from './ui/input';
import { Button } from './ui/button';
import { AlertCircle, Upload } from 'lucide-react';
import imageCompression from 'browser-image-compression';

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
        <div className="space-y-4">
            <div className="flex flex-col space-y-2">
                <div className="flex space-x-2">
                    <Button
                        type="button"
                        variant={uploadMode === 'url' ? 'default' : 'outline'}
                        onClick={() => setUploadMode('url')}
                        className="flex-1"
                    >
                        Use URL
                    </Button>
                    <Button
                        type="button"
                        variant={uploadMode === 'file' ? 'default' : 'outline'}
                        onClick={() => setUploadMode('file')}
                        className="flex-1"
                    >
                        Upload File
                    </Button>
                </div>
            </div>

            {uploadMode === 'url' ? (
                <div>
                    <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700 mb-1">
                        Image URL <span className="text-xs text-gray-500">(Direct image link)</span>
                    </label>
                    <Input
                        id="imageUrl"
                        name="imageUrl"
                        className="w-full rounded-xl border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        required
                        placeholder="Paste a direct image link"
                        value={imageUrl}
                        onChange={handleUrlChange}
                    />
                </div>
            ) : (
                <div>
                    <label htmlFor="imageFile" className="block text-sm font-medium text-gray-700 mb-1">
                        Upload Image <span className="text-xs text-gray-500">(Will be automatically compressed)</span>
                    </label>
                    <div className="border-dashed border-2 border-gray-300 rounded-xl p-6 text-center">
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
                            variant="outline"
                            onClick={() => document.getElementById('imageFile')?.click()}
                            className="inline-flex items-center gap-2"
                            disabled={isCompressing}
                        >
                            {isCompressing ? "Compressing..." : "Choose File"}
                            <Upload className="w-4 h-4" />
                        </Button>
                        {imageUrl && uploadMode === 'file' && (
                            <div className="mt-2">
                                <p className="text-sm text-gray-600">Image ready to upload</p>
                                <div className="mt-2 w-24 h-24 mx-auto">
                                    <img src={imageUrl} alt="Preview" className="h-full w-full object-cover rounded" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {urlError && <p className="text-sm text-red-500 mt-1">{urlError}</p>}

            <div className="flex gap-2 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700">
                    <p className="font-medium">Image Tips:</p>
                    <p>When uploading files, images will be automatically compressed to be under 5MB.</p>
                    <p>For URL mode, ensure you're using a direct image link that ends with .jpg, .png, etc.</p>
                </div>
            </div>

            <input type="hidden" name="imageUrl" value={imageUrl} />
        </div>
    );
};

export default ImageUploader;