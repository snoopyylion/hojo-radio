"use client";
import { useEffect, useState } from "react";

export default function UserPosts({ userId }: { userId: string }) {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const fetchPosts = async () => {
      const res = await fetch(`/api/post/pubic?userId=${userId}`);
      const data = await res.json();
      setPosts(data);
    };
    fetchPosts();
  }, [userId]);

  return (
    <ul>
      {posts.map((post: any) => (
        <li key={post._id}>{post.title}</li>
      ))}
    </ul>
  );
}
