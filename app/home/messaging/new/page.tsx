// app/messages/new/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { UserSearch } from '@/components/messaging/UserSearch';
import { User } from '@/types/messaging';
import Image from 'next/image';

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

            router.push(`/home/messaging/${conversationId}`);

        } catch (err: unknown) {
            let errorMessage = 'Failed to create conversation';

            if (err instanceof Error) {
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
            <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="flex flex-col items-center space-y-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#EF3866] border-t-transparent"></div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center space-x-3">
                            <button
                                onClick={() => router.push('/messages')}
                                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                                New Chat
                            </h1>
                        </div>
                        
                        {/* Mobile create button */}
                        <button
                            onClick={handleCreateConversation}
                            disabled={!canCreate || isCreating}
                            className={`md:hidden px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                canCreate && !isCreating
                                    ? 'bg-[#EF3866] hover:bg-[#d63158] text-white shadow-md'
                                    : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                            }`}
                        >
                            {isCreating ? (
                                <div className="flex items-center space-x-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                    <span>Creating...</span>
                                </div>
                            ) : (
                                'Create'
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Error Alert */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl">
                        <div className="flex items-center space-x-2">
                            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            <div>
                                <p className="font-medium">Error</p>
                                <p className="text-sm">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Chat Configuration */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Chat Type Selector */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                Chat Type
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => {
                                        setConversationType('direct');
                                        setSelectedUsers(prev => prev.slice(0, 1));
                                    }}
                                    className={`p-4 rounded-xl border-2 transition-all ${
                                        conversationType === 'direct'
                                            ? 'border-[#EF3866] bg-[#EF3866]/5 text-[#EF3866]'
                                            : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
                                    }`}
                                >
                                    <div className="flex items-center justify-center space-x-2">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                        </svg>
                                        <span className="font-medium">Direct</span>
                                    </div>
                                </button>
                                <button
                                    onClick={() => setConversationType('group')}
                                    className={`p-4 rounded-xl border-2 transition-all ${
                                        conversationType === 'group'
                                            ? 'border-[#EF3866] bg-[#EF3866]/5 text-[#EF3866]'
                                            : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
                                    }`}
                                >
                                    <div className="flex items-center justify-center space-x-2">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                        <span className="font-medium">Group</span>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Group Details */}
                        {conversationType === 'group' && (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                    Group Details
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Group Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={groupName}
                                            onChange={(e) => setGroupName(e.target.value)}
                                            placeholder="Enter group name"
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EF3866] focus:border-[#EF3866] dark:bg-gray-700 dark:text-white transition-colors"
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
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EF3866] focus:border-[#EF3866] dark:bg-gray-700 dark:text-white resize-none transition-colors"
                                            maxLength={200}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* User Search */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                {conversationType === 'direct' ? 'Select Contact' : 'Add Participants'}
                            </h3>
                            <UserSearch
                                onSelectUser={handleUserSelect}
                                selectedUsers={selectedUsers}
                                onSelectedUsersChange={handleSelectedUsersChange}
                                multiple={conversationType === 'group'}
                                currentUserId={userId || undefined}
                                excludeCurrentUser={true}
                                keepResultsOpen={true}
                                clearOnSelect={false}
                                placeholder={conversationType === 'direct' ? "Search for a contact..." : "Search for contacts to add..."}
                            />
                        </div>

                        {/* Desktop Actions */}
                        <div className="hidden md:flex justify-end space-x-3">
                            <button
                                onClick={() => router.push('/messages')}
                                className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                                disabled={isCreating}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateConversation}
                                disabled={!canCreate || isCreating}
                                className={`px-6 py-3 rounded-xl font-medium transition-all ${
                                    canCreate && !isCreating
                                        ? 'bg-[#EF3866] hover:bg-[#d63158] text-white shadow-md'
                                        : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                }`}
                            >
                                {isCreating ? (
                                    <div className="flex items-center space-x-2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                        <span>Creating...</span>
                                    </div>
                                ) : (
                                    `Create ${conversationType === 'direct' ? 'Chat' : 'Group'}`
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Right Column - Selected Users */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-24">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                    {conversationType === 'direct' ? 'Selected Contact' : `Participants (${selectedUsers.length})`}
                                </h3>
                                
                                {selectedUsers.length === 0 ? (
                                    <div className="text-center py-8">
                                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-2.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                            </svg>
                                        </div>
                                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                                            {conversationType === 'direct' ? 'Select a contact to chat with' : 'Add participants to your group'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {selectedUsers.map((user) => (
                                            <div
                                                key={user.id}
                                                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                            >
                                                <div className="flex items-center space-x-3 flex-1 min-w-0">
                                                    {user.imageUrl ? (
                                                        <Image
                                                            src={user.imageUrl}
                                                            alt={user.username}
                                                            width={40}
                                                            height={40}
                                                            className="rounded-full object-cover ring-2 ring-gray-200 dark:ring-gray-600"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#EF3866] to-[#d63158] flex items-center justify-center">
                                                            <span className="text-white font-medium text-sm">
                                                                {(user.firstName?.[0] || user.username[0]).toUpperCase()}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-gray-900 dark:text-white truncate">
                                                            {user.firstName && user.lastName
                                                                ? `${user.firstName} ${user.lastName}`
                                                                : user.username
                                                            }
                                                        </p>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                                            @{user.username}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveUser(user.id)}
                                                    className="p-2 text-gray-400 hover:text-[#EF3866] rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                                    title="Remove user"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Info text */}
                <div className="mt-8 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {conversationType === 'direct' ? (
                            <>Select a contact to start chatting. If a conversation already exists, you&apos;ll be redirected to it.</>
                        ) : (
                            <>Create a group chat by selecting multiple participants and giving your group a name.</>
                        )}
                    </p>
                </div>
            </div>

            {/* Mobile Bottom Actions */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-4 safe-area-pb">
                <div className="flex space-x-3">
                    <button
                        onClick={() => router.push('/messages')}
                        className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                        disabled={isCreating}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCreateConversation}
                        disabled={!canCreate || isCreating}
                        className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${
                            canCreate && !isCreating
                                ? 'bg-[#EF3866] hover:bg-[#d63158] text-white shadow-md'
                                : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                        }`}
                    >
                        {isCreating ? (
                            <div className="flex items-center justify-center space-x-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                <span>Creating...</span>
                            </div>
                        ) : (
                            `Create ${conversationType === 'direct' ? 'Chat' : 'Group'}`
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}