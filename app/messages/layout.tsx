'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import ConversationList from '@/components/messaging/ConversationList';
import { MessagingLayout } from '@/components/messaging/MessagingLayout';
import { useMessageApi } from '@/hooks/useMessageApi';
import { Conversation, Message, TypingUser } from '@/types/messaging';
import { useWebSocketConnection } from '@/hooks/useWebSocketConnection';

export default function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { userId, isLoaded } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [allTypingUsers, setAllTypingUsers] = useState<Record<string, TypingUser[]>>({});
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected');
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  const { loadConversationsFromAPI } = useMessageApi();

  const activeConversationId = pathname?.split('/messages/')[1] || undefined;

  const {
    isConnected,
    sendTypingUpdate,
    sendMessage: sendWebSocketMessage,
    isConnecting
  } = useWebSocketConnection({
    conversationId: activeConversationId || '',
    userId: userId!,
    setMessages,
    setConversations,
    setTypingUsers: setAllTypingUsers,
    setOnlineUsers
  });

  useEffect(() => {
    if (isConnected) {
      setConnectionStatus('connected');
    } else if (isConnecting) {
      setConnectionStatus('reconnecting');
    } else {
      setConnectionStatus('disconnected');
    }
  }, [isConnected, isConnecting]);

  const initializeConversations = useCallback(async () => {
    if (!isLoaded || !userId || hasInitialized) return;

    setLoading(true);
    try {
      console.log('🔄 Loading conversations for messages layout');
      const conversationsData = await loadConversationsFromAPI();
      setConversations(conversationsData);
      setHasInitialized(true);
    } catch (error) {
      console.error('❌ Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [isLoaded, userId, hasInitialized, loadConversationsFromAPI]);

  useEffect(() => {
    initializeConversations();
  }, [initializeConversations]);

  const handleConversationSelect = useCallback((conversationId: string) => {
    router.push(`/messages/${conversationId}`);
  }, [router]);

  const handleConversationsUpdate = useCallback((updatedConversations: Conversation[]) => {
    setConversations(updatedConversations);
  }, []);

  const handleNewConversation = useCallback(() => {
    router.push('/messages/new');
  }, [router]);

  useEffect(() => {
    if (isLoaded && !userId) {
      router.push('/sign-in');
    }
  }, [isLoaded, userId, router]);

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#EF3866]"></div>
      </div>
    );
  }

  if (!userId) {
    return null;
  }

  const sidebarContent = (
    <ConversationList
      conversations={conversations}
      activeConversationId={activeConversationId}
      onConversationSelect={handleConversationSelect}
      onNewConversation={handleNewConversation}
      currentUserId={userId}
      isLoading={loading}
      onConversationsUpdate={handleConversationsUpdate}
      typingUsers={allTypingUsers}
    />
  );

  return (
    <MessagingLayout sidebar={sidebarContent}>
      {/* You can optionally show connectionStatus somewhere in the UI */}
      {children}
    </MessagingLayout>
  );
}
