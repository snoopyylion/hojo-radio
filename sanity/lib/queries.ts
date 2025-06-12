import { defineQuery } from 'next-sanity';

// All posts for homepage or admin
export const ALL_POSTS_QUERY = defineQuery(`
  *[_type == "post"] | order(publishedAt desc) {
    _id,
    title,
    description,
    slug,
    publishedAt,
    mainImage,
    "author": author->{_id, name, slug, image},
    categories[]->{title, slug},
    likes,
    comments
  }
`);

// Single post by slug
export const POST_BY_SLUG_QUERY = defineQuery(`
  *[_type == "post" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    publishedAt,
    body,
    mainImage,
    "author": author->{_id, name, slug, image},
    categories[]->{title, slug},
    likes,
    comments
  }
`);

// Get all categories
export const ALL_CATEGORIES_QUERY = defineQuery(`
  *[_type == "category"] | order(title asc) {
    _id,
    title
  }
`);

// Likes count and comment summary for a post
export const POST_META_QUERY = defineQuery(`
  *[_type == "post" && _id == $id][0] {
    _id,
    likes,
    comments
  }
`);

// All posts by author (admin view)
export const POSTS_BY_AUTHOR_QUERY = `
  *[_type == "post" && author._ref == $id] | order(publishedAt desc, _createdAt desc) {
    _id,
    _createdAt,
    _updatedAt,
    title,
    slug,
    description,
    excerpt,
    body,
    mainImage {
      asset -> {
        url,
        metadata {
          dimensions
        }
      }
    },
    author -> {
      _id,
      name,
      slug,
      image {
        asset -> {
          url
        }
      }
    },
    categories[] -> {
      _id,
      title
    },
    publishedAt,
    likes,
    comments
  }
`;

export const AUTHOR_EXISTS_QUERY = `
  *[_type == "author" && _id == $authorId][0] {
    _id,
    name,
    slug,
    bio,
    image {
      asset -> {
        url
      }
    }
  }
`;

export const ALL_AUTHORS_QUERY = `
  *[_type == "author"] {
    _id,
    name,
    slug,
    bio
  }
`;

export const CREATE_AUTHOR_MUTATION = `
  {
    "create": {
      "_type": "author",
      "name": $name,
      "slug": {
        "_type": "slug",
        "current": $slug
      },
      "bio": $bio,
      "image": $image,
      "email": $email,
      "userId": $userId
    }
  }
`;


// Posts by status (admin view)
export const POSTS_BY_STATUS_QUERY = defineQuery(`
  *[_type == "post" && status == $status] | order(publishedAt desc) {
    _id,
    title,
    slug,
    publishedAt,
    mainImage,
    likes,
    comments,
    "author": author->{_id, name, image},
    categories[]->{title}
  }
`);

// ========== NEW SEARCH QUERIES ==========

// Search posts by title, description, or author name
export const SEARCH_POSTS_QUERY = defineQuery(`
  *[_type == "post" && (
    title match $searchTerm ||
    description match $searchTerm ||
    author->name match $searchTerm ||
    categories[]->title match $searchTerm
  )] | order(publishedAt desc) [0...$limit] {
    _id,
    title,
    description,
    slug,
    publishedAt,
    mainImage,
    "author": author->{_id, name, slug, image},
    categories[]->{title, slug},
    likes,
    comments,
    "excerpt": pt::text(body)[0...150] + "..."
  }
`);

// Search authors/users in Sanity
export const SEARCH_AUTHORS_QUERY = defineQuery(`
  *[_type == "author" && name match $searchTerm] | order(name asc) [0...$limit] {
    _id,
    name,
    slug,
    image,
    bio
  }
`);

// Get featured/trending posts for search suggestions
export const TRENDING_POSTS_QUERY = defineQuery(`
  *[_type == "post"] | order(likes desc, publishedAt desc) [0..5] {
    _id,
    title,
    slug,
    likes,
    "author": author->{name}
  }
`);

// Search posts by category
export const SEARCH_POSTS_BY_CATEGORY_QUERY = defineQuery(`
  *[_type == "post" && categories[]->title match $searchTerm] | order(publishedAt desc) [0...$limit] {
    _id,
    title,
    description,
    slug,
    publishedAt,
    mainImage,
    "author": author->{_id, name, slug, image},
    categories[]->{title, slug},
    likes,
    comments
  }
`);

// Global search query (searches across multiple fields)
export const GLOBAL_SEARCH_QUERY = defineQuery(`
  {
    "posts": *[_type == "post" && (
      title match $searchTerm ||
      description match $searchTerm ||
      author->name match $searchTerm ||
      categories[]->title match $searchTerm
    )] | order(publishedAt desc) [0...$limit] {
      _id,
      title,
      description,
      slug,
      publishedAt,
      mainImage,
      "author": author->{_id, name, slug, image},
      categories[]->{title, slug},
      likes,
      comments,
      "excerpt": pt::text(body)[0...150] + "...",
      "type": "post"
    },
    "authors": *[_type == "author" && name match $searchTerm] | order(name asc) [0...$limit] {
      _id,
      name,
      slug,
      image,
      bio,
      "type": "author"
    },
    "categories": *[_type == "category" && title match $searchTerm] | order(title asc) [0...$limit] {
      _id,
      title,
      slug,
      "type": "category"
    }
  }
`);