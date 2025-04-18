// lib/sanity/client.js
import { createClient } from '@sanity/client';

export const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: '2023-01-01',
  useCdn: false, // Must be false for authenticated write access
  token: process.env.SANITY_API_TOKEN, // This must be set and have create permissions
});
