"use client";

import React, { useState, useEffect } from "react";
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import MDEditor from '@uiw/react-md-editor';
import { Button } from './ui/button';
import { Send, Upload } from 'lucide-react';
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/context/AppContext";

interface FormState {
    error: string;
    status: string;
    _id?: string;
    [key: string]: unknown;
}

const CreatePostForm = () => {
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [body, setBody] = useState("");
    const [categories, setCategories] = useState<string[]>([]);
    const [imageUrl, setImageUrl] = useState<string>("");
    const [imageRef, setImageRef] = useState<string>("");
    const [isUploading, setIsUploading] = useState(false);
    const [categoryOptions, setCategoryOptions] = useState<{ _id: string, title: string }[]>([]);
    const router = useRouter();
    const { user } = useAppContext();

    // Fetch categories from Sanity
    useEffect(() => {
        async function fetchCategories() {
            try {
                const response = await fetch('/api/categories');
                const data = await response.json();
                setCategoryOptions(data);
            } catch (error) {
                console.error('Error fetching categories:', error);
                toast.error('Failed to load categories');
            }
        }

        fetchCategories();
    }, []);

    // Image URL validation
    const validateImageUrl = (url: string) => {
        if (!url) return false;

        try {
            new URL(url);
            const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
            const hasImageExtension = imageExtensions.some(ext =>
                url.toLowerCase().endsWith(ext)
            );

            return hasImageExtension || url.includes('image');
        } catch (error) {
            console.error("Invalid URL:", error);
            return false;
        }
    };

    // Function to upload image before form submission
    const handleImageUpload = async () => {
        if (!imageUrl) {
            setErrors(prev => ({ ...prev, imageUrl: "Image URL is required" }));
            return false;
        }
        
        if (!validateImageUrl(imageUrl)) {
            setErrors(prev => ({ ...prev, imageUrl: "Please enter a valid image URL" }));
            return false;
        }

        setIsUploading(true);
        try {
            const formData = new FormData();
            const titleElement = document.getElementById('title') as HTMLInputElement | null;
            formData.append('imageUrl', imageUrl);
            formData.append('filename', titleElement?.value || 'post-image');

            const response = await fetch('/api/upload-image', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to upload image');
            }

            const result = await response.json();
            setImageRef(JSON.stringify(result.imageRef));
            toast.success("Image uploaded successfully!");
            return true;
        } catch (error) {
            console.error('Error uploading image:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to upload image');
            return false;
        } finally {
            setIsUploading(false);
        }
    };

    // Form validation
    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        const titleElement = document.getElementById('title') as HTMLInputElement | null;
        const descriptionElement = document.getElementById('description') as HTMLTextAreaElement | null;

        if (!titleElement?.value) {
            newErrors.title = "Title is required";
          }
        
          if (!descriptionElement?.value) {
            newErrors.description = "Description is required";
          }
        
        if (!body) 
            newErrors.body = "Content is required";
        
        if (!imageRef) 
            newErrors.imageUrl = "You must upload an image first";
        
        if (categories.length === 0) 
            newErrors.categories = "At least one category is required";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Form submission handler
    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) {
            toast.error("Please fix the form errors");
            return;
        }

        try {
            const formData = new FormData(e.target as HTMLFormElement);
            
            // Add body, categories, and image reference
            formData.append('body', body);
            formData.append('imageRef', imageRef);
            categories.forEach(cat => formData.append('categoryIds', cat));
            
            // Add user ID
            if (user?.id) {
                formData.append('authorId', user.id);
            } else {
                toast.error("User not authenticated");
                return;
            }

            // Generate slug from title
            const title = formData.get('title') as string;
            const slug = title.toLowerCase().replace(/\s+/g, '-');
            formData.append('slug', slug);

            // Submit the form
            const response = await fetch('/api/post/create-post', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create post');
            }

            const result = await response.json();
            toast.success("Post created successfully!");
            router.push(`/post/${result._id}`);
        } catch (error) {
            console.error('Error creating post:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to create post');
        }
    };

    const handleEditorChange = (value: string | undefined) => {
        if (value !== undefined) {
            setBody(value);
        }
    };

    return (
        <form
            onSubmit={handleFormSubmit}
            className="w-full max-w-4xl mx-auto p-6 md:p-8 bg-white rounded-2xl shadow-xl space-y-6 border border-gray-100"
        >
            <h2 className="text-2xl font-bold text-gray-800">Post Details</h2>

            {/* Title */}
            <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                </label>
                <Input
                    id="title"
                    name="title"
                    className="w-full rounded-xl border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                    placeholder="Enter post title"
                />
                {errors.title && <p className="text-sm text-red-500 mt-1">{errors.title}</p>}
            </div>

            {/* Description */}
            <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                </label>
                <Textarea
                    id="description"
                    name="description"
                    className="w-full rounded-xl border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                    placeholder="Enter a brief summary"
                />
                {errors.description && <p className="text-sm text-red-500 mt-1">{errors.description}</p>}
            </div>

            {/* Categories */}
            <div>
                <label htmlFor="categoryIds" className="block text-sm font-medium text-gray-700 mb-1">
                    Categories
                </label>
                <select
                    name="categoryIds"
                    id="categoryIds"
                    multiple
                    className="w-full rounded-xl border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    onChange={(e) => setCategories([...e.target.selectedOptions].map(option => option.value))}
                >
                    {categoryOptions.map((cat) => (
                        <option key={cat._id} value={cat._id}>
                            {cat.title}
                        </option>
                    ))}
                </select>
                {errors.categories && <p className="text-sm text-red-500 mt-1">{errors.categories}</p>}
            </div>

            {/* Image URL with upload button */}
            <div>
                <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700 mb-1">
                    Image URL
                </label>
                <div className="flex gap-2">
                    <Input
                        id="imageUrl"
                        name="imageUrl"
                        className="flex-1 rounded-xl border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        required
                        placeholder="Paste a direct image link"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        disabled={!!imageRef || isUploading}
                    />
                    <Button
                        type="button"
                        onClick={handleImageUpload}
                        className="bg-green-600 text-white hover:bg-green-700 transition-colors px-4 py-2 rounded-xl shadow-md disabled:bg-gray-400 flex items-center gap-2"
                        disabled={!!imageRef || isUploading || !imageUrl}
                    >
                        {isUploading ? "Uploading..." : imageRef ? "Uploaded" : "Upload"}
                        <Upload className="w-4 h-4" />
                    </Button>
                </div>
                {errors.imageUrl && <p className="text-sm text-red-500 mt-1">{errors.imageUrl}</p>}
                {imageRef && <p className="text-sm text-green-500 mt-1">Image uploaded successfully!</p>}
            </div>

            {/* Content Editor */}
            <div>
                <label htmlFor="body" className="block text-sm font-medium text-gray-700 mb-1">
                    Content
                </label>
                <div className="bg-white border border-gray-300 rounded-xl overflow-hidden">
                    <MDEditor
                        id="body"
                        value={body}
                        onChange={handleEditorChange}
                        preview="edit"
                        height={300}
                        style={{ borderRadius: 12 }}
                        textareaProps={{ placeholder: "Write your content here..." }}
                    />
                </div>
                {errors.body && <p className="text-sm text-red-500 mt-1">{errors.body}</p>}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
                <Button
                    type="submit"
                    className="inline-flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors px-6 py-3 rounded-xl shadow-md disabled:bg-gray-400"
                    disabled={isUploading || !imageRef}
                >
                    Create Post
                    <Send className="w-4 h-4" />
                </Button>
            </div>
        </form>
    );
};

export default CreatePostForm;