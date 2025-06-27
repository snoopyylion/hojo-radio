// components/messaging/MessageBubble.tsx
import React, { useState } from 'react';
import { format } from 'date-fns';
import { Reply, Edit, Trash2, Heart, ThumbsUp, Smile, MoreHorizontal } from 'lucide-react';
import { Message } from '@/types/messaging';
import { useAuth } from '@clerk/nextjs';
import { MessageReactions } from './MessageReactions';
import { EmojiPicker } from './EmojiPicker';
import Image from 'next/image';

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
    isGrouped = false,
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
        return format(new Date(timestamp), 'h:mm a');
    };

    const getDisplayName = () => {
        if (!message.sender) return 'Unknown';
        return message.sender.firstName && message.sender.lastName
            ? `${message.sender.firstName} ${message.sender.lastName}`
            : message.sender.username;
    };

    return (
        <div
            className={`group flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1 ${!isGrouped ? 'mt-4' : ''}`}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            <div className={`flex max-w-[85%] sm:max-w-[70%] ${isOwn ? 'flex-row-reverse' : 'flex-row'} items-end`}>
                {/* Avatar */}
                {showAvatar && !isOwn && !isGrouped && (
                    <div className="flex-shrink-0 mb-1">
                        <div className="relative">
                            <Image
                                src={message.sender?.imageUrl || '/default-avatar.png'}
                                alt={getDisplayName()}
                                width={28}
                                height={28}
                                className="rounded-full border-2 border-white shadow-sm"
                            />
                            {/* Online indicator */}
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                        </div>
                    </div>
                )}

                {/* Spacer for grouped messages */}
                {!showAvatar && !isOwn && isGrouped && (
                    <div className="w-7 flex-shrink-0"></div>
                )}

                <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} ${!isOwn && showAvatar ? 'ml-2' : ''}`}>
                    {/* Sender name (for group chats) */}
                    {!isOwn && showAvatar && !isGrouped && (
                        <span className="text-xs font-medium text-gray-600 mb-1 px-1">
                            {getDisplayName()}
                        </span>
                    )}

                    {/* Reply context */}
                    {message.reply_to && (
                        <div className={`mb-2 max-w-full ${isOwn ? 'mr-2' : 'ml-2'}`}>
                            <div className={`px-3 py-2 rounded-2xl text-xs border-l-4 ${
                                isOwn
                                    ? 'bg-gray-50 border-gray-400 text-gray-800'
                                    : 'bg-gray-50 border-gray-400 text-gray-600'
                            }`}>
                                <div className="font-semibold text-xs">
                                    {message.reply_to.sender?.firstName || 'Unknown'}
                                </div>
                                <div className="opacity-75 truncate text-xs mt-0.5">
                                    {message.reply_to.content}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Message content */}
                    <div className="relative">
                        <div
                            className={`relative px-4 py-2.5 max-w-full ${
                                isOwn
                                    ? 'bg-gradient-to-br from-gray-500 to-gray-600 text-white rounded-3xl rounded-br-lg shadow-lg'
                                    : 'bg-white text-gray-900 rounded-3xl rounded-bl-lg shadow-md border border-gray-100'
                            }`}
                        >
                            {/* Message content based on type */}
                            {message.message_type === 'text' && (
                                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                                    {message.content}
                                </p>
                            )}

                            {message.message_type === 'image' && (
                                <div className="max-w-sm">
                                    <div className="relative overflow-hidden rounded-2xl">
                                        <Image
                                            src={message.content}
                                            alt="Shared image"
                                            width={400}
                                            height={300}
                                            className="w-full object-cover"
                                        />
                                    </div>
                                    {message.metadata?.caption && (
                                        <p className="mt-2 text-sm leading-relaxed">{message.metadata.caption}</p>
                                    )}
                                </div>
                            )}

                            {message.message_type === 'file' && (
                                <div className={`flex items-center space-x-3 p-3 rounded-2xl ${
                                    isOwn ? 'bg-white bg-opacity-20' : 'bg-gray-50'
                                }`}>
                                    <div className="flex-shrink-0">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                            isOwn ? 'bg-white bg-opacity-30' : 'bg-gray-100'
                                        }`}>
                                            <span className="text-lg">📄</span>
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
                                <span className="text-xs opacity-60 ml-2 font-medium">(edited)</span>
                            )}

                            {/* Message tail */}
                            <div className={`absolute bottom-0 ${
                                isOwn 
                                    ? 'right-0 translate-x-1 translate-y-1' 
                                    : 'left-0 -translate-x-1 translate-y-1'
                            }`}>
                                <div className={`w-4 h-4 transform rotate-45 ${
                                    isOwn 
                                        ? 'bg-gradient-to-br from-gray-500 to-gray-600' 
                                        : 'bg-white border-r border-b border-gray-100'
                                }`}></div>
                            </div>
                        </div>

                        {/* Quick reactions */}
                        {showActions && (
                            <div className={`absolute top-1/2 transform -translate-y-1/2 ${
                                isOwn ? 'right-full mr-3' : 'left-full ml-3'
                            } flex items-center space-x-1 bg-white rounded-full shadow-xl border border-gray-200 p-1.5 
                            opacity-0 group-hover:opacity-100 transition-all duration-200 ease-out scale-95 group-hover:scale-100`}>
                                <button
                                    onClick={() => handleQuickReaction('❤️')}
                                    className="p-1.5 hover:bg-red-50 rounded-full transition-colors duration-150 hover:scale-110 transform"
                                    title="Like"
                                >
                                    <Heart className="w-4 h-4 text-red-500" />
                                </button>
                                <button
                                    onClick={() => handleQuickReaction('👍')}
                                    className="p-1.5 hover:bg-gray-50 rounded-full transition-colors duration-150 hover:scale-110 transform"
                                    title="Thumbs up"
                                >
                                    <ThumbsUp className="w-4 h-4 text-green-500" />
                                </button>
                                <button
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    className="p-1.5 hover:bg-yellow-50 rounded-full transition-colors duration-150 hover:scale-110 transform"
                                    title="Add reaction"
                                >
                                    <Smile className="w-4 h-4 text-yellow-500" />
                                </button>
                                <button
                                    onClick={() => onReply(message)}
                                    className="p-1.5 hover:bg-gray-50 rounded-full transition-colors duration-150 hover:scale-110 transform"
                                    title="Reply"
                                >
                                    <Reply className="w-4 h-4 text-gray-600" />
                                </button>
                                {isOwn && (
                                    <div className="w-px h-4 bg-gray-200 mx-1"></div>
                                )}
                                {isOwn && (
                                    <>
                                        <button
                                            onClick={() => onEdit(message)}
                                            className="p-1.5 hover:bg-gray-50 rounded-full transition-colors duration-150 hover:scale-110 transform"
                                            title="Edit"
                                        >
                                            <Edit className="w-4 h-4 text-gray-600" />
                                        </button>
                                        <button
                                            onClick={() => onDelete(message.id)}
                                            className="p-1.5 hover:bg-red-50 rounded-full transition-colors duration-150 hover:scale-110 transform"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Message reactions */}
                    {message.reactions && message.reactions.length > 0 && userId && (
                        <div className={`mt-1 ${isOwn ? 'mr-2' : 'ml-2'}`}>
                            <MessageReactions
                                reactions={message.reactions}
                                onReact={(emoji) => onReact(message.id, emoji)}
                                currentUserId={userId}
                            />
                        </div>
                    )}

                    {/* Timestamp */}
                    {!isGrouped && (
                        <span className={`text-xs text-gray-500 mt-1.5 px-1 font-medium ${
                            isOwn ? 'mr-2' : 'ml-2'
                        }`}>
                            {formatTime(message.created_at)}
                        </span>
                    )}
                </div>
            </div>

            {/* Emoji picker */}
            {showEmojiPicker && (
                <div className={`absolute z-50 mt-12 ${isOwn ? 'right-0' : 'left-0'}`}>
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