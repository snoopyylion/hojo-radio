export interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  username?: string;
  role: 'user' | 'author';
  bio?: string;
  location?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
  followers_count: number;
  following_count: number;
  posts_count: number;
}

export interface UserPost {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  published_at: string;
  likes_count: number;
  comments_count: number;
  image_url?: string;
}

export interface FollowUser {
  id: string;
  first_name: string;
  last_name: string;
  username?: string;
  role: string;
  image_url?: string;
  bio?: string;
}
