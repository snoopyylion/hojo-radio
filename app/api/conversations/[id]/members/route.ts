// app/api/conversations/[id]/members/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// POST - Add member to conversation
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const conversationId = (await params).id;
        const body = await request.json();
        const { user_id } = body;

        if (!user_id) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            );
        }

        // Check if current user is admin
        const { data: currentParticipant, error: currentParticipantError } = await supabase
            .from('conversation_participants')
            .select('role')
            .eq('conversation_id', conversationId)
            .eq('user_id', userId)
            .is('left_at', null)
            .single();

        if (currentParticipantError || !currentParticipant || currentParticipant.role !== 'admin') {
            return NextResponse.json(
                { error: 'Admin access required' },
                { status: 403 }
            );
        }

        // Check if user is already a participant
        const { data: existingParticipant } = await supabase
            .from('conversation_participants')
            .select('id')
            .eq('conversation_id', conversationId)
            .eq('user_id', user_id)
            .is('left_at', null)
            .single();

        if (existingParticipant) {
            return NextResponse.json(
                { error: 'User is already a member of this conversation' },
                { status: 400 }
            );
        }

        // Add user to conversation
        const { data: newParticipant, error: addError } = await supabase
            .from('conversation_participants')
            .insert({
                conversation_id: conversationId,
                user_id: user_id,
                role: 'member'
            })
            .select(`
                *,
                users (
                    id,
                    username,
                    image_url,
                    first_name,
                    last_name
                )
            `)
            .single();

        if (addError) {
            console.error('Add member error:', addError);
            throw addError;
        }

        return NextResponse.json({
            participant: newParticipant,
            success: true
        });

    } catch (error) {
        console.error('Add member API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// DELETE - Remove member from conversation
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const conversationId = (await params).id;
        const { searchParams } = new URL(request.url);
        const memberUserId = searchParams.get('user_id');

        if (!memberUserId) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            );
        }

        // Check if current user is admin
        const { data: currentParticipant, error: currentParticipantError } = await supabase
            .from('conversation_participants')
            .select('role')
            .eq('conversation_id', conversationId)
            .eq('user_id', userId)
            .is('left_at', null)
            .single();

        if (currentParticipantError || !currentParticipant || currentParticipant.role !== 'admin') {
            return NextResponse.json(
                { error: 'Admin access required' },
                { status: 403 }
            );
        }

        // Cannot remove yourself as admin
        if (memberUserId === userId) {
            return NextResponse.json(
                { error: 'Cannot remove yourself. Use leave group instead.' },
                { status: 400 }
            );
        }

        // Mark participant as left
        const { error: removeError } = await supabase
            .from('conversation_participants')
            .update({ left_at: new Date().toISOString() })
            .eq('conversation_id', conversationId)
            .eq('user_id', memberUserId);

        if (removeError) {
            console.error('Remove member error:', removeError);
            throw removeError;
        }

        return NextResponse.json({
            success: true,
            message: 'Member removed successfully'
        });

    } catch (error) {
        console.error('Remove member API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// PATCH - Update member role (promote/demote admin)
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const conversationId = (await params).id;
        const body = await request.json();
        const { user_id, role } = body;

        if (!user_id || !role) {
            return NextResponse.json(
                { error: 'User ID and role are required' },
                { status: 400 }
            );
        }

        if (!['admin', 'member'].includes(role)) {
            return NextResponse.json(
                { error: 'Invalid role. Must be "admin" or "member"' },
                { status: 400 }
            );
        }

        // Check if current user is admin
        const { data: currentParticipant, error: currentParticipantError } = await supabase
            .from('conversation_participants')
            .select('role')
            .eq('conversation_id', conversationId)
            .eq('user_id', userId)
            .is('left_at', null)
            .single();

        if (currentParticipantError || !currentParticipant || currentParticipant.role !== 'admin') {
            return NextResponse.json(
                { error: 'Admin access required' },
                { status: 403 }
            );
        }

        // Cannot change your own role
        if (user_id === userId) {
            return NextResponse.json(
                { error: 'Cannot change your own role' },
                { status: 400 }
            );
        }

        // Update member role
        const { data: updatedParticipant, error: updateError } = await supabase
            .from('conversation_participants')
            .update({ role })
            .eq('conversation_id', conversationId)
            .eq('user_id', user_id)
            .select(`
                *,
                users (
                    id,
                    username,
                    image_url,
                    first_name,
                    last_name
                )
            `)
            .single();

        if (updateError) {
            console.error('Update member role error:', updateError);
            throw updateError;
        }

        return NextResponse.json({
            participant: updatedParticipant,
            success: true
        });

    } catch (error) {
        console.error('Update member role API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
} 