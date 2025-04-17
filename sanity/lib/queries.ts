import { defineQuery } from 'next-sanity';

// All posts for homepage or admin
export const ALL_POSTS_QUERY = defineQuery(`
  *[_type == "post"] | order(publishedAt desc) {
    _id,
    title,
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
export const POSTS_BY_AUTHOR_QUERY = defineQuery(`
  *[_type == "post" && author._ref == $id] | order(publishedAt desc) {
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

