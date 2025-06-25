// app/messages/new/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { UserSearch } from '@/components/messaging/UserSearch';
import { User } from '@/types/messaging';

export default function NewConversationPage() {
    const router = useRouter();
    const { userId, isLoaded } = useAuth();

    const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
    const [conversationType, setConversationType] = useState<'direct' | 'group'>('direct');
    const [groupName, setGroupName] = useState('');
    const [groupDescription, setGroupDescription] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isLoaded && !userId) {
            router.push('/sign-in');
            return;
        }
    }, [isLoaded, userId, router]);

    const handleUserSelect = (user: User) => {
        console.log('🎯 User selected for conversation:', user);

        if (conversationType === 'direct') {
            // For direct conversations, only allow one user
            setSelectedUsers([user]);
        } else {
            // For group conversations, allow multiple users - prevent duplicates
            setSelectedUsers(prev => {
                const exists = prev.find(u => u.id === user.id);
                if (exists) {
                    console.log('User already selected, removing:', user.username);
                    return prev.filter(u => u.id !== user.id);
                }
                console.log('Adding user to selection:', user.username);
                return [...prev, user];
            });
        }
    };

    const handleSelectedUsersChange = (users: User[]) => {
        console.log('📝 Selected users changed:', users.map(u => u.username));
        // Remove duplicates by ID
        const uniqueUsers = users.filter((user, index, self) =>
            index === self.findIndex(u => u.id === user.id)
        );
        setSelectedUsers(uniqueUsers);
    };

    const handleRemoveUser = (userId: string) => {
        setSelectedUsers(prev => prev.filter(user => user.id !== userId));
    };

    const handleCreateConversation = async () => {
        console.log('🚀 Starting conversation creation...', {
            userId,
            selectedUsers: selectedUsers.map(u => ({ id: u.id, username: u.username })),
            conversationType,
            groupName
        });

        if (!userId || selectedUsers.length === 0) {
            const missingItems = [];
            if (!userId) missingItems.push('user ID');
            if (selectedUsers.length === 0) missingItems.push('selected users');

            const errorMsg = `Missing required items: ${missingItems.join(', ')}`;
            console.error('❌ Cannot create conversation:', errorMsg);
            setError(errorMsg);
            return;
        }

        if (conversationType === 'group' && !groupName.trim()) {
            setError('Group name is required');
            return;
        }

        setIsCreating(true);
        setError(null);

        try {
            // Prepare the request payload for your API route
            const requestBody = {
                participant_ids: selectedUsers.map(user => user.id),
                type: conversationType,
                ...(conversationType === 'group' && {
                    name: groupName.trim(),
                    ...(groupDescription.trim() && { description: groupDescription.trim() })
                })
            };

            console.log('📋 Request payload:', requestBody);

            // Call your existing API route
            const response = await fetch('/api/conversations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = 'Failed to create conversation';
                
                try {
                    const errorJson = JSON.parse(errorText);
                    errorMessage = errorJson.error || errorMessage;
                } catch {
                    errorMessage = errorText || errorMessage;
                }
                
                throw new Error(errorMessage);
            }

            const result = await response.json();
            console.log('✅ Conversation created successfully:', result);

            // Redirect to the new conversation
            // Adjust the property name based on what your API returns
            const conversationId = result.id || result.conversation_id || result.conversationId;
            
            if (!conversationId) {
                throw new Error('No conversation ID returned from API');
            }

            router.push(`/messages/${conversationId}`);

        } catch (err: any) {
            console.error('❌ Create conversation error:', err);

            let errorMessage = 'Failed to create conversation';

            if (err.message) {
                errorMessage = err.message;
            } else if (typeof err === 'string') {
                errorMessage = err;
            }

            setError(errorMessage);
        } finally {
            setIsCreating(false);
        }
    };

    const canCreate = selectedUsers.length > 0 &&
        (conversationType === 'direct' || (conversationType === 'group' && groupName.trim()));

    if (!isLoaded) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto p-6">
            <div className="mb-6">
                <div className="flex items-center space-x-4 mb-4">
                    <button
                        onClick={() => router.push('/messages')}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        New Conversation
                    </h1>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                        <p className="font-medium">Error:</p>
                        <p className="text-sm">{error}</p>
                    </div>
                )}
            </div>

            {/* Conversation type selector */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Conversation Type
                </label>
                <div className="flex space-x-4">
                    <button
                        onClick={() => {
                            setConversationType('direct');
                            setSelectedUsers(prev => prev.slice(0, 1));
                        }}
                        className={`px-4 py-2 rounded-lg border transition-colors ${conversationType === 'direct'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                    >
                        Direct Message
                    </button>
                    <button
                        onClick={() => setConversationType('group')}
                        className={`px-4 py-2 rounded-lg border transition-colors ${conversationType === 'group'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                    >
                        Group Chat
                    </button>
                </div>
            </div>

            {/* Group details (only for group conversations) */}
            {conversationType === 'group' && (
                <div className="mb-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Group Name *
                        </label>
                        <input
                            type="text"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            placeholder="Enter group name"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                            maxLength={50}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Description (optional)
                        </label>
                        <textarea
                            value={groupDescription}
                            onChange={(e) => setGroupDescription(e.target.value)}
                            placeholder="Enter group description"
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white resize-none"
                            maxLength={200}
                        />
                    </div>
                </div>
            )}

            {/* User selection */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    {conversationType === 'direct' ? 'Select User' : 'Add Participants'}
                    {conversationType === 'group' && (
                        <span className="text-gray-500 text-xs ml-2">
                            (Select multiple users)
                        </span>
                    )}
                </label>

                <UserSearch
                    onSelectUser={handleUserSelect}
                    selectedUsers={selectedUsers}
                    onSelectedUsersChange={handleSelectedUsersChange}
                    multiple={conversationType === 'group'}
                    currentUserId={userId || undefined}
                    excludeCurrentUser={true}
                    keepResultsOpen={true}
                    clearOnSelect={false}
                    placeholder={conversationType === 'direct' ? "Search for a user..." : "Search for users to add..."}
                />
            </div>

            {/* Selected Users Display */}
            {selectedUsers.length > 0 && (
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        {conversationType === 'direct' ? 'Selected User' : `Selected Participants (${selectedUsers.length})`}
                    </label>
                    <div className="space-y-3">
                        {selectedUsers.map((user) => (
                            <div
                                key={user.id}
                                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                            >
                                <div className="flex items-center space-x-3">
                                    {user.imageUrl ? (
                                        <img
                                            src={user.imageUrl}
                                            alt={user.username}
                                            className="w-10 h-10 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                                            <span className="text-white font-medium">
                                                {(user.firstName?.[0] || user.username[0]).toUpperCase()}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 dark:text-white">
                                            {user.firstName && user.lastName 
                                                ? `${user.firstName} ${user.lastName}`
                                                : user.username
                                            }
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            @{user.username}
                                        </p>
                                        {user.email && (
                                            <p className="text-xs text-gray-400 dark:text-gray-500">
                                                {user.email}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleRemoveUser(user.id)}
                                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                    title="Remove user"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3">
                <button
                    onClick={() => router.push('/messages')}
                    className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    disabled={isCreating}
                >
                    Cancel
                </button>
                <button
                    onClick={handleCreateConversation}
                    disabled={!canCreate || isCreating}
                    className={`px-6 py-2 rounded-lg transition-colors ${canCreate && !isCreating
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                        }`}
                >
                    {isCreating ? (
                        <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Creating...</span>
                        </div>
                    ) : (
                        `Create ${conversationType === 'direct' ? 'Conversation' : 'Group'}`
                    )}
                </button>
            </div>

            {/* Info text */}
            <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
                {conversationType === 'direct' ? (
                    <p>Select a user to start a direct conversation. If a conversation already exists, you'll be redirected to it.</p>
                ) : (
                    <p>Create a group chat by selecting multiple participants and giving your group a name.</p>
                )}
            </div>
        </div>
    );
}