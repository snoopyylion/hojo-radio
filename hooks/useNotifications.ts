// hooks/useNotifications.ts
import { useEffect, useState, useCallback, useRef } from 'react';
import { Message, TypingUser, User } from '@/types/messaging';
import toast from 'react-hot-toast';

interface NotificationSound {
    message: HTMLAudioElement;
    typing: HTMLAudioElement;
}

interface UseNotificationsProps {
    currentUserId: string;
    isWindowFocused?: boolean;
    conversations?: any[];
}

export interface NotificationPermissionState {
    granted: boolean;
    denied: boolean;
    default: boolean;
}

const notifyWithToast = (title: string, body: string) => {
  toast(`${title}: ${body}`, {
    icon: '💬'
  });
};

export const useNotifications = ({
    currentUserId,
    isWindowFocused = true,
    conversations = []
}: UseNotificationsProps) => {
    const [permissionState, setPermissionState] = useState<NotificationPermissionState>({
        granted: false,
        denied: false,
        default: true
    });

    const [soundEnabled, setSoundEnabled] = useState(true);
    const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(true);
    const [inAppNotificationsEnabled, setInAppNotificationsEnabled] = useState(true);

    const soundsRef = useRef<NotificationSound | null>(null);
    const activeNotificationsRef = useRef<Notification[]>([]);

    // Initialize notification sounds
    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                soundsRef.current = {
                    message: new Audio('/sounds/message-notification.mp3'),
                    typing: new Audio('/sounds/typing-notification.mp3')
                };

                // Set volume levels
                soundsRef.current.message.volume = 0.6;
                soundsRef.current.typing.volume = 0.3;

                // Preload sounds
                soundsRef.current.message.load();
                soundsRef.current.typing.load();
            } catch (error) {
                console.warn('⚠️ Could not load notification sounds:', error);
            }
        }
    }, []);

    // Check and update notification permission
    const checkNotificationPermission = useCallback(() => {
        if ('Notification' in window) {
            const permission = Notification.permission;
            setPermissionState({
                granted: permission === 'granted',
                denied: permission === 'denied',
                default: permission === 'default'
            });
        }
    }, []);

    // Initialize permission check
    useEffect(() => {
        checkNotificationPermission();
    }, [checkNotificationPermission]);

    // Request notification permission
    const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
        if (!('Notification' in window)) {
            console.warn('⚠️ This browser does not support notifications');
            return false;
        }

        try {
            const permission = await Notification.requestPermission();
            checkNotificationPermission();
            return permission === 'granted';
        } catch (error) {
            console.error('❌ Error requesting notification permission:', error);
            return false;
        }
    }, [checkNotificationPermission]);

    // Play notification sound
    const playNotificationSound = useCallback((type: 'message' | 'typing') => {
        if (!soundEnabled || !soundsRef.current) return;

        try {
            const sound = soundsRef.current[type];
            if (sound) {
                sound.currentTime = 0; // Reset to start
                sound.play().catch(error => {
                    console.warn('⚠️ Could not play notification sound:', error);
                });
            }
        } catch (error) {
            console.warn('⚠️ Error playing notification sound:', error);
        }
    }, [soundEnabled]);

    // Show browser notification
    const showBrowserNotification = useCallback((
        title: string,
        options: NotificationOptions = {},
        onClick?: () => void
    ) => {
        if (!browserNotificationsEnabled || !permissionState.granted || isWindowFocused) {
            return null;
        }

        try {
            const notification = new Notification(title, {
                ...(options as any),
                icon: '/icons/message-icon.png',
                badge: '/icons/badge-icon.png',
                tag: 'message-notification',
                renotify: true
            });


            // Store reference for cleanup
            activeNotificationsRef.current.push(notification);

            // Handle click
            if (onClick) {
                notification.onclick = (event) => {
                    event.preventDefault();
                    window.focus();
                    onClick();
                    notification.close();
                };
            }

            // Auto close after 5 seconds
            setTimeout(() => {
                notification.close();
            }, 5000);

            // Clean up reference when closed
            notification.onclose = () => {
                activeNotificationsRef.current = activeNotificationsRef.current.filter(n => n !== notification);
            };

            return notification;
        } catch (error) {
            console.error('❌ Error showing browser notification:', error);
            return null;
        }
    }, [browserNotificationsEnabled, permissionState.granted, isWindowFocused]);

    // Get conversation name helper
    const getConversationName = useCallback((conversationId: string): string => {
        const conversation = conversations.find(c => c.id === conversationId);
        if (!conversation) return 'Unknown Conversation';

        if (conversation.name) return conversation.name;

        // For direct messages, show other participant's name
        const otherParticipants = conversation.participants?.filter(
            (p: any) => p.user_id !== currentUserId
        );

        if (otherParticipants?.length === 1) {
            return otherParticipants[0].user?.username || 'Unknown User';
        }

        return `Group Chat (${conversation.participants?.length || 0} members)`;
    }, [conversations, currentUserId]);

    // Get user name helper
    const getUserName = useCallback((userId: string, users: User[]): string => {
        const user = users.find(u => u.id === userId);
        return user?.username || user?.email || 'Unknown User';
    }, []);

    // Notify new message
    const notifyNewMessage = useCallback((
        message: Message,
        users: User[] = [],
        onNotificationClick?: () => void
    ) => {
        // Don't notify for own messages
        if (message.sender_id === currentUserId) return;

        const senderName = getUserName(message.sender_id, users);
        const conversationName = getConversationName(message.conversation_id);

        // Play sound
        playNotificationSound('message');

        // Show browser notification
        const title = `New message from ${senderName}`;
        const body = message.content.length > 50
            ? `${message.content.substring(0, 50)}...`
            : message.content;

        showBrowserNotification(title, {
            body,
            icon: '/icons/message-icon.png',
            data: {
                messageId: message.id,
                conversationId: message.conversation_id,
                senderId: message.sender_id
            }
        }, onNotificationClick);

    }, [
        currentUserId,
        getUserName,
        getConversationName,
        playNotificationSound,
        showBrowserNotification
    ]);

    // Notify typing
    const notifyTyping = useCallback((
        typingUsers: TypingUser[],
        users: User[] = [],
        conversationId: string
    ) => {
        // Filter out current user and get active typers
        const activeTypers = typingUsers.filter(tu =>
            tu.userId !== currentUserId &&
            Date.now() - tu.timestamp < 5000
        );

        if (activeTypers.length === 0) return;

        // Play subtle typing sound (only once per typing session)
        playNotificationSound('typing');

        // For browser notifications, only show if window is not focused
        if (!isWindowFocused && browserNotificationsEnabled && permissionState.granted) {
            const conversationName = getConversationName(conversationId);
            const typerNames = activeTypers.map(tu =>
                getUserName(tu.userId, users)
            );

            let title: string;
            if (typerNames.length === 1) {
                title = `${typerNames[0]} is typing...`;
            } else if (typerNames.length === 2) {
                title = `${typerNames[0]} and ${typerNames[1]} are typing...`;
            } else {
                title = `${typerNames.length} people are typing...`;
            }

            // Use a different tag for typing notifications to avoid conflicts
            showBrowserNotification(title, {
                body: `In ${conversationName}`,
                icon: '/icons/typing-icon.png',
                tag: 'typing-notification',
                silent: true, // Less intrusive
                data: {
                    type: 'typing',
                    conversationId,
                    typers: activeTypers
                }
            });
        }
    }, [
        currentUserId,
        isWindowFocused,
        browserNotificationsEnabled,
        permissionState.granted,
        getUserName,
        getConversationName,
        playNotificationSound,
        showBrowserNotification
    ]);

    // Clear all active notifications
    const clearAllNotifications = useCallback(() => {
        activeNotificationsRef.current.forEach(notification => {
            try {
                notification.close();
            } catch (error) {
                console.warn('⚠️ Error closing notification:', error);
            }
        });
        activeNotificationsRef.current = [];
    }, []);

    // Update settings
    const updateSettings = useCallback((settings: {
        soundEnabled?: boolean;
        browserNotificationsEnabled?: boolean;
        inAppNotificationsEnabled?: boolean;
    }) => {
        if (settings.soundEnabled !== undefined) {
            setSoundEnabled(settings.soundEnabled);
        }
        if (settings.browserNotificationsEnabled !== undefined) {
            setBrowserNotificationsEnabled(settings.browserNotificationsEnabled);
        }
        if (settings.inAppNotificationsEnabled !== undefined) {
            setInAppNotificationsEnabled(settings.inAppNotificationsEnabled);
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            clearAllNotifications();
        };
    }, [clearAllNotifications]);

    return {
        // Permission state
        permissionState,
        requestNotificationPermission,

        // Settings
        soundEnabled,
        browserNotificationsEnabled,
        inAppNotificationsEnabled,
        updateSettings,

        // Notification methods
        notifyNewMessage,
        notifyTyping,
        clearAllNotifications,

        // Utility methods
        playNotificationSound
    };
};