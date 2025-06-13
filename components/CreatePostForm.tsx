"use client";

import React, { useState, useEffect } from "react";
import { useActionState } from "react";
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import MDEditor from '@uiw/react-md-editor';
import { Button } from './ui/button';
import { Send, AlertCircle, Eye, EyeOff, Plus, X, Hash, Image as ImageIcon } from 'lucide-react';
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
    const [focusedField, setFocusedField] = useState<string | null>(null);
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
        <div className="w-full max-w-2xl mx-auto">
            {/* Header */}
            <div className="mb-12 text-center">
                <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mb-3">
                    Share your story
                </h1>
                <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                    Create compelling content that resonates with your audience
                </p>
            </div>

            <form action={formAction} className="space-y-8">
                
                {/* Title Field */}
                <div className="space-y-2">
                    <div className="relative">
                        <Input
                            id="title"
                            name="title"
                            className={`w-full text-2xl font-medium border-0 border-b-2 rounded-none bg-transparent px-0 py-4 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-[#EF3866] transition-colors ${
                                focusedField === 'title' ? 'border-[#EF3866]' : 'border-gray-200 dark:border-gray-700'
                            }`}
                            required
                            placeholder="Your compelling headline..."
                            onFocus={() => setFocusedField('title')}
                            onBlur={() => setFocusedField(null)}
                            onChange={(e) => {
                                if (errors.title && e.target.value.length >= 3) {
                                    setErrors(prev => ({ ...prev, title: "" }));
                                }
                            }}
                        />
                    </div>
                    {errors.title && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.title}
                        </p>
                    )}
                </div>

                {/* Description Field */}
                <div className="space-y-2">
                    <div className="relative">
                        <Textarea
                            id="description"
                            name="description"
                            className={`w-full text-lg border-0 border-b-2 rounded-none bg-transparent px-0 py-4 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-[#EF3866] resize-none transition-colors ${
                                focusedField === 'description' ? 'border-[#EF3866]' : 'border-gray-200 dark:border-gray-700'
                            }`}
                            required
                            placeholder="Write a captivating summary that draws readers in..."
                            rows={3}
                            onFocus={() => setFocusedField('description')}
                            onBlur={() => setFocusedField(null)}
                            onChange={(e) => {
                                if (errors.description && e.target.value.length >= 10) {
                                    setErrors(prev => ({ ...prev, description: "" }));
                                }
                            }}
                        />
                    </div>
                    {errors.description && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.description}
                        </p>
                    )}
                </div>

                {/* Categories Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        <Hash className="w-4 h-4" />
                        <span className="text-sm font-medium">Categories</span>
                    </div>
                    
                    {/* Selected Categories */}
                    {categories.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                            {categories.map(categoryId => {
                                const category = categoryOptions.find(cat => cat._id === categoryId);
                                return category ? (
                                    <span
                                        key={categoryId}
                                        className="inline-flex items-center gap-1 px-3 py-1 bg-[#EF3866]/10 text-[#EF3866] dark:bg-[#EF3866]/20 rounded-full text-sm font-medium"
                                    >
                                        {category.title}
                                        <button
                                            type="button"
                                            onClick={() => removeCategory(categoryId)}
                                            className="hover:bg-[#EF3866]/20 rounded-full p-0.5 transition-colors"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ) : null;
                            })}
                        </div>
                    )}

                    {/* Available Categories */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {categoryOptions
                            .filter(cat => !categories.includes(cat._id))
                            .map((cat) => (
                                <button
                                    key={cat._id}
                                    type="button"
                                    onClick={() => addCategory(cat._id)}
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-[#EF3866] hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors text-left"
                                >
                                    <Plus className="w-3 h-3" />
                                    {cat.title}
                                </button>
                            ))}
                    </div>
                    
                    {errors.categories && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.categories}
                        </p>
                    )}
                </div>

                {/* Featured Image Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        <ImageIcon className="w-4 h-4" />
                        <span className="text-sm font-medium">Featured Image</span>
                    </div>
                    
                    <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:border-[#EF3866] transition-colors">
                        <ImageUploader
                            onImageReady={(url) => {
                                setImageUrl(url);
                                if (errors.imageUrl && url) {
                                    setErrors(prev => ({ ...prev, imageUrl: "" }));
                                }
                            }}
                        />
                    </div>
                    
                    {errors.imageUrl && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.imageUrl}
                        </p>
                    )}
                </div>

                {/* Content Editor */}
                <div className="space-y-4" data-color-mode="auto">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Tell your story
                        </span>
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                {body.length} characters
                            </span>
                            <button
                                type="button"
                                onClick={() => setPreviewMode(prev => prev === 'edit' ? 'preview' : 'edit')}
                                className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-[#EF3866] transition-colors"
                            >
                                {previewMode === 'edit' ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                {previewMode === 'edit' ? 'Preview' : 'Edit'}
                            </button>
                        </div>
                    </div>
                    
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden focus-within:border-[#EF3866] transition-colors">
                        <MDEditor
                            id="body"
                            value={body}
                            onChange={handleEditorChange}
                            preview={previewMode}
                            height={300}
                            style={{ 
                                backgroundColor: 'transparent',
                                border: 'none'
                            }}
                            textareaProps={{ 
                                placeholder: `Start writing your story...

Use **bold** for emphasis, *italics* for subtlety
# Headers for structure
- Lists for clarity

Your authentic voice matters most.`,
                                style: {
                                    fontSize: '16px',
                                    lineHeight: '1.6',
                                    padding: '16px'
                                }
                            }}
                            previewOptions={{ 
                                disallowedElements: ["style"],
                                className: "prose dark:prose-invert max-w-none p-4"
                            }}
                        />
                    </div>
                    
                    {errors.body && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.body}
                        </p>
                    )}
                </div>

                {/* Submit Section */}
                <div className="pt-8 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Ready to inspire others?
                        </p>
                        <Button
                            type="submit"
                            className="bg-[#EF3866] hover:bg-[#EF3866]/90 text-white px-8 py-2 rounded-full font-medium transition-all transform hover:scale-105 disabled:opacity-50 disabled:scale-100"
                            disabled={isPending || isSubmitting}
                        >
                            {isPending || isSubmitting ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Publishing...
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    Publish Story
                                    <Send className="w-4 h-4" />
                                </div>
                            )}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default CreatePostForm;