import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id: messageId } = await context.params;
    if (!messageId) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }
    // Fetch the message to check ownership and type
    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('id, sender_id, message_type, content')
      .eq('id', messageId)
      .single();
    if (fetchError || !message) {
      console.error('Fetch message error:', fetchError);
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }
    if (message.sender_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    // If image, delete from storage
    if (message.message_type === 'image' && message.content) {
      const match = message.content.match(/\/object\/public\/message-files\/(.+)$/);
      if (match && match[1]) {
        const filePath = match[1];
        const { error: storageError } = await supabase.storage.from('message-files').remove([filePath]);
        if (storageError) {
          console.error('Failed to delete image from storage:', storageError);
          // Optionally, return an error here if you want to block deletion on storage failure
        }
      }
    }
    // Soft delete the message (set deleted_at only)
    const now = new Date().toISOString();
    const { error: deleteError } = await supabase
      .from('messages')
      .update({ deleted_at: now })
      .eq('id', messageId);
    if (deleteError) {
      console.error('Failed to soft delete message:', deleteError);
      return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete message error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 