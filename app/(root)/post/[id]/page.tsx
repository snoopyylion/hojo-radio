import { client } from '@/sanity/lib/client';
import { Metadata } from 'next';
import PostClient from './PostClient';

interface PostPageProps {
  params: { id: string };
}

export async function generateMetadata(context: { params: { id: string } }): Promise<Metadata> {
  const { id } = await context.params;
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

export default async function PostPage(context: { params: { id: string } }) {
  const { id } = await context.params;

  return <PostClient id={id} />;
}

