// Updated CreatePostForm with better markdown handling and validation

"use client";

import React, { useState, useEffect } from "react";
import { useActionState } from "react";
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import MDEditor from '@uiw/react-md-editor';
import { Button } from './ui/button';
import { Send, AlertCircle, Eye, EyeOff } from 'lucide-react';
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
    const [previewMode, setPreviewMode] = useState<'edit' | 'preview'>('edit');
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
                title: (formData.get("title") as string)?.trim(),
                description: (formData.get("description") as string)?.trim(),
                body: body.trim(), // Include the markdown body
                imageUrl: imageUrl.trim(),
                categories: categories
            };

            console.log("Submitting Post:", formValues); // Debug form values

            // Enhanced validation
            let hasErrors = false;

            if (!formValues.title || formValues.title.length < 3) {
                setErrors(prev => ({ ...prev, title: "Title must be at least 3 characters long" }));
                hasErrors = true;
            }

            if (!formValues.description || formValues.description.length < 10) {
                setErrors(prev => ({ ...prev, description: "Description must be at least 10 characters long" }));
                hasErrors = true;
            }

            if (!formValues.body || formValues.body.length < 50) {
                setErrors(prev => ({ ...prev, body: "Content must be at least 50 characters long" }));
                hasErrors = true;
            }

            if (!formValues.imageUrl || !isValidUrl(formValues.imageUrl)) {
                setErrors(prev => ({ ...prev, imageUrl: "Valid image URL is required" }));
                hasErrors = true;
            }

            if (formValues.categories.length === 0) {
                setErrors(prev => ({ ...prev, categories: "At least one category is required" }));
                hasErrors = true;
            }

            if (hasErrors) {
                setIsSubmitting(false);
                return { ...prevState, error: 'Please fix the validation errors', status: 'ERROR' as const };
            }

            // Clean and prepare the markdown content
            const cleanedBody = cleanMarkdown(body);
            
            // Add cleaned body to formData explicitly
            formData.set('body', cleanedBody);
            
            // Add categories to formData
            formData.delete('categoryIds'); // Clear existing
            categories.forEach(cat => formData.append('categoryIds', cat));
            
            // Add image URL to formData
            formData.set('imageUrl', imageUrl);

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
            // Clear body error when user starts typing
            if (errors.body && value.length >= 50) {
                setErrors(prev => ({ ...prev, body: "" }));
            }
        }
    };

    // Helper function to validate URLs
    const isValidUrl = (string: string) => {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    };

    // Helper function to clean markdown content
    const cleanMarkdown = (markdown: string) => {
        return markdown
            .trim()
            // Remove excessive line breaks (more than 2 consecutive)
            .replace(/\n{3,}/g, '\n\n')
            // Ensure proper spacing around headers
            .replace(/^(#{1,6})\s*(.+)$/gm, '$1 $2')
            // Clean up list formatting
            .replace(/^(\s*)-\s+/gm, '- ')
            .replace(/^(\s*)\d+\.\s+/gm, '$11. ');
    };

    return (
        <form
            action={formAction}
            className="w-full max-w-4xl mx-auto p-6 md:p-8 bg-white dark:bg-gray-900 rounded-2xl shadow-xl space-y-6 border border-gray-100 dark:border-gray-800 transition-colors"
        >
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Create New Post</h2>

            {/* Info alert about content guidelines */}
            <div className="flex gap-2 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700 dark:text-blue-300">
                    <p className="font-medium">Content Guidelines:</p>
                    <ul className="mt-1 space-y-1">
                        <li>• Use descriptive headings to structure your content</li>
                        <li>• Keep paragraphs concise and readable</li>
                        <li>• Use direct image links under 5MB for best performance</li>
                    </ul>
                </div>
            </div>

            {/* Title */}
            <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Title *
                </label>
                <Input
                    id="title"
                    name="title"
                    className="w-full rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-800 dark:text-white"
                    required
                    placeholder="Enter a compelling post title"
                    onChange={(e) => {
                        if (errors.title && e.target.value.length >= 3) {
                            setErrors(prev => ({ ...prev, title: "" }));
                        }
                    }}
                />
                {errors.title && <p className="text-sm text-red-500 mt-1">{errors.title}</p>}
            </div>

            {/* Description */}
            <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description *
                </label>
                <Textarea
                    id="description"
                    name="description"
                    className="w-full rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-800 dark:text-white"
                    required
                    placeholder="Write a brief, engaging summary of your post"
                    rows={3}
                    onChange={(e) => {
                        if (errors.description && e.target.value.length >= 10) {
                            setErrors(prev => ({ ...prev, description: "" }));
                        }
                    }}
                />
                {errors.description && <p className="text-sm text-red-500 mt-1">{errors.description}</p>}
            </div>

            {/* Categories */}
            <div>
                <label htmlFor="categoryIds" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Categories * (Hold Ctrl/Cmd to select multiple)
                </label>
                <select
                    name="categoryIds"
                    id="categoryIds"
                    multiple
                    className="w-full rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-800 dark:text-white min-h-[120px]"
                    onChange={(e) => {
                        const selected = [...e.target.selectedOptions].map(option => option.value);
                        setCategories(selected);
                        if (errors.categories && selected.length > 0) {
                            setErrors(prev => ({ ...prev, categories: "" }));
                        }
                    }}
                >
                    {categoryOptions.map((cat) => (
                        <option key={cat._id} value={cat._id} className="py-2">
                            {cat.title}
                        </option>
                    ))}
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Selected: {categories.length} categor{categories.length === 1 ? 'y' : 'ies'}
                </p>
                {errors.categories && <p className="text-sm text-red-500 mt-1">{errors.categories}</p>}
            </div>

            {/* Image URL */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Featured Image *
                </label>
                <ImageUploader
                    onImageReady={(url) => {
                        setImageUrl(url);
                        if (errors.imageUrl && url) {
                            setErrors(prev => ({ ...prev, imageUrl: "" }));
                        }
                    }}
                />
                {errors.imageUrl && <p className="text-sm text-red-500 mt-1">{errors.imageUrl}</p>}
            </div>

            {/* Content Editor */}
            <div data-color-mode="auto">
                <div className="flex items-center justify-between mb-2">
                    <label htmlFor="body" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Content * (Markdown supported)
                    </label>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            {body.length} characters
                        </span>
                        <button
                            type="button"
                            onClick={() => setPreviewMode(prev => prev === 'edit' ? 'preview' : 'edit')}
                            className="flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            {previewMode === 'edit' ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                            {previewMode === 'edit' ? 'Preview' : 'Edit'}
                        </button>
                    </div>
                </div>
                <MDEditor
                    id="body"
                    value={body}
                    onChange={handleEditorChange}
                    preview={previewMode}
                    height={400}
                    style={{ 
                        borderRadius: 12, 
                        overflow: "hidden",
                        backgroundColor: 'transparent'
                    }}
                    textareaProps={{ 
                        placeholder: `Write your content here using Markdown...

Example:
# Main Heading
## Subheading
**Bold text** and *italic text*
- Bullet point
1. Numbered list

[Link text](https://example.com)
![Image alt text](image-url)
                        `
                    }}
                    previewOptions={{ 
                        disallowedElements: ["style"],
                        className: "prose dark:prose-invert max-w-none"
                    }}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Minimum 50 characters required. Use markdown for formatting.
                </p>
                {errors.body && <p className="text-sm text-red-500 mt-1">{errors.body}</p>}
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
                <Button
                    type="submit"
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors px-6 py-3 rounded-xl shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed"
                    disabled={isPending || isSubmitting}
                >
                    {isPending || isSubmitting ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Creating Post...
                        </>
                    ) : (
                        <>
                            Create Post
                            <Send className="w-4 h-4" />
                        </>
                    )}
                </Button>
            </div>
        </form>
    );
};

export default CreatePostForm;