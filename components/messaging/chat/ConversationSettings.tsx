// components/chat/ConversationSettings.tsx
import React, { useState } from 'react';
import { Settings, Users, Edit3, Trash2, LogOut, UserMinus, Shield, X } from 'lucide-react';
import { Conversation, ConversationParticipant } from '@/types/messaging';
import { AddParticipantsModal } from '../modals/AddParticipantsModal';

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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Settings size={24} className="text-gray-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                {isGroupChat ? 'Group Settings' : 'Chat Settings'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
            {/* Group Info Section */}
            {isGroupChat && (
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Group Information</h3>
                
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Group Name
                      </label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter group name..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter group description..."
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleSaveEdits}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {loading ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setEditName(conversation.name || '');
                          setEditDescription(conversation.description || '');
                        }}
                        className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Name:</span>
                        {isAdmin && (
                          <button
                            onClick={() => setIsEditing(true)}
                            className="text-blue-600 hover:text-blue-700 transition-colors"
                          >
                            <Edit3 size={16} />
                          </button>
                        )}
                      </div>
                      <span className="text-gray-900">{conversation.name || 'Unnamed Group'}</span>
                    </div>
                    {conversation.description && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">Description:</span>
                        <p className="text-gray-900 mt-1">{conversation.description}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Participants Section */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users size={20} className="text-gray-600" />
                  <h3 className="text-lg font-medium text-gray-900">
                    Participants ({conversation.participants.length})
                  </h3>
                </div>
                {isAdmin && isGroupChat && (
                  <button
                    onClick={() => setShowAddParticipants(true)}
                    className="text-blue-600 hover:text-blue-700 transition-colors text-sm font-medium"
                  >
                    Add People
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {conversation.participants.map((participant: ConversationParticipant) => (
                  <div key={participant.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {participant.user?.imageUrl ? (
                        <img
                          src={participant.user.imageUrl}
                          alt={participant.user.username}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {(participant.user?.firstName?.[0] || participant.user?.username[0] || '?').toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {participant.user?.firstName && participant.user?.lastName
                              ? `${participant.user.firstName} ${participant.user.lastName}`
                              : participant.user?.username || 'Unknown User'}
                          </span>
                          {participant.role === 'admin' && (
                            <Shield size={14} className="text-yellow-600" />
                          )}
                          {participant.user_id === currentUserId && (
                            <span className="text-xs text-gray-500">(You)</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          @{participant.user?.username || 'unknown'}
                        </div>
                      </div>
                    </div>

                    {isAdmin && participant.user_id !== currentUserId && (
                      <div className="flex items-center gap-2">
                        {participant.role !== 'admin' && (
                          <button
                            onClick={() => handlePromoteToAdmin(participant.user_id)}
                            className="text-yellow-600 hover:text-yellow-700 transition-colors"
                            title="Promote to Admin"
                          >
                            <Shield size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveParticipant(participant.user_id)}
                          className="text-red-600 hover:text-red-700 transition-colors"
                          title="Remove from Group"
                        >
                          <UserMinus size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions Section */}
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={handleLeave}
                  disabled={loading}
                  className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut size={20} />
                  <span>Leave {isGroupChat ? 'Group' : 'Conversation'}</span>
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
                    className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={20} />
                    <span>Delete Group</span>
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