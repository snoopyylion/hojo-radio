// app/api/conversations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';
import { CreateConversationRequest } from '@/types/messaging';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET - Fetch user's conversations
export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = parseInt(searchParams.get('offset') || '0');
        const withUserId = searchParams.get('with_user_id'); // New parameter to find specific conversation

        // If searching for a specific conversation with another user
        if (withUserId) {
            const { data: existingConversation, error } = await supabase
                .rpc('find_direct_conversation', {
                    user1_id: userId,
                    user2_id: withUserId
                });

            if (error) {
                console.error('Error finding conversation:', error);
                return NextResponse.json({ conversation: null });
            }

            if (existingConversation && existingConversation.length > 0) {
                return NextResponse.json({ conversation: existingConversation[0] });
            } else {
                return NextResponse.json({ conversation: null });
            }
        }

        // Get conversations with participants and last message
        const { data: conversations, error } = await supabase
            .from('conversations')
            .select(`
                id,
                created_at,
                updated_at,
                last_message_at,
                type,
                conversation_participants!inner (
                    user_id,
                    role,
                    last_read_at,
                    left_at
                )
            `)
            .eq('conversation_participants.user_id', userId)
            .is('conversation_participants.left_at', null)
            .order('last_message_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        // Get participant details and last messages
        const conversationIds = conversations.map(c => c.id);

        if (conversationIds.length === 0) {
            return NextResponse.json({ conversations: [] });
        }

        // Get all participants for these conversations
        const { data: allParticipants, error: participantsError } = await supabase
            .from('conversation_participants')
            .select('*')
            .in('conversation_id', conversationIds)
            .is('left_at', null);

        if (participantsError) throw participantsError;

        // Get user details from your users table
        const userIds = allParticipants.map(p => p.user_id);
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, username, image_url, first_name, last_name')
            .in('id', userIds);

        if (usersError) throw usersError;

        // Get last message for each conversation
        const { data: lastMessages, error: messagesError } = await supabase
            .from('messages')
            .select('*')
            .in('conversation_id', conversationIds)
            .order('created_at', { ascending: false });

        if (messagesError) throw messagesError;

        // Build response with enriched data
        const enrichedConversations = conversations.map(conversation => {
            const participants = allParticipants
                .filter(p => p.conversation_id === conversation.id)
                .map(participant => ({
                    ...participant,
                    user: users.find(u => u.id === participant.user_id)
                }));

            const lastMessage = lastMessages.find(m => m.conversation_id === conversation.id);

            // Calculate unread count
            const userParticipant = participants.find(p => p.user_id === userId);
            const unreadCount = lastMessages.filter(m =>
                m.conversation_id === conversation.id &&
                new Date(m.created_at) > new Date(userParticipant?.last_read_at || '1970-01-01')
            ).length;

            if (!userParticipant) {
                console.warn('⚠️ userParticipant not found for conversation:', conversation.id);
            }

            return {
                ...conversation,
                participants,
                last_message: lastMessage,
                unread_count: unreadCount
            };
        });

        return NextResponse.json({ conversations: enrichedConversations });

    } catch (error) {
        console.error('Conversations API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST - Create new conversation or find existing one
export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body: CreateConversationRequest = await request.json();
        const { participant_ids, type = 'direct' } = body;

        if (!participant_ids || participant_ids.length === 0) {
            return NextResponse.json(
                { error: 'Participant IDs are required' },
                { status: 400 }
            );
        }

        // For direct messages, check if conversation already exists
        if (type === 'direct' && participant_ids.length === 1) {
            const otherUserId = participant_ids[0];

            // Use a more reliable approach to find existing conversation
            const { data: existingConversations, error: checkError } = await supabase
                .from('conversation_participants')
                .select(`
                    conversation_id,
                    conversations!inner (
                        id,
                        type
                    )
                `)
                .eq('user_id', userId)
                .eq('conversations.type', 'direct')
                .is('left_at', null);

            if (checkError) {
                console.error('Error checking existing conversations:', checkError);
            } else if (existingConversations) {
                // For each conversation, check if the other user is also a participant
                for (const conv of existingConversations) {
                    const { data: otherParticipant, error: otherError } = await supabase
                        .from('conversation_participants')
                        .select('user_id')
                        .eq('conversation_id', conv.conversation_id)
                        .eq('user_id', otherUserId)
                        .is('left_at', null)
                        .single();

                    if (!otherError && otherParticipant) {
                        // Conversation already exists between these two users
                        return NextResponse.json({ 
                            conversation_id: conv.conversation_id,
                            message: 'Existing conversation found' 
                        });
                    }
                }
            }
        }

        // Verify all participants are following each other (for direct messages)
        if (type === 'direct') {
            const otherUserId = participant_ids[0];

            // Check if users follow each other
            const { data: followCheck } = await supabase
                .from('follows')
                .select('id')
                .or(`and(follower_id.eq.${userId},following_id.eq.${otherUserId}),and(follower_id.eq.${otherUserId},following_id.eq.${userId})`);

            if (!followCheck || followCheck.length < 2) {
                return NextResponse.json(
                    { error: 'Users must follow each other to start a conversation' },
                    { status: 403 }
                );
            }
        }

        // Create conversation
        const { data: conversation, error: conversationError } = await supabase
            .from('conversations')
            .insert({
                type,
                created_by: userId
            })
            .select('id')
            .single();

        if (conversationError) throw conversationError;

        // Add participants (including current user)
        const participantsToAdd = [userId, ...participant_ids];
        const participantInserts = participantsToAdd.map(participantId => ({
            conversation_id: conversation.id,
            user_id: participantId,
            role: participantId === userId ? 'admin' : 'member'
        }));

        const { error: participantsError } = await supabase
            .from('conversation_participants')
            .insert(participantInserts);

        if (participantsError) throw participantsError;

        return NextResponse.json({
            conversation_id: conversation.id,
            message: 'Conversation created successfully'
        });

    } catch (error) {
        console.error('Create conversation API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}