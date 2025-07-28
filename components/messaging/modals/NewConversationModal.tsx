// components/messaging/NewConversationModal.tsx
import React, { useState, useCallback } from 'react';
import { X, Users, MessageCircle, Search, Plus } from 'lucide-react';
import Image from 'next/image';
import { User } from '@/types/messaging';

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateConversation: (participants: User[], type: 'direct' | 'group', name?: string) => Promise<void>;
  currentUser: User;
}

interface SearchResult extends User {
  selected: boolean;
}

export default function NewConversationModal({ 
  isOpen, 
  onClose, 
  onCreateConversation, 
  currentUser 
}: NewConversationModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [conversationType, setConversationType] = useState<'direct' | 'group'>('direct');
  const [groupName, setGroupName] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Mock search function - replace with actual API call
  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Replace with actual API call
      const mockUsers: User[] = [
        { id: '1', username: 'john_doe', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
        { id: '2', username: 'jane_smith', firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' },
        { id: '3', username: 'bob_wilson', firstName: 'Bob', lastName: 'Wilson', email: 'bob@example.com' },
      ];

      const filtered = mockUsers
        .filter(user => 
          user.id !== currentUser.id &&
          (user.username.toLowerCase().includes(query.toLowerCase()) ||
           user.firstName?.toLowerCase().includes(query.toLowerCase()) ||
           user.lastName?.toLowerCase().includes(query.toLowerCase()) ||
           user.email?.toLowerCase().includes(query.toLowerCase()))
        )
        .map(user => ({ ...user, selected: selectedUsers.some(selected => selected.id === user.id) }));

      setSearchResults(filtered);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setIsSearching(false);
    }
  }, [currentUser.id, selectedUsers]);

  const handleUserSelect = (user: User) => {
    const isSelected = selectedUsers.some(selected => selected.id === user.id);
    
    if (isSelected) {
      setSelectedUsers(prev => prev.filter(selected => selected.id !== user.id));
    } else {
      setSelectedUsers(prev => [...prev, user]);
      if (conversationType === 'direct' && selectedUsers.length === 0) {
        // For direct messages, auto-create when one user is selected
        handleCreateConversation([user], 'direct');
        return;
      }
    }

    // Update search results
    setSearchResults(prev => 
      prev.map(result => 
        result.id === user.id ? { ...result, selected: !isSelected } : result
      )
    );
  };

  const handleCreateConversation = async (participants: User[], type: 'direct' | 'group', name?: string) => {
    if (participants.length === 0) return;

    setIsCreating(true);
    try {
      await onCreateConversation(participants, type, name);
      handleClose();
    } catch (error) {
      console.error('Error creating conversation:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSelectedUsers([]);
    setConversationType('direct');
    setGroupName('');
    setSearchResults([]);
    onClose();
  };

  const canCreateGroup = conversationType === 'group' && selectedUsers.length >= 2 && groupName.trim();
  const canCreateDirect = conversationType === 'direct' && selectedUsers.length === 1;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">New Conversation</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Conversation Type Selection */}
        <div className="p-6 border-b">
          <div className="flex space-x-4">
            <button
              onClick={() => setConversationType('direct')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                conversationType === 'direct'
                  ? 'bg-blue-100 text-blue-700 border-2 border-blue-200'
                  : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
              }`}
            >
              <MessageCircle size={18} />
              <span>Direct Message</span>
            </button>
            <button
              onClick={() => setConversationType('group')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                conversationType === 'group'
                  ? 'bg-blue-100 text-blue-700 border-2 border-blue-200'
                  : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
              }`}
            >
              <Users size={18} />
              <span>Group Chat</span>
            </button>
          </div>
        </div>

        {/* Group Name Input */}
        {conversationType === 'group' && (
          <div className="p-6 border-b">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Group Name
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}

        {/* Search Users */}
        <div className="p-6 border-b">
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                searchUsers(e.target.value);
              }}
              placeholder="Search users..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Selected Users */}
        {selectedUsers.length > 0 && (
          <div className="p-6 border-b">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Selected ({selectedUsers.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center space-x-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                >
                  <span>{user.firstName} {user.lastName}</span>
                  <button
                    onClick={() => handleUserSelect(user)}
                    className="hover:bg-blue-200 rounded-full p-1"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search Results */}
        <div className="flex-1 overflow-y-auto">
          {isSearching ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="p-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Search Results</h3>
              <div className="space-y-2">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => handleUserSelect(user)}
                    className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      user.selected
                        ? 'bg-blue-50 border-2 border-blue-200'
                        : 'hover:bg-gray-50 border-2 border-transparent'
                    }`}
                  >
                    <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                      {user.imageUrl ? (
                        <Image
                          src={user.imageUrl}
                          alt={user.username}
                          width={40}
                          height={40}
                          className="w-full h-full rounded-full"
                        />
                      ) : (
                        <span className="text-sm font-medium text-gray-600">
                          {user.firstName?.[0]}{user.lastName?.[0]}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-sm text-gray-500">@{user.username}</div>
                    </div>
                    {user.selected && (
                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <Plus size={12} className="text-white rotate-45" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : searchQuery ? (
            <div className="flex items-center justify-center p-8 text-gray-500">
              No users found
            </div>
          ) : (
            <div className="flex items-center justify-center p-8 text-gray-500">
              Start typing to search for users
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex space-x-3">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => handleCreateConversation(selectedUsers, conversationType, groupName)}
              disabled={!canCreateGroup && !canCreateDirect || isCreating}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isCreating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}