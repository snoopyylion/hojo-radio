import { client } from '@/sanity/lib/client';
import { Metadata } from 'next';
import PostClientWrapper from './PostClientWrapper'; // Changed import

type PageProps = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  
  try {
    const post = await client.fetch(
      `*[_type == "post" && _id == $id][0]{
        title,
        description
      }`,
      { id }
    );

    return {
      title: post?.title || `Post ${id}`,
      description: post?.description || 'Read this amazing post'
    };
  } catch (error) {
    console.error("Error fetching metadata:", error);
    return {
      title: "Post",
      description: "Read this amazing post"
    };
  }
}

export default async function PostPage({ params }: PageProps) {
  const { id } = await params;

  return <PostClientWrapper id={id} />; // Use wrapper instead
}