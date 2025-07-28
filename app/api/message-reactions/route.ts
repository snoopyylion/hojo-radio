// app/api/message-reactions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// POST - Add or remove reaction to/from a message
export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { message_id, emoji } = body;

        if (!message_id || !emoji) {
            return NextResponse.json(
                { error: 'Message ID and emoji are required' },
                { status: 400 }
            );
        }

        // First, get the message to find its conversation
        const { data: message, error: messageError } = await supabase
            .from('messages')
            .select('id, conversation_id')
            .eq('id', message_id)
            .is('deleted_at', null)
            .single();

        if (messageError || !message) {
            console.error('Message not found:', messageError);
            return NextResponse.json(
                { error: 'Message not found' },
                { status: 404 }
            );
        }

        // Verify user is participant in the conversation
        const { data: participant, error: participantError } = await supabase
            .from('conversation_participants')
            .select('id')
            .eq('conversation_id', message.conversation_id)
            .eq('user_id', userId)
            .is('left_at', null)
            .single();

        if (participantError || !participant) {
            console.error('Access denied to conversation:', participantError);
            return NextResponse.json(
                { error: 'Access denied to this conversation' },
                { status: 403 }
            );
        }

        // Check if user already reacted with this emoji
        const { data: existingReaction, error: reactionCheckError } = await supabase
            .from('message_reactions')
            .select('id')
            .eq('message_id', message_id)
            .eq('user_id', userId)
            .eq('emoji', emoji)
            .single();

        if (reactionCheckError && reactionCheckError.code !== 'PGRST116') {
            // PGRST116 is "not found" error, which is expected if no reaction exists
            console.error('Reaction check error:', reactionCheckError);
            return NextResponse.json(
                { error: 'Failed to check existing reaction' },
                { status: 500 }
            );
        }

        if (existingReaction) {
            // Remove existing reaction (toggle off)
            const { error: deleteError } = await supabase
                .from('message_reactions')
                .delete()
                .eq('id', existingReaction.id);

            if (deleteError) {
                console.error('Delete reaction error:', deleteError);
                throw deleteError;
            }

            return NextResponse.json({
                success: true,
                action: 'removed',
                message: 'Reaction removed successfully'
            });
        } else {
            // Add new reaction
            const { data: newReaction, error: insertError } = await supabase
                .from('message_reactions')
                .insert({
                    message_id,
                    user_id: userId,
                    emoji
                })
                .select(`
                    id,
                    message_id,
                    user_id,
                    emoji,
                    created_at
                `)
                .single();

            if (insertError) {
                console.error('Insert reaction error:', insertError);
                throw insertError;
            }

            // Get user details for the reaction
            const { data: user, error: userError } = await supabase
                .from('users')
                .select('id, username, image_url, first_name, last_name')
                .eq('id', userId)
                .single();

            if (userError) {
                console.error('User fetch error:', userError);
                // Continue without user details
            }

            const enrichedReaction = {
                ...newReaction,
                user: user || null
            };

            return NextResponse.json({
                success: true,
                action: 'added',
                reaction: enrichedReaction,
                message: 'Reaction added successfully'
            });
        }

    } catch (error) {
        console.error('Message reactions API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// GET - Get reactions for a specific message
export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const messageId = searchParams.get('message_id');

        if (!messageId) {
            return NextResponse.json(
                { error: 'Message ID is required' },
                { status: 400 }
            );
        }

        // First, get the message to find its conversation
        const { data: message, error: messageError } = await supabase
            .from('messages')
            .select('id, conversation_id')
            .eq('id', messageId)
            .is('deleted_at', null)
            .single();

        if (messageError || !message) {
            return NextResponse.json(
                { error: 'Message not found' },
                { status: 404 }
            );
        }

        // Verify user has access to the conversation
        const { data: participant, error: participantError } = await supabase
            .from('conversation_participants')
            .select('id')
            .eq('conversation_id', message.conversation_id)
            .eq('user_id', userId)
            .is('left_at', null)
            .single();

        if (participantError || !participant) {
            return NextResponse.json(
                { error: 'Access denied to this conversation' },
                { status: 403 }
            );
        }

        // Get all reactions for the message
        const { data: reactions, error: reactionsError } = await supabase
            .from('message_reactions')
            .select(`
                id,
                message_id,
                user_id,
                emoji,
                created_at,
                users (
                    id,
                    username,
                    image_url,
                    first_name,
                    last_name
                )
            `)
            .eq('message_id', messageId)
            .order('created_at', { ascending: true });

        if (reactionsError) {
            console.error('Reactions fetch error:', reactionsError);
            return NextResponse.json(
                { error: 'Failed to fetch reactions' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            reactions: reactions || []
        });

    } catch (error) {
        console.error('Get reactions API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}