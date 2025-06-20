export interface TopPost {
  _id: string;
  title: string;
  slug: {
    current: string;
  };
  description?: string;
  publishedAt?: string;
  _createdAt?: string;
  mainImage?: {
    asset: {
      url: string;
    };
    alt?: string;
  };
  author?: {
    name: string;
    image?: {
      asset: {
        url: string;
      };
    };
    imageUrl?: string;
  };
  categories?: {
    title: string;
  }[];
  likeCount: number;
  weeklyLikes: number;
}