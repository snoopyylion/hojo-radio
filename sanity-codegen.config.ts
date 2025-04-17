// sanity-codegen.config.ts
import { defineConfig } from 'sanity-codegen'; // Ensure this import is correct

export default defineConfig({
  schemaPath: './sanity/schema', // Path to the folder where your schema files reside
  outputPath: './types/sanity.types.ts', // Path where the generated types should be saved
});
