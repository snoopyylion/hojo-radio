import { client } from '@/sanity/lib/client';
import { notFound } from 'next/navigation';
import { PortableText } from '@portabletext/react';
import type { PortableTextReactComponents } from '@portabletext/react';
import Image from 'next/image';
import { formatDate } from "@/lib/utils";
import markdownIt from "markdown-it";

const md = markdownIt();

const ptComponents: Partial<PortableTextReactComponents> = {
  types: {
    image: ({ value }) => {
      if (!value?.asset?.url) return null;
      return (
        <div className="relative w-full aspect-video my-6">
          <Image
            src={value.asset.url}
            alt={value.alt || 'Post image'}
            fill
            className="object-cover rounded-xl shadow-md"
          />
        </div>
      );
    },
  },
  marks: {
    link: ({ children, value }) => {
      const rel = value?.href && !value.href.startsWith('/') ? 'noreferrer noopener' : undefined;
      return (
        <a href={value?.href || '#'} rel={rel} className="text-[#EF3866] font-medium hover:underline">
          {children}
        </a>
      );
    },
  },
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  // Await the params Promise to get the id
  const resolvedParams = await params;
  const id = resolvedParams.id;
  
  return {
    title: `Post ${id}`,
  };
}

// Type the props of the PostPage component to expect an id param
export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  // Await the params Promise to get the id
  const resolvedParams = await params;
  const id = resolvedParams.id;

  if (!id) {
    return notFound(); // Handle the case where there's no id
  }

  const post = await client.fetch(
    `*[_type == "post" && _id == $id][0]{
      _id, title, slug, description, body, publishedAt, _createdAt,
      mainImage{ asset->{url}, alt },
      "author": author->{ name, bio, image{asset->{url}}, "imageUrl": image.asset->url },
      categories[]->{title}
    }`,
    { id }
  );

  if (!post) notFound();

  let contentToRender;
  let isPortableText = false;

  if (typeof post.body === 'object' && post.body !== null) {
    contentToRender = post.body;
    isPortableText = true;
  } else if (typeof post.body === 'string') {
    contentToRender = md.render(post.body);
  } else {
    contentToRender = null;
  }

  return (
    <div className="bg-white dark:bg-black transition-colors duration-300 min-h-screen">
      {/* Hero Section */}
      <section className="pt-[150px] bg-gradient-to-r from-pink-100 via-white to-purple-100 dark:from-pink-950 dark:via-gray-950 dark:to-purple-950 py-16 text-center px-4 md:px-10 transition-colors duration-300">
        <p className="uppercase text-sm text-gray-500 dark:text-gray-400 tracking-widest transition-colors">
          {formatDate(post.publishedAt || post._createdAt)}
        </p>
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white mt-4 transition-colors">
          {post.title}
        </h1>
        {post.description && (
          <p className="mt-4 max-w-2xl mx-auto text-base md:text-lg text-gray-600 dark:text-gray-300 transition-colors">
            {post.description}
          </p>
        )}
      </section>

      {/* Floating Action Buttons */}
      <div className="mt-10 flex justify-center gap-4 flex-wrap px-4">
        {[
          { label: 'Like', icon: '❤️', color: 'bg-[#EF3866]' },
          { label: 'Share', icon: '🔗', color: 'bg-blue-500' },
          { label: 'Favorite', icon: '⭐', color: 'bg-yellow-500' },
          { label: 'Summarize', icon: '⚡', color: 'bg-purple-600' },
          { label: 'Play', icon: '▶️', color: 'bg-green-600' },
        ].map(({ label, icon, color }) => (
          <button
            key={label}
            className={`${color} text-white px-5 py-2 rounded-full hover:brightness-110 transition flex items-center gap-2 shadow-md text-sm md:text-base`}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {/* Main Post Section */}
      <section className="px-4 md:px-10 py-14 max-w-6xl mx-auto">
        {post.mainImage?.asset?.url && (
          <div className="w-full aspect-video relative rounded-xl overflow-hidden shadow-xl mb-12">
            <Image
              src={post.mainImage.asset.url}
              alt={post.mainImage.alt || post.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 1200px"
              priority
            />
          </div>
        )}

        {/* Author + Category */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          {post.author && (
            <div className="flex items-center gap-4">
              {post.author.imageUrl || post.author.image?.asset?.url ? (
                <Image
                  src={post.author.imageUrl || post.author.image?.asset?.url}
                  alt="Author"
                  width={60}
                  height={60}
                  className="rounded-full border-2 border-[#EF3866] object-cover"
                />
              ) : null}
              <div>
                <p className="font-semibold text-lg text-gray-900 dark:text-white transition-colors">
                  {post.author.name}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors">
                  @{post.author.name?.toLowerCase().replace(/\s+/g, '')}
                </p>
              </div>
            </div>
          )}
          {post.categories?.length > 0 && (
            <span className="inline-block bg-[#fce7f3] dark:bg-[#4c1d38] text-[#d7325a] dark:text-[#ff5e8a] text-sm font-medium px-4 py-1 rounded-full shadow-sm transition-colors">
              {post.categories[0].title}
            </span>
          )}
        </div>

        {/* Post Content */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-100 dark:border-gray-700 transition-colors">
          <div className="text-gray-800 dark:text-gray-200 prose prose-p:leading-7 prose-headings:font-bold prose-img:rounded-xl max-w-none prose-a:text-[#EF3866] dark:prose-a:text-[#ff7a9c] dark:prose-headings:text-white dark:prose-p:text-gray-300 dark:prose-strong:text-white dark:prose-li:text-gray-300 transition-colors">
            {isPortableText ? (
              <PortableText value={contentToRender} components={ptComponents} />
            ) : contentToRender ? (
              <article dangerouslySetInnerHTML={{ __html: contentToRender }} />
            ) : (
              <p className="text-center text-gray-400 dark:text-gray-500 italic transition-colors">
                No content available.
              </p>
            )}
          </div>
        </div>
        
        {/* Related Posts or Comments Section */}
        <div className="mt-8 bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-100 dark:border-gray-700 transition-colors">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">💬 Discussion</h2>
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded border border-gray-200 dark:border-gray-600 text-sm text-gray-800 dark:text-gray-200 transition-colors">
            <p className="text-center text-gray-500 dark:text-gray-400">
              Be the first to start the discussion!
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}