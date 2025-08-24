// lib/podcast-storage.ts
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary (server-side only)
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

export class PodcastStorage {
  static async uploadAudio(audioBlob: Blob, title: string, userId: string): Promise<string> {
    try {
      // Convert blob to base64
      const base64 = await this.blobToBase64(audioBlob);
      
      // Upload to Cloudinary with user folder organization
      const result = await cloudinary.uploader.upload(base64, {
        resource_type: 'video', // Audio files use 'video' resource type
        folder: `podcasts/${userId}`,
        public_id: `${title.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`,
        format: 'mp3',
        transformation: [
          { quality: 'auto' },
          { fetch_format: 'auto' }
        ]
      });
      
      return result.secure_url;
      
    } catch (error) {
      console.error('Upload failed:', error);
      throw new Error('Failed to upload audio file');
    }
  }
  
  static async uploadThumbnail(imageBlob: Blob, userId: string): Promise<string> {
    try {
      const base64 = await this.blobToBase64(imageBlob);
      
      const result = await cloudinary.uploader.upload(base64, {
        resource_type: 'image',
        folder: `podcast-thumbnails/${userId}`,
        transformation: [
          { width: 500, height: 500, crop: 'fill' },
          { quality: 'auto' },
          { fetch_format: 'auto' }
        ]
      });
      
      return result.secure_url;
      
    } catch {
      throw new Error('Failed to upload thumbnail');
    }
  }
  
  private static blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}