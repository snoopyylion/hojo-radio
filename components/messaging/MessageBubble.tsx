// components/messaging/MessageBubble.tsx
import React, { useState } from 'react';
import { format } from 'date-fns';
import { MoreHorizontal, Reply, Edit, Trash2, Heart, ThumbsUp, Smile } from 'lucide-react';
import { Message, MessageReaction } from '@/types/messaging';
import { useAuth } from '@clerk/nextjs';
import { MessageReactions } from './MessageReactions';
import { EmojiPicker } from './EmojiPicker';

interface MessageBubbleProps {
    message: Message;
    isOwn: boolean;
    showAvatar?: boolean;
    isGrouped?: boolean;
    onReact: (messageId: string, emoji: string) => void;
    onReply: (message: Message) => void;
    onEdit: (message: Message) => void;
    onDelete: (messageId: string) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
    message,
    isOwn,
    showAvatar = true,
    onReact,
    onReply,
    onEdit,
    onDelete
}) => {
    const { userId } = useAuth();
    const [showActions, setShowActions] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    const handleQuickReaction = (emoji: string) => {
        onReact(message.id, emoji);
    };

    const formatTime = (timestamp: string) => {
        return format(new Date(timestamp), 'HH:mm');
    };

    const getDisplayName = () => {
        if (!message.sender) return 'Unknown';
        return message.sender.firstName && message.sender.lastName
            ? `${message.sender.firstName} ${message.sender.lastName}`
            : message.sender.username;
    };

    return (
        <div
            className={`group flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            <div className={`flex max-w-[70%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                {showAvatar && !isOwn && (
                    <div className="flex-shrink-0 mr-3">
                        <img
                            src={message.sender?.imageUrl || '/default-avatar.png'}
                            alt={getDisplayName()}
                            className="w-8 h-8 rounded-full"
                        />
                    </div>
                )}

                <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                    {/* Sender name (for group chats) */}
                    {!isOwn && showAvatar && (
                        <span className="text-xs text-gray-500 mb-1 px-3">
                            {getDisplayName()}
                        </span>
                    )}

                    {/* Reply context */}
                    {message.reply_to && (
                        <div className={`mb-2 px-3 py-2 rounded-lg text-xs ${isOwn
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                            <div className="font-medium">
                                {message.reply_to.sender?.firstName || 'Unknown'}
                            </div>
                            <div className="opacity-75 truncate">
                                {message.reply_to.content}
                            </div>
                        </div>
                    )}

                    {/* Message content */}
                    <div className="relative">
                        <div
                            className={`px-4 py-2 rounded-2xl ${isOwn
                                    ? 'bg-blue-500 text-white rounded-br-md'
                                    : 'bg-gray-100 text-gray-900 rounded-bl-md'
                                }`}
                        >
                            {/* Message content based on type */}
                            {message.message_type === 'text' && (
                                <p className="whitespace-pre-wrap break-words">
                                    {message.content}
                                </p>
                            )}

                            {message.message_type === 'image' && (
                                <div className="max-w-sm">
                                    <img
                                        src={message.content}
                                        alt="Shared image"
                                        className="rounded-lg w-full"
                                    />
                                    {message.metadata?.caption && (
                                        <p className="mt-2 text-sm">{message.metadata.caption}</p>
                                    )}
                                </div>
                            )}

                            {message.message_type === 'file' && (
                                <div className="flex items-center space-x-3 p-2 bg-white bg-opacity-20 rounded-lg">
                                    <div className="flex-shrink-0">
                                        <div className="w-10 h-10 bg-white bg-opacity-30 rounded-lg flex items-center justify-center">
                                            📄
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">
                                            {message.metadata?.filename || 'File'}
                                        </p>
                                        <p className="text-xs opacity-75">
                                            {message.metadata?.filesize || 'Unknown size'}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Edited indicator */}
                            {message.edited_at && (
                                <span className="text-xs opacity-50 ml-2">(edited)</span>
                            )}
                        </div>

                        {/* Quick reactions */}
                        {showActions && (
                            <div className={`absolute top-0 ${isOwn ? 'right-full mr-2' : 'left-full ml-2'} 
                           flex items-center space-x-1 bg-white rounded-full shadow-lg border p-1 
                           transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity`}>
                                <button
                                    onClick={() => handleQuickReaction('❤️')}
                                    className="p-1 hover:bg-gray-100 rounded-full"
                                >
                                    <Heart className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleQuickReaction('👍')}
                                    className="p-1 hover:bg-gray-100 rounded-full"
                                >
                                    <ThumbsUp className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    className="p-1 hover:bg-gray-100 rounded-full"
                                >
                                    <Smile className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => onReply(message)}
                                    className="p-1 hover:bg-gray-100 rounded-full"
                                >
                                    <Reply className="w-4 h-4" />
                                </button>
                                {isOwn && (
                                    <>
                                        <button
                                            onClick={() => onEdit(message)}
                                            className="p-1 hover:bg-gray-100 rounded-full"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => onDelete(message.id)}
                                            className="p-1 hover:bg-gray-100 rounded-full text-red-500"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Message reactions */}
                    {message.reactions && message.reactions.length > 0 && userId && (
                        <div className="mt-1">
                            <MessageReactions
                                reactions={message.reactions}
                                onReact={(emoji) => onReact(message.id, emoji)}
                                currentUserId={userId}
                            />
                        </div>
                    )}


                    {/* Timestamp */}
                    <span className={`text-xs text-gray-500 mt-1 ${isOwn ? 'mr-3' : 'ml-3'}`}>
                        {formatTime(message.created_at)}
                    </span>
                </div>
            </div>

            {/* Emoji picker */}
            {showEmojiPicker && (
                <div className="absolute z-50 mt-12">
                    <EmojiPicker
                        onEmojiSelect={(emoji) => {
                            onReact(message.id, emoji);
                            setShowEmojiPicker(false);
                        }}
                        onClose={() => setShowEmojiPicker(false)}
                    />
                </div>
            )}
        </div>
    );
};

export default MessageBubble;