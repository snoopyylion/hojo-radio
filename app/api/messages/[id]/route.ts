import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const messageId = params.id;
        // Get the message
        const { data: message, error: messageError } = await supabase
            .from('messages')
            .select('id, sender_id, deleted_at')
            .eq('id', messageId)
            .single();
        if (messageError || !message) {
            return NextResponse.json({ error: 'Message not found' }, { status: 404 });
        }
        if (message.sender_id !== userId) {
            return NextResponse.json({ error: 'You can only delete your own messages' }, { status: 403 });
        }
        if (message.deleted_at) {
            return NextResponse.json({ error: 'Message already deleted' }, { status: 400 });
        }
        // Soft delete
        const { error: deleteError } = await supabase
            .from('messages')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', messageId);
        if (deleteError) {
            return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
} 