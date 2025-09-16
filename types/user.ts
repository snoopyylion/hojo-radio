export interface UserProfile {
  cover_image_url?: string;
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
  image_url?: string | null;
  media_urls: string[];
  author_id: string;
  author: {
    id: string;
    first_name: string;
    last_name: string;
    username: string;
    image_url?: string | null;
    is_verified: boolean;
  };
  likes_count: number;
  comments_count: number;
  bookmarks_count: number;
  shares_count: number;
  published_at: string;
  created_at: string;
  updated_at: string;
  is_liked: boolean;
  is_bookmarked: boolean;
  visibility: 'public' | 'private';
  slug?: string;
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
