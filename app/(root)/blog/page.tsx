"use client";

import React, { useEffect, useState } from "react";
import NewsTile from "@/components/NewsTile";
import { client } from "@/sanity/lib/client";
import { ALL_POSTS_QUERY } from "@/sanity/lib/queries";
import { groq } from "next-sanity";

interface Post {
  _id: string;
  title: string;
  slug: { current: string };
  mainImage?: {
    asset: {
      _ref: string;
      _type: string;
    };
  };
  publishedAt: string;
  author: {
    name: string;
    image?: {
      asset: {
        _ref: string;
        _type: string;
      };
    };
  };
  categories: { title: string }[];
}

// Create a type guard to check if a document matches the Post interface
function isPost(doc: unknown): doc is Post {
  if (typeof doc !== 'object' || doc === null) return false;

  const post = doc as Record<string, any>;

  return (
    typeof post._id === 'string' &&
    typeof post.title === 'string' &&
    post.slug && typeof post.slug.current === 'string' &&
    typeof post.publishedAt === 'string' &&
    post.author && typeof post.author.name === 'string' &&
    Array.isArray(post.categories)
  );
}

const NewsPage = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initial fetch of all posts
    async function fetchPosts() {
      setIsLoading(true);
      try {
        const data = await client.fetch<Post[]>(ALL_POSTS_QUERY);
        setPosts(data);
      } catch (error) {
        console.error("Error fetching posts:", error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchPosts();

    // Set up real-time listener
    const subscription = client
      .listen(
        groq`*[_type == "post"] {
          _id, title, slug, mainImage, publishedAt, _createdAt,
          author->{ name, image },
          categories[]->{ title }
        }`
      )
      .subscribe((update) => {
        // When a document is created, updated, or deleted
        const { result, documentId, mutations } = update;
        
        // Handle different types of updates
        if (mutations.some(m => 'create' in m)) {
          // New post created - add it to the state
          if (result && isPost(result)) {
            setPosts(prevPosts => [result, ...prevPosts]);
          }
        } else if (mutations.some(m => 'delete' in m)) {
          // Post deleted - remove from state
          setPosts(prevPosts => prevPosts.filter(post => post._id !== documentId));
        } else {
          // Post updated - update in state
          if (result && isPost(result)) {
            setPosts(prevPosts => 
              prevPosts.map(post => post._id === result._id ? result : post)
            );
          }
        }
      });

    // Clean up subscription when component unmounts
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const filteredPosts = posts.filter(post =>
    post.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <section className="px-4 pt-[150px] md:px-8 lg:px-16 py-8 bg-gray-50 dark:bg-black min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Latest News</h1>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search news..."
          className="border border-gray-300 dark:border-gray-700 rounded px-4 py-2 w-full max-w-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.length > 0 ? (
            filteredPosts.map(post => <NewsTile key={post._id} post={post} />)
          ) : (
            <p className="text-gray-600 dark:text-gray-300">No posts found.</p>
          )}
        </div>
      )}
    </section>
  );
};

export default NewsPage;