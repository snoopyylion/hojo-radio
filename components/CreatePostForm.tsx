"use client";

import React, { useState, useEffect } from "react";
import { useActionState } from "react";
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import MDEditor from '@uiw/react-md-editor';
import { Button } from './ui/button';
import { Send, AlertCircle } from 'lucide-react';
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createPostItem } from "@/lib/action";
import ImageUploader from "./ImageUploader";

// Define the state type
interface ActionState {
    error: string;
    status: "INITIAL" | "ERROR" | "SUCCESS";
    _id?: string;
}

const CreatePostForm = () => {
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [body, setBody] = useState("");
    const [categories, setCategories] = useState<string[]>([]);
    const [imageUrl, setImageUrl] = useState<string>("");
    const [categoryOptions, setCategoryOptions] = useState<{ _id: string, title: string }[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
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

    // Form submission handler with properly typed prevState
    const handleFormSubmit = async (prevState: ActionState, formData: FormData) => {
        try {
            setIsSubmitting(true);

            // Clear previous errors
            setErrors({});

            // Construct form values for validation
            const formValues = {
                title: formData.get("title") as string,
                description: formData.get("description") as string,
                body: body, // Include the markdown body
                imageUrl: imageUrl,
                categories: categories
            };

            console.log("Submitting Post:", formValues); // Debug form values

            // Validate form data
            let hasErrors = false;

            if (!formValues.title) {
                setErrors(prev => ({ ...prev, title: "Title is required" }));
                hasErrors = true;
            }

            if (!formValues.description) {
                setErrors(prev => ({ ...prev, description: "Description is required" }));
                hasErrors = true;
            }

            if (!formValues.body) {
                setErrors(prev => ({ ...prev, body: "Content is required" }));
                hasErrors = true;
            }

            if (!formValues.imageUrl) {
                setErrors(prev => ({ ...prev, imageUrl: "Image URL is required" }));
                hasErrors = true;
            }

            if (formValues.categories.length === 0) {
                setErrors(prev => ({ ...prev, categories: "At least one category is required" }));
                hasErrors = true;
            }

            if (hasErrors) {
                setIsSubmitting(false);
                return { ...prevState, error: 'Validation failed', status: 'ERROR' as const };
            }

            // Add body to formData explicitly
            formData.append('body', body);
            
            // Add categories to formData
            categories.forEach(cat => formData.append('categoryIds', cat));
            
            // Add image URL to formData
            formData.append('imageUrl', imageUrl);

            // Show a loading toast for the upload process
            const uploadToast = toast.loading("Creating post and uploading image. This may take a moment...");

            // Submit to server action
            const result = await createPostItem(prevState, formData);

            // Dismiss the loading toast
            toast.dismiss(uploadToast);

            if (result.status === 'SUCCESS') {
                toast.success("Post created successfully!");
                router.push(`/post/${result._id}`);
            } else if (result.error) {
                toast.error(result.error);
            }

            setIsSubmitting(false);
            return result;
        } catch (error) {
            setIsSubmitting(false);
            console.error('Error creating post:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to create post');

            return {
                ...prevState,
                error: error instanceof Error ? error.message : 'Unknown error creating post',
                status: "ERROR" as const,
            };
        }
    };

    const [, formAction, isPending] = useActionState(handleFormSubmit, {
        error: "",
        status: "INITIAL" as const,
    });

    const handleEditorChange = (value: string | undefined) => {
        if (value !== undefined) {
            setBody(value);
            console.log("Updated body:", value); // Debug - check content updates
        }
    };

    return (
        <form
            action={formAction}
            className="w-full max-w-4xl mx-auto p-6 md:p-8 bg-white rounded-2xl shadow-xl space-y-6 border border-gray-100"
        >
            <h2 className="text-2xl font-bold text-gray-800">Post Details</h2>

            {/* Info alert about image requirements */}
            <div className="flex gap-2 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700">
                    <p className="font-medium">Important:</p>
                    <p>For best results, use direct image links under 5MB in size. Larger images may cause timeouts.</p>
                </div>
            </div>

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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Featured Image
                </label>
                <ImageUploader
                    onImageReady={(url) => setImageUrl(url)}
                />
                {errors.imageUrl && <p className="text-sm text-red-500 mt-1">{errors.imageUrl}</p>}
            </div>

            {/* Content Editor */}
            <div data-color-mode="light">
                <label htmlFor="body" className="block text-sm font-medium text-gray-700 mb-1">
                    Content
                </label>
                <MDEditor
                    id="body"
                    value={body}
                    onChange={handleEditorChange}
                    preview="edit"
                    height={300}
                    style={{ borderRadius: 12, overflow: "hidden" }}
                    textareaProps={{ placeholder: "Write your content here..." }}
                    previewOptions={{ disallowedElements: ["style"] }}
                />
                {errors.body && <p className="text-sm text-red-500 mt-1">{errors.body}</p>}
            </div>

            {/* Submit Button */}
            <Button
                type="submit"
                className="inline-flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors px-6 py-3 rounded-xl shadow-md disabled:bg-gray-400"
                disabled={isPending || isSubmitting}
            >
                {isPending || isSubmitting ? "Creating Post..." : "Create Post"}
                <Send className="w-4 h-4" />
            </Button>
        </form>
    );
};

export default CreatePostForm;