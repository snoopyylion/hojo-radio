// app/api/conversations/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET - Get conversation details
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const conversationId = params.id;

        // Get conversation with participants
        const { data: conversation, error } = await supabase
            .from('conversations')
            .select(`
                *,
                conversation_participants (
                    *,
                    users (
                        id,
                        username,
                        image_url,
                        first_name,
                        last_name
                    )
                )
            `)
            .eq('id', conversationId)
            .single();

        if (error || !conversation) {
            return NextResponse.json(
                { error: 'Conversation not found' },
                { status: 404 }
            );
        }

        // Check if user is participant
        const isParticipant = conversation.conversation_participants.some(
            (p: any) => p.user_id === userId && !p.left_at
        );

        if (!isParticipant) {
            return NextResponse.json(
                { error: 'Access denied' },
                { status: 403 }
            );
        }

        return NextResponse.json({ conversation });

    } catch (error) {
        console.error('Get conversation API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// PATCH - Update conversation settings
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const conversationId = params.id;
        const body = await request.json();
        const { name, description, image_url } = body;

        // Check if user is admin of the conversation
        const { data: participant, error: participantError } = await supabase
            .from('conversation_participants')
            .select('role')
            .eq('conversation_id', conversationId)
            .eq('user_id', userId)
            .is('left_at', null)
            .single();

        if (participantError || !participant || participant.role !== 'admin') {
            return NextResponse.json(
                { error: 'Admin access required' },
                { status: 403 }
            );
        }

        // Update conversation
        const updates: any = {};
        if (name !== undefined) updates.name = name;
        if (description !== undefined) updates.description = description;
        if (image_url !== undefined) updates.image_url = image_url;

        const { data: updatedConversation, error: updateError } = await supabase
            .from('conversations')
            .update(updates)
            .eq('id', conversationId)
            .select()
            .single();

        if (updateError) {
            console.error('Update conversation error:', updateError);
            throw updateError;
        }

        return NextResponse.json({
            conversation: updatedConversation,
            success: true
        });

    } catch (error) {
        console.error('Update conversation API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// DELETE - Delete conversation (creator only)
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const conversationId = params.id;

        // Check if user is the creator
        const { data: conversation, error: conversationError } = await supabase
            .from('conversations')
            .select('created_by')
            .eq('id', conversationId)
            .single();

        if (conversationError || !conversation) {
            return NextResponse.json(
                { error: 'Conversation not found' },
                { status: 404 }
            );
        }

        if (conversation.created_by !== userId) {
            return NextResponse.json(
                { error: 'Only the creator can delete the conversation' },
                { status: 403 }
            );
        }

        // Delete conversation (this will cascade delete participants and messages)
        const { error: deleteError } = await supabase
            .from('conversations')
            .delete()
            .eq('id', conversationId);

        if (deleteError) {
            console.error('Delete conversation error:', deleteError);
            throw deleteError;
        }

        return NextResponse.json({
            success: true,
            message: 'Conversation deleted successfully'
        });

    } catch (error) {
        console.error('Delete conversation API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
} 