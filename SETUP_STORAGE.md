# Supabase Storage Setup Guide

This guide will help you set up Supabase Storage for file uploads in your messaging system.

## Prerequisites

1. You have a Supabase project set up
2. Your environment variables are configured

## Step 1: Create Storage Bucket

1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **Create a new bucket**
4. Enter the following details:
   - **Name**: `message-files`
   - **Public bucket**: ✅ Check this option
   - **File size limit**: 5 MB
   - **Allowed MIME types**: `image/*`

## Step 2: Configure Bucket Policies

After creating the bucket, you need to set up Row Level Security (RLS) policies:

### Policy 1: Allow authenticated users to upload files

```sql
CREATE POLICY "Allow authenticated users to upload files" ON storage.objects
FOR INSERT 
WITH CHECK (
  bucket_id = 'message-files' AND 
  auth.uid() IS NOT NULL
);
```

### Policy 2: Allow public access to read files

```sql
CREATE POLICY "Allow public access to read files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'message-files'
);
```

### Policy 3: Allow users to delete their own files

```sql
CREATE POLICY "Allow users to delete their own files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'message-files' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);
```

## Step 3: Verify Environment Variables

Make sure these environment variables are set in your `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Step 4: Test the Setup

1. Start your development server
2. Try uploading an image in a conversation
3. Check the browser console for any errors
4. Verify the file appears in your Supabase Storage dashboard

## Troubleshooting

### Common Issues:

1. **"Storage bucket not found" error**
   - Make sure the bucket name is exactly `message-files`
   - Check that the bucket is created in the correct project

2. **"Unauthorized" error**
   - Verify your `SUPABASE_SERVICE_ROLE_KEY` is correct
   - Check that the service role key has the necessary permissions

3. **"File too large" error**
   - The current limit is 5MB per file
   - You can adjust this in the bucket settings

4. **"Invalid file type" error**
   - Only image files (JPEG, PNG, GIF, WebP, SVG) are allowed
   - Check the file extension and MIME type

### Network Issues:

If you're experiencing network timeouts:

1. Check your internet connection
2. Try uploading smaller files first
3. The system will automatically retry failed uploads
4. Check if your Supabase project is in the same region as your users

## Security Notes

- The bucket is public for reading but requires authentication for uploading
- Files are organized by user ID to prevent unauthorized access
- File types are validated on both client and server side
- File size limits are enforced to prevent abuse

## Performance Tips

- Keep file sizes under 1MB for better performance
- Use WebP format for images when possible
- Consider implementing image compression for large uploads
- Monitor your storage usage in the Supabase dashboard 