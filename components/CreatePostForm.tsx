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
            // Add body and categories to formData
            formData.append('body', body);
            categories.forEach(cat => formData.append('categoryIds', cat));

            // Validate form data
            if (!formData.get('title')) {
                setErrors(prev => ({ ...prev, title: "Title is required" }));
                return { ...prevState, error: 'Validation failed', status: 'ERROR' as const };
            }

            if (!formData.get('description')) {
                setErrors(prev => ({ ...prev, description: "Description is required" }));
                return { ...prevState, error: 'Validation failed', status: 'ERROR' as const };
            }

            if (!body) {
                setErrors(prev => ({ ...prev, body: "Content is required" }));
                return { ...prevState, error: 'Validation failed', status: 'ERROR' as const };
            }

            if (!imageUrl) {
                setErrors(prev => ({ ...prev, imageUrl: "Image URL is required" }));
                return { ...prevState, error: 'Validation failed', status: 'ERROR' as const };
            }

            if (categories.length === 0) {
                setErrors(prev => ({ ...prev, categories: "At least one category is required" }));
                return { ...prevState, error: 'Validation failed', status: 'ERROR' as const };
            }

            // Submit to server action
            const result = await createPostItem(prevState, formData);

            console.log("Form Submission Result:", result);

            if (result.status === 'SUCCESS') {
                toast.success("Post created successfully!");
                router.push(`/post/${result._id}`);
            }
            
            return result;
        } catch (error) {
            console.error('Error creating post:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to create post');
            
            return {
                ...prevState,
                error: error instanceof Error ? error.message : 'Unknown error creating post',
                status: "ERROR" as const,
            };
        }
    };

    const [_state, formAction, isPending] = useActionState(handleFormSubmit, {
        error: "",
        status: "INITIAL" as const,
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
                    style={{ borderRadius: 12 }}
                    textareaProps={{ placeholder: "Write your content here..." }}
                />
                {errors.body && <p className="text-sm text-red-500 mt-1">{errors.body}</p>}
            </div>

            {/* Submit Button */}
            <Button
                type="submit"
                className="inline-flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors px-6 py-3 rounded-xl shadow-md disabled:bg-gray-400"
                disabled={isPending}
            >
                {isPending ? "Creating Post..." : "Create Post"}
                <Send className="w-4 h-4" />
            </Button>
        </form>
    );
};

export default CreatePostForm;