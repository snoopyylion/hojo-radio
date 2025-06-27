import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    console.log('Batch users fetch request received');
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { userIds } = await request.json();

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ message: 'Invalid userIds array' }, { status: 400 });
    }

    // Get the clerk client instance
    const clerk = await clerkClient();

    const users = await Promise.all(
      userIds.map(async (id: string) => {
        try {
          // Now use the resolved client instance
          const user = await clerk.users.getUser(id);
          return {
            id: user.id,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            imageUrl: user.imageUrl,
            email: user.emailAddresses[0]?.emailAddress || '',
            isOnline: false,
            lastSeen: null
          };
        } catch (error) {
          console.error(`Failed to fetch user ${id}:`, error);
          return null;
        }
      })
    );

    const validUsers = users.filter(user => user !== null);

    return NextResponse.json({ users: validUsers });
  } catch (error) {
    console.error('Batch users fetch error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}