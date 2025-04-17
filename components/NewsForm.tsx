"use client";

import React, { useState, useEffect } from "react";
import { useActionState } from "react";
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import MDEditor from '@uiw/react-md-editor';
import { Button } from './ui/button';
import { Send } from 'lucide-react';
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createPostItem } from "@/lib/action";

const CreatePostForm = () => {
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [body, setBody] = useState("");
    const [categories, setCategories] = useState<string[]>([]);
    const [imageUrl, setImageUrl] = useState<string>("");
    const [categoryOptions, setCategoryOptions] = useState<{ _id: string, title: string }[]>([]);
    const router = useRouter();

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
    // Add this to your CreatePostForm component
    const validateImageUrl = (url: string) => {
        if (!url) return false;

        // Check if it's a valid URL
        try {
            new URL(url);

            // Check if it's an image URL (at least by extension)
            const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
            const hasImageExtension = imageExtensions.some(ext =>
                url.toLowerCase().endsWith(ext)
            );

            return hasImageExtension || url.includes('image'); // Basic check
        } catch (e) {
            return false;
        }
    };

    // Then update your validateForm function
    const validateForm = (formData: FormData) => {
        const newErrors: Record<string, string> = {};

        if (!formData.get("title")) newErrors.title = "Title is required";
        if (!formData.get("description")) newErrors.description = "Description is required";
        if (!body) newErrors.body = "Content is required";

        if (!imageUrl) {
            newErrors.imageUrl = "Image URL is required";
        } else if (!validateImageUrl(imageUrl)) {
            newErrors.imageUrl = "Please enter a valid image URL";
        }

        if (categories.length === 0) newErrors.categories = "At least one category is required";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Form Submission Handler
    const handleFormSubmit = async (prevState: any, formData: FormData) => {
        try {
            // Validate form
            if (!validateForm(formData)) {
                return { ...prevState, error: 'Please fix the form errors', status: 'ERROR' };
            }

            // Manually append additional fields to formData
            if (body) formData.append("body", body);

            // Add image URL to form data
            if (imageUrl) formData.append("imageUrl", imageUrl);

            // Add selected categories to form data
            categories.forEach(cat => formData.append("categoryIds", cat));

            const formValues = {
                title: formData.get("title") as string,
                description: formData.get("description") as string,
                body,
                imageUrl,
                categories,
            };

            console.log("Form Values:", formValues);

            // Call the server action with the enhanced formData
            const result = await createPostItem(prevState, formData);

            if (result.status === "SUCCESS") {
                toast.success("Post created successfully!");
                router.push(`/post/${result._id}`);
            }
            return result;
        } catch (error) {
            console.error("Error:", error);
            toast.error("An error occurred while submitting the post.");
            return { ...prevState, error: 'Submission failed', status: 'ERROR' };
        }
    };

    const [state, formAction, isPending] = useActionState(handleFormSubmit, {
        error: "",
        status: "INITIAL",
    });

    const handleEditorChange = (value: string | undefined) => {
        if (value !== undefined) {
            setBody(value);
        }
    };

    return (
        <form
            action={formAction}
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

            {/* Image URL */}
            <div>
                <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700 mb-1">
                    Image URL
                </label>
                <Input
                    id="imageUrl"
                    name="imageUrl"
                    className="w-full rounded-xl border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                    placeholder="Paste a direct image link"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                />
                {errors.imageUrl && <p className="text-sm text-red-500 mt-1">{errors.imageUrl}</p>}
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
                    disabled={isPending}
                >
                    {isPending ? "Submitting..." : "Create Post"}
                    <Send className="w-4 h-4" />
                </Button>
            </div>

            {/* Error Message */}
            {state.error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
                    {state.error}
                </div>
            )}
        </form>

    );
};

export default CreatePostForm;