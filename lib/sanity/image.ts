import { createClient } from "next-sanity";
import imageUrlBuilder from "@sanity/image-url";

const config = {
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
    token: process.env.SANITY_API_TOKEN!, // This must have write permissions
    useCdn: true,
    apiVersion: '2023-10-10',
};

// Define a type for Sanity image source
interface SanityImageSource {
  asset: {
    _ref: string;
    _type: string;
  };
  [key: string]: unknown; // For any other properties that might be present
}

const client = createClient(config);
const builder = imageUrlBuilder(client);
export const urlFor = (source: SanityImageSource) => builder.image(source);