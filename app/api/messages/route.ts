// app/api/messages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';
import { SendMessageRequest, Message } from '@/types/messaging';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET - Fetch messages for a conversation
export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const conversationId = searchParams.get('conversation_id');
        const limit = parseInt(searchParams.get('limit') || '50');
        const before = searchParams.get('before'); // For pagination

        if (!conversationId) {
            return NextResponse.json(
                { error: 'Conversation ID is required' },
                { status: 400 }
            );
        }

        // Verify user is participant in conversation
        const { data: participant, error: participantError } = await supabase
            .from('conversation_participants')
            .select('id')
            .eq('conversation_id', conversationId)
            .eq('user_id', userId)
            .is('left_at', null)
            .single();

        if (participantError || !participant) {
            console.error('Participant check error:', participantError);
            return NextResponse.json(
                { error: 'Access denied to this conversation' },
                { status: 403 }
            );
        }

        // Build query
        let query = supabase
            .from('messages')
            .select(`
                id,
                conversation_id,
                sender_id,
                content,
                message_type,
                reply_to_id,
                edited_at,
                deleted_at,
                created_at,
                metadata
            `)
            .eq('conversation_id', conversationId)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (before) {
            query = query.lt('created_at', before);
        }

        const { data: messages, error: messagesError } = await query;

        if (messagesError) {
            console.error('Messages fetch error:', messagesError);
            throw messagesError;
        }

        if (!messages || messages.length === 0) {
            return NextResponse.json({ messages: [] });
        }

        // Get sender details
        const senderIds = [...new Set(messages.map(m => m.sender_id))];
        const { data: senders, error: sendersError } = await supabase
            .from('users')
            .select('id, username, image_url, first_name, last_name')
            .in('id', senderIds);

        if (sendersError) {
            console.error('Senders fetch error:', sendersError);
            // Continue without sender details instead of throwing
        }

        // Get reply-to messages if any
        const replyToIds = messages
            .filter(m => m.reply_to_id)
            .map(m => m.reply_to_id);

        type PartialReplyMessage = Pick<Message, 'id' | 'content' | 'sender_id' | 'created_at'>;
        let replyToMessages: PartialReplyMessage[] = [];

        if (replyToIds.length > 0) {
            const { data, error } = await supabase
                .from('messages')
                .select(`
                    id, 
                    content, 
                    sender_id, 
                    created_at
                `)
                .in('id', replyToIds);

            if (!error && data) {
                replyToMessages = data;
            }
        }

        // Get reactions for messages
        const messageIds = messages.map(m => m.id);
        const { data: reactions, error: reactionsError } = await supabase
            .from('message_reactions')
            .select(`
                id,
                message_id,
                user_id,
                emoji,
                created_at
            `)
            .in('message_id', messageIds);

        if (reactionsError) {
            console.error('Reactions fetch error:', reactionsError);
            // Continue without reactions instead of throwing
        }

        // Enrich messages with sender info, replies, and reactions
        const enrichedMessages = messages.map(message => ({
            ...message,
            sender: senders?.find(s => s.id === message.sender_id) || null,
            reply_to: replyToMessages.find(r => r.id === message.reply_to_id) || null,
            reactions: reactions?.filter(r => r.message_id === message.id) || []
        }));

        // Update last_read_at for the user (don't await to avoid blocking response)
        supabase
            .from('conversation_participants')
            .update({ last_read_at: new Date().toISOString() })
            .eq('conversation_id', conversationId)
            .eq('user_id', userId)
            .then(({ error }) => {
                if (error) {
                    console.error('Failed to update last_read_at:', error);
                }
            });

        return NextResponse.json({
            messages: enrichedMessages.reverse() // Return in chronological order
        });

    } catch (error) {
        console.error('Messages API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST - Send a new message
export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body: SendMessageRequest = await request.json();
        const {
            conversation_id,
            content,
            message_type = 'text',
            reply_to_id,
            metadata = {}
        } = body;

        if (!conversation_id || !content?.trim()) {
            return NextResponse.json(
                { error: 'Conversation ID and content are required' },
                { status: 400 }
            );
        }

        // Verify user is participant in conversation
        const { data: participant, error: participantError } = await supabase
            .from('conversation_participants')
            .select('id')
            .eq('conversation_id', conversation_id)
            .eq('user_id', userId)
            .is('left_at', null)
            .single();

        if (participantError || !participant) {
            console.error('Participant check error:', participantError);
            return NextResponse.json(
                { error: 'Access denied to this conversation' },
                { status: 403 }
            );
        }

        // Validate reply_to_id if provided - FIXED QUERY
        let replyToMessage = null;
        if (reply_to_id) {
            console.log('Fetching reply-to message with ID:', reply_to_id);
            
            const { data: replyData, error: replyError } = await supabase
                .from('messages')
                .select(`
                    id,
                    content,
                    sender_id,
                    message_type,
                    created_at
                `)
                .eq('id', reply_to_id)
                .eq('conversation_id', conversation_id)
                .is('deleted_at', null)
                .single();

            if (replyError) {
                console.error('Reply message fetch error:', replyError);
                // Don't return error, just log it and continue without reply
                console.warn('Could not fetch reply message, continuing without reply reference');
            } else if (replyData) {
                // Get sender details separately
                const { data: replySender } = await supabase
                    .from('users')
                    .select('id, username, image_url, first_name, last_name')
                    .eq('id', replyData.sender_id)
                    .single();

                replyToMessage = {
                    ...replyData,
                    sender: replySender || null
                };
                console.log('Successfully fetched reply-to message:', replyToMessage);
            }
        }

        // Insert message
        const { data: message, error: messageError } = await supabase
            .from('messages')
            .insert({
                conversation_id,
                sender_id: userId,
                content: content.trim(),
                message_type,
                reply_to_id,
                metadata
            })
            .select(`
                id,
                conversation_id,
                sender_id,
                content,
                message_type,
                reply_to_id,
                created_at,
                metadata
            `)
            .single();

        if (messageError) {
            console.error('Message insert error:', messageError);
            throw messageError;
        }

        // Get sender details for response
        const { data: sender, error: senderError } = await supabase
            .from('users')
            .select('id, username, image_url, first_name, last_name')
            .eq('id', userId)
            .single();

        if (senderError) {
            console.error('Sender fetch error:', senderError);
            // Continue without sender details
        }



        const enrichedMessage = {
            ...message,
            sender: sender || null,
            reply_to: replyToMessage, // This should now contain the reply message
            reactions: []
        };

        console.log('Sending enriched message response:', JSON.stringify(enrichedMessage, null, 2));

        return NextResponse.json({
            message: enrichedMessage,
            success: true
        });

    } catch (error) {
        console.error('Send message API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// DELETE - Delete a message by ID
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('id');
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
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }
    if (message.sender_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    // If image, delete from storage
    if (message.message_type === 'image' && message.content) {
      // Extract the path after /object/public/message-files/
      const match = message.content.match(/\/object\/public\/message-files\/(.+)$/);
      if (match && match[1]) {
        const filePath = match[1];
        const { error: storageError } = await supabase.storage.from('message-files').remove([filePath]);
        if (storageError) {
          console.error('Failed to delete image from storage:', storageError);
        }
      }
    }
    // Soft delete the message (set deleted_at)
    const { error: deleteError } = await supabase
      .from('messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', messageId);
    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete message error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}