'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Edit, 
  Crown, 
  UserPlus, 
  UserMinus,
  X,
  Save,
  Camera
} from 'lucide-react';
import { Conversation, User } from '@/types/messaging';
import { useAuth } from '@clerk/nextjs';
import Image from 'next/image';

interface GroupChatSettingsProps {
  conversation: Conversation;
  isOpen: boolean;
  onClose: () => void;
  onUpdateConversation: (updates: Partial<Conversation>) => Promise<void>;
  onAddMember: (userId: string) => Promise<void>;
  onRemoveMember: (userId: string) => Promise<void>;
  onPromoteAdmin: (userId: string) => Promise<void>;
  onDemoteAdmin: (userId: string) => Promise<void>;
  onLeaveGroup: () => Promise<void>;
  onDeleteGroup: () => Promise<void>;
}

export const GroupChatSettings: React.FC<GroupChatSettingsProps> = ({
  conversation,
  isOpen,
  onClose,
  onUpdateConversation,
  onAddMember,
  onRemoveMember,
  onPromoteAdmin,
  onDemoteAdmin,
  onLeaveGroup,
  onDeleteGroup
}) => {
  const { userId } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [groupName, setGroupName] = useState(conversation.name || '');
  const [groupDescription, setGroupDescription] = useState(conversation.description || '');
  const [showAddMember, setShowAddMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const currentUser = conversation.participants.find(p => p.user_id === userId);
  const isAdmin = currentUser?.role === 'admin';
  const isCreator = conversation.created_by === userId;

  // Search users for adding to group
  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=users`);
      if (response.ok) {
        const data = await response.json();
        const existingMemberIds = conversation.participants.map(p => p.user_id);
        const filteredUsers = data.users.filter((user: User) => !existingMemberIds.includes(user.id));
        setSearchResults(filteredUsers);
      }
    } catch (error) {
      console.error('Failed to search users:', error);
    }
  };

  useEffect(() => {
    if (showAddMember) {
      searchUsers(searchQuery);
    }
  }, [searchQuery, showAddMember]);


  // Save group changes
  const handleSave = async () => {
    setIsLoading(true);
    try {
      const updates: Partial<Conversation> = {};
      
      if (groupName !== conversation.name) {
        updates.name = groupName;
      }
      
      if (groupDescription !== conversation.description) {
        updates.description = groupDescription;
      }

      if (Object.keys(updates).length > 0) {
        await onUpdateConversation(updates);
      }

      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update group:', error);
      alert('Failed to update group settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Add member to group
  const handleAddMember = async (user: User) => {
    try {
      await onAddMember(user.id);
      setShowAddMember(false);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Failed to add member:', error);
      alert('Failed to add member. Please try again.');
    }
  };

  // Remove member from group
  const handleRemoveMember = async (participantId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;
    
    try {
      await onRemoveMember(participantId);
    } catch (error) {
      console.error('Failed to remove member:', error);
      alert('Failed to remove member. Please try again.');
    }
  };

  // Promote to admin
  const handlePromoteAdmin = async (participantId: string) => {
    try {
      await onPromoteAdmin(participantId);
    } catch (error) {
      console.error('Failed to promote admin:', error);
      alert('Failed to promote admin. Please try again.');
    }
  };

  // Demote admin
  const handleDemoteAdmin = async (participantId: string) => {
    try {
      await onDemoteAdmin(participantId);
    } catch (error) {
      console.error('Failed to demote admin:', error);
      alert('Failed to demote admin. Please try again.');
    }
  };

  // Leave group
  const handleLeaveGroup = async () => {
    if (!confirm('Are you sure you want to leave this group?')) return;
    
    try {
      await onLeaveGroup();
      onClose();
    } catch (error) {
      console.error('Failed to leave group:', error);
      alert('Failed to leave group. Please try again.');
    }
  };

  // Delete group
  const handleDeleteGroup = async () => {
    if (!confirm('Are you sure you want to delete this group? This action cannot be undone.')) return;
    
    try {
      await onDeleteGroup();
      onClose();
    } catch (error) {
      console.error('Failed to delete group:', error);
      alert('Failed to delete group. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Group Settings
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Group Info */}
        <div className="p-4">
          {/* Group Image */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                {imagePreview || conversation.image_url ? (
                  <Image
                    src={imagePreview || conversation.image_url!}
                    alt="Group"
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Users className="w-8 h-8 text-gray-400" />
                  </div>
                )}
              </div>
              {isAdmin && (
                <button className="absolute bottom-0 right-0 p-1 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors">
                  <Camera className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Group Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Group Name
            </label>
            {isEditing ? (
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                maxLength={50}
              />
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-gray-900 dark:text-white font-medium">
                  {conversation.name || 'Unnamed Group'}
                </span>
                {isAdmin && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                  >
                    <Edit className="w-4 h-4 text-gray-500" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Group Description */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            {isEditing ? (
              <textarea
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                rows={3}
                maxLength={200}
                placeholder="Add a description for this group..."
              />
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400 text-sm">
                  {conversation.description || 'No description'}
                </span>
                {isAdmin && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                  >
                    <Edit className="w-4 h-4 text-gray-500" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Save/Cancel buttons for editing */}
          {isEditing && (
            <div className="flex space-x-2 mb-4">
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Save</span>
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setGroupName(conversation.name || '');
                  setGroupDescription(conversation.description || '');
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Members Section */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Members ({conversation.participants.length})
              </h3>
              {isAdmin && (
                <button
                  onClick={() => setShowAddMember(!showAddMember)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                >
                  <UserPlus className="w-4 h-4 text-blue-500" />
                </button>
              )}
            </div>

            {/* Add Member Search */}
            {showAddMember && (
              <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                />
                {searchResults.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {searchResults.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleAddMember(user)}
                        className="w-full flex items-center space-x-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-left"
                      >
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                          {user.imageUrl ? (
                            <Image
                              src={user.imageUrl}
                              alt={user.firstName || user.username}
                              width={32}
                              height={32}
                              className="w-full h-full object-cover rounded-full"
                            />
                          ) : (
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                              {user.firstName?.[0] || user.username[0]}
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-gray-900 dark:text-white">
                          {user.firstName} {user.lastName} (@{user.username})
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Members List */}
            <div className="space-y-2">
              {conversation.participants.map((participant) => {
                const user = participant.user;
                const isCurrentUser = participant.user_id === userId;
                const canManage = isAdmin && !isCurrentUser;

                return (
                  <div
                    key={participant.user_id}
                    className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                        {user?.imageUrl ? (
                          <Image
                            src={user.imageUrl}
                            alt={user.firstName || user.username}
                            width={32}
                            height={32}
                            className="w-full h-full object-cover rounded-full"
                          />
                        ) : (
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            {user?.firstName?.[0] || user?.username?.[0] || '?'}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-1">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {user?.firstName} {user?.lastName} {isCurrentUser && '(You)'}
                          </span>
                          {participant.role === 'admin' && (
                            <Crown className="w-3 h-3 text-yellow-500" />
                          )}
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          @{user?.username}
                        </span>
                      </div>
                    </div>

                    {canManage && (
                      <div className="flex items-center space-x-1">
                        {participant.role === 'admin' ? (
                          <button
                            onClick={() => handleDemoteAdmin(participant.user_id)}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-400"
                          >
                            Demote
                          </button>
                        ) : (
                          <button
                            onClick={() => handlePromoteAdmin(participant.user_id)}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-xs text-blue-600 dark:text-blue-400"
                          >
                            Promote
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveMember(participant.user_id)}
                          className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-xs text-red-600 dark:text-red-400"
                        >
                          <UserMinus className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleLeaveGroup}
              className="w-full px-4 py-2 border border-red-300 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Leave Group
            </button>
            
            {isCreator && (
              <button
                onClick={handleDeleteGroup}
                className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Delete Group
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 