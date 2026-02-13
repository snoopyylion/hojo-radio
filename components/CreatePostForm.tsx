"use client";

import React, { useState, useEffect } from "react";
import { useActionState } from "react";
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import MDEditor from '@uiw/react-md-editor';
import { Button } from './ui/button';
import { Send, AlertCircle, Eye, EyeOff, Plus, X, Hash, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createPostItem } from "@/lib/action";
import ImageUploader from "./ImageUploader";
import { useAuth } from '@clerk/nextjs';
import { notificationService } from '@/lib/notificationService';

// Define the state type
interface ActionState {
    error: string;
    status: "INITIAL" | "ERROR" | "SUCCESS";
    _id?: string;
}

const CreatePostForm = () => {
    const { userId } = useAuth();
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
                // Log user activity
                if (userId && formValues.title) {
                    await notificationService.createUserActivity({
                        user_id: userId,
                        type: 'post_created',
                        title: 'Post Created',
                        description: `You created a new post: \"${formValues.title}\"`,
                        category: 'content',
                        visibility: 'public',
                        data: { post_title: formValues.title }
                    });
                }
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
        } catch {
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

    // Remove a category
    const removeCategory = (categoryId: string) => {
        setCategories(prev => prev.filter(id => id !== categoryId));
        if (errors.categories && categories.length <= 1) {
            setErrors(prev => ({ ...prev, categories: "" }));
        }
    };

    // Add a category
    const addCategory = (categoryId: string) => {
        if (!categories.includes(categoryId)) {
            setCategories(prev => [...prev, categoryId]);
            if (errors.categories) {
                setErrors(prev => ({ ...prev, categories: "" }));
            }
        }
    };

    return (
        <form action={formAction} className="space-y-10 md:space-y-14">
            {/* Title – hero style */}
            <div className="space-y-3">
                <Input
                    name="title"
                    placeholder="Your powerful headline..."
                    className="text-3xl md:text-4xl font-bold bg-transparent border-none outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:ring-0 p-0 h-auto"
                    onChange={(e) => {
                        if (errors.title && e.target.value.length >= 3) {
                            setErrors(prev => ({ ...prev, title: "" }));
                        }
                    }}
                    required
                />
                {errors.title && (
                    <p className="text-sm text-red-400 flex items-center gap-1.5">
                        <AlertCircle size={14} /> {errors.title}
                    </p>
                )}
            </div>

            {/* Description */}
            <div className="space-y-3">
                <Textarea
                    name="description"
                    placeholder="A short, compelling summary that makes people want to read more..."
                    className="text-lg bg-transparent border-none resize-none focus:ring-0 p-0 min-h-[4.5rem] placeholder:text-gray-400 dark:placeholder:text-gray-600"
                    rows={3}
                    onChange={(e) => {
                        if (errors.description && e.target.value.length >= 10) {
                            setErrors(prev => ({ ...prev, description: "" }));
                        }
                    }}
                    required
                />
                {errors.description && (
                    <p className="text-sm text-red-400 flex items-center gap-1.5">
                        <AlertCircle size={14} /> {errors.description}
                    </p>
                )}
            </div>

            {/* Categories – pill style, better spacing */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Hash size={16} />
                    <span>Topics</span>
                </div>

                <div className="flex flex-wrap gap-2.5">
                    {categories.map((id) => {
                        const cat = categoryOptions.find(c => c._id === id);
                        return cat ? (
                            <div
                                key={id}
                                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#EF3866]/10 dark:bg-[#EF3866]/20 text-[#EF3866] rounded-full text-sm font-medium"
                            >
                                {cat.title}
                                <button
                                    type="button"
                                    onClick={() => removeCategory(id)}
                                    className="text-[#EF3866]/80 hover:text-[#EF3866] transition-colors"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ) : null;
                    })}

                    {categoryOptions
                        .filter(cat => !categories.includes(cat._id))
                        .map(cat => (
                            <button
                                key={cat._id}
                                type="button"
                                onClick={() => addCategory(cat._id)}
                                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-full hover:border-[#EF3866]/50 hover:text-[#EF3866] transition-colors"
                            >
                                <Plus size={14} />
                                {cat.title}
                            </button>
                        ))}
                </div>

                {errors.categories && (
                    <p className="text-sm text-red-400 flex items-center gap-1.5">
                        <AlertCircle size={14} /> {errors.categories}
                    </p>
                )}
            </div>

            {/* Featured Image – nicer dropzone look */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <ImageIcon size={16} />
                    <span>Cover Image</span>
                </div>

                <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-8 md:p-12 text-center hover:border-[#EF3866]/50 transition-colors bg-gray-50/30 dark:bg-gray-950/30">
                    <ImageUploader
                        onImageReady={(url) => {
                            setImageUrl(url);
                            if (errors.imageUrl) setErrors(prev => ({ ...prev, imageUrl: "" }));
                        }}
                    />
                </div>

                {imageUrl && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        Selected: <span className="text-[#EF3866] break-all">{imageUrl}</span>
                    </div>
                )}

                {errors.imageUrl && (
                    <p className="text-sm text-red-400 flex items-center gap-1.5">
                        <AlertCircle size={14} /> {errors.imageUrl}
                    </p>
                )}
            </div>

            {/* Markdown Editor – full modern look */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Your story</span>
                    <div className="flex items-center gap-4">
                        <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                            {body.length} chars
                        </span>
                        <button
                            type="button"
                            onClick={() => setPreviewMode(p => p === 'edit' ? 'preview' : 'edit')}
                            className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-[#EF3866] transition-colors"
                        >
                            {previewMode === 'edit' ? <Eye size={14} /> : <EyeOff size={14} />}
                            {previewMode === 'edit' ? 'Preview' : 'Edit'}
                        </button>
                    </div>
                </div>

                <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm focus-within:border-[#EF3866] focus-within:shadow-md transition-all duration-200">
                    <MDEditor
                        value={body}
                        onChange={handleEditorChange}
                        preview={previewMode}
                        height={460}
                        minHeight={300}
                        visibleDragbar={false}
                        style={{ background: 'transparent' }}
                        textareaProps={{
                            placeholder: `Begin your journey here...\n\nUse markdown magic:\n# Big idea\n**bold statement**\n- key point\n\nDrop images, quotes, code — make it yours.`,
                            style: { fontSize: '16px', lineHeight: '1.7', padding: '1.5rem' }
                        }}
                        previewOptions={{
                            className: "prose prose-lg dark:prose-invert max-w-none p-6 bg-white dark:bg-[#0f0f0f]"
                        }}
                    />
                </div>

                {errors.body && (
                    <p className="text-sm text-red-400 flex items-center gap-1.5">
                        <AlertCircle size={14} /> {errors.body}
                    </p>
                )}
            </div>

            {/* Submit area */}
            <div className="pt-6 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Ready to share your voice with the world?
                </p>

                <Button
                    type="submit"
                    disabled={isPending || isSubmitting}
                    className="bg-[#EF3866] hover:bg-[#d32f5a] text-white px-8 py-6 rounded-xl font-medium text-base shadow-lg hover:shadow-xl transition-all disabled:opacity-60"
                >
                    {isPending || isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Publishing...
                        </>
                    ) : (
                        <>
                            Publish Story
                            <Send className="ml-2 h-5 w-5" />
                        </>
                    )}
                </Button>
            </div>
        </form>
    );
};

export default CreatePostForm;