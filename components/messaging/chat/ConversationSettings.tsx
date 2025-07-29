// components/chat/ConversationSettings.tsx
import React, { useState } from 'react';
import { Settings, Users, Edit3, Trash2, LogOut, UserMinus, Shield, X, Crown, UserPlus, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { Conversation, ConversationParticipant, Message } from '@/types/messaging';
import { AddParticipantsModal } from '../modals/AddParticipantsModal';
import { ImageGallery } from '../ImageGallery';

interface ConversationSettingsProps {
  conversation: Conversation;
  currentUserId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdateConversation: (updates: Partial<Conversation>) => Promise<void>;
  onLeaveConversation: () => Promise<void>;
  onRemoveParticipant: (userId: string) => Promise<void>;
  onAddParticipants: (userIds: string[]) => Promise<void>;
  onPromoteToAdmin: (userId: string) => Promise<void>;
  messages: Message[];
}

export function ConversationSettings({
  conversation,
  currentUserId,
  isOpen,
  onClose,
  onUpdateConversation,
  onLeaveConversation,
  onRemoveParticipant,
  onAddParticipants,
  onPromoteToAdmin,
  messages,
}: ConversationSettingsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(conversation.name || '');
  const [editDescription, setEditDescription] = useState(conversation.description || '');
  const [showAddParticipants, setShowAddParticipants] = useState(false);
  const [loading, setLoading] = useState(false);

  const currentUserParticipant = conversation.participants.find(p => p.user_id === currentUserId);
  const isAdmin = currentUserParticipant?.role === 'admin';
  const isGroupChat = conversation.type === 'group';

  const handleSaveEdits = async () => {
    if (!isAdmin) return;
    
    setLoading(true);
    try {
      await onUpdateConversation({
        name: editName.trim() || undefined,
        description: editDescription.trim() || undefined,
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async () => {
    if (window.confirm('Are you sure you want to leave this conversation?')) {
      setLoading(true);
      try {
        await onLeaveConversation();
        onClose();
      } catch (error) {
        console.error('Error leaving conversation:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRemoveParticipant = async (userId: string) => {
    if (window.confirm('Are you sure you want to remove this participant?')) {
      setLoading(true);
      try {
        await onRemoveParticipant(userId);
      } catch (error) {
        console.error('Error removing participant:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handlePromoteToAdmin = async (userId: string) => {
    if (window.confirm('Are you sure you want to make this user an admin?')) {
      setLoading(true);
      try {
        await onPromoteToAdmin(userId);
      } catch (error) {
        console.error('Error promoting user:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div 
          className="bg-white dark:bg-black rounded-3xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-800"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-2xl">
                <Settings size={22} className="text-gray-700 dark:text-gray-300" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-black dark:text-white">
                  {isGroupChat ? 'Group Settings' : 'Chat Settings'}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                  {isGroupChat ? 'Manage your group' : 'Conversation options'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-xl transition-all duration-200"
            >
              <X size={20} />
            </button>
          </div>

          <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
            {/* Group Info Section */}
            {isGroupChat && (
              <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-black dark:text-white">Group Information</h3>
                  {isAdmin && !isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-xl transition-all duration-200 border border-gray-200 dark:border-gray-800"
                    >
                      <Edit3 size={16} />
                      Edit
                    </button>
                  )}
                </div>
                
                {isEditing ? (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-black dark:text-white mb-3">
                        Group Name
                      </label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-2xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent bg-white dark:bg-black text-black dark:text-white placeholder:text-gray-500 transition-all duration-200"
                        placeholder="Enter group name..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black dark:text-white mb-3">
                        Description
                      </label>
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-2xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent bg-white dark:bg-black text-black dark:text-white placeholder:text-gray-500 transition-all duration-200 resize-none"
                        placeholder="Enter group description..."
                      />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={handleSaveEdits}
                        disabled={loading}
                        className="flex-1 px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-2xl hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
                      >
                        {loading ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setEditName(conversation.name || '');
                          setEditDescription(conversation.description || '');
                        }}
                        className="px-6 py-3 text-black dark:text-white border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-all duration-200 font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 block">Name</span>
                      <p className="text-black dark:text-white font-medium">
                        {conversation.name || 'Unnamed Group'}
                      </p>
                    </div>
                    {conversation.description && (
                      <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 block">Description</span>
                        <p className="text-black dark:text-white">{conversation.description}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Participants Section */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-2xl">
                    <Users size={20} className="text-gray-700 dark:text-gray-300" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-black dark:text-white">
                      Participants
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                      {conversation.participants.length} {conversation.participants.length === 1 ? 'member' : 'members'}
                    </p>
                  </div>
                </div>
                {isAdmin && isGroupChat && (
                  <button
                    onClick={() => setShowAddParticipants(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-2xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-all duration-200 text-sm font-medium"
                  >
                    <UserPlus size={16} />
                    Add People
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {conversation.participants.map((participant: ConversationParticipant) => (
                  <div key={participant.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 border border-gray-200 dark:border-gray-800">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {participant.user?.imageUrl ? (
                        <Image
                          src={participant.user.imageUrl}
                          alt={participant.user.username}
                          width={48}
                          height={48}
                          className="w-12 h-12 rounded-full object-cover border-2 border-gray-200 dark:border-gray-800"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-black dark:bg-white flex items-center justify-center border-2 border-gray-200 dark:border-gray-800">
                          <span className="text-sm font-bold text-white dark:text-black">
                            {(participant.user?.firstName?.[0] || participant.user?.username[0] || '?').toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-black dark:text-white truncate">
                            {participant.user?.firstName && participant.user?.lastName
                              ? `${participant.user.firstName} ${participant.user.lastName}`
                              : participant.user?.username || 'Unknown User'}
                          </span>
                          {participant.role === 'admin' && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-yellow-50 dark:bg-yellow-900/20 rounded-full border border-yellow-200 dark:border-yellow-800">
                              <Crown size={12} className="text-yellow-600 dark:text-yellow-400" />
                              <span className="text-xs font-medium text-yellow-700 dark:text-yellow-300">Admin</span>
                            </div>
                          )}
                          {participant.user_id === currentUserId && (
                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-full border border-gray-200 dark:border-gray-700">You</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          @{participant.user?.username || 'unknown'}
                        </div>
                      </div>
                    </div>

                    {isAdmin && participant.user_id !== currentUserId && (
                      <div className="flex items-center gap-2">
                        {participant.role !== 'admin' && (
                          <button
                            onClick={() => handlePromoteToAdmin(participant.user_id)}
                            className="p-2.5 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-xl transition-all duration-200 border border-transparent hover:border-yellow-200 dark:hover:border-yellow-800"
                            title="Promote to Admin"
                          >
                            <Shield size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveParticipant(participant.user_id)}
                          className="p-2.5 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-200 border border-transparent hover:border-red-200 dark:hover:border-red-800"
                          title="Remove from Group"
                        >
                          <UserMinus size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Shared Images Section */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-2xl">
                  <ImageIcon size={20} className="text-gray-700 dark:text-gray-300" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-black dark:text-white">
                    Shared Images
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                    All images shared in this conversation
                  </p>
                </div>
              </div>

              <ImageGallery
                messages={messages}
                conversationId={conversation.id}
                className=""
                showHeader={false}
                compact={true}
              />
            </div>

            {/* Actions Section */}
            <div className="p-6">
              <h3 className="text-lg font-semibold text-black dark:text-white mb-4">Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={handleLeave}
                  disabled={loading}
                  className="w-full flex items-center gap-3 px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-all duration-200 disabled:opacity-50 border border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700"
                >
                  <LogOut size={20} />
                  <span className="font-medium">Leave {isGroupChat ? 'Group' : 'Conversation'}</span>
                </button>
                
                {isAdmin && isGroupChat && (
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
                        // TODO: Implement delete group functionality
                        console.log('Delete group');
                      }
                    }}
                    disabled={loading}
                    className="w-full flex items-center gap-3 px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-all duration-200 disabled:opacity-50 border border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700"
                  >
                    <Trash2 size={20} />
                    <span className="font-medium">Delete Group</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <AddParticipantsModal
        isOpen={showAddParticipants}
        onClose={() => setShowAddParticipants(false)}
        onAddParticipants={onAddParticipants}
        currentParticipants={conversation.participants.map(p => p.user_id)}
      />
    </>
  );
}