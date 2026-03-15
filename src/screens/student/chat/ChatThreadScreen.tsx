import { useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { chatService } from '@/api/services/chatService';
import { uploadService } from '@/api/services/uploadService';
import { AppHeader, AppScreen, LoadingState } from '@/components/common';
import { ChatComposer, MessageBubble, TypingIndicator } from '@/components/chat';
import { QUERY_KEYS } from '@/constants';
import { db } from '@/data/mockDb';
import { useMessages } from '@/hooks/useQueries';
import { useSession } from '@/hooks/useSession';
import { useAppDispatch } from '@/hooks/useAppStore';
import { showToast } from '@/store/uiSlice';

export const ChatThreadScreen = ({ route, mode }: { route: any; mode: 'private' | 'project' }) => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { currentUser } = useSession();
  const [composer, setComposer] = useState('');
  const conversationId = route.params?.conversationId as string | undefined;
  const projectId = route.params?.projectId as string | undefined;
  const otherUserId = route.params?.userId as string | undefined;
  const [resolvedConversationId, setResolvedConversationId] = useState<string | undefined>(
    conversationId
  );
  const messagesQuery = useMessages(resolvedConversationId);
  const conversation = db.conversations.find((item) => item.id === resolvedConversationId);

  useEffect(() => {
    const bootstrap = async () => {
      if (conversationId) {
        setResolvedConversationId(conversationId);
        await chatService.markConversationRead(conversationId, currentUser!.id);
        return;
      }

      if (mode === 'project' && projectId) {
        await chatService.joinProjectRoom(projectId);
        const result = await chatService.getProjectConversation(projectId);
        setResolvedConversationId(result.id);
        await chatService.markConversationRead(result.id, currentUser!.id);
      }

      if (mode === 'private' && otherUserId) {
        const result = await chatService.getPrivateConversation(currentUser!.id, otherUserId);
        setResolvedConversationId(result.id);
        await chatService.markConversationRead(result.id, currentUser!.id);
      }
    };

    void bootstrap();
  }, [conversationId, currentUser, mode, otherUserId, projectId]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!resolvedConversationId) {
        throw new Error('Conversation not ready');
      }
      return chatService.sendMessage(resolvedConversationId, currentUser!.id, composer.trim());
    },
    onSuccess: () => {
      setComposer('');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.messages });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversations });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications });
    },
  });

  const attachMutation = useMutation({
    mutationFn: async () => {
      if (!resolvedConversationId) {
        throw new Error('Conversation not ready');
      }
      const file = await uploadService.pickDocument(currentUser!.id, 'chat');
      if (!file) {
        return null;
      }
      return chatService.sendMessage(
        resolvedConversationId,
        currentUser!.id,
        'Shared an attachment',
        [file]
      );
    },
    onSuccess: (result) => {
      if (!result) {
        return;
      }
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.messages });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversations });
      dispatch(showToast({ type: 'success', message: 'Attachment shared' }));
    },
  });

  const typingNames =
    conversation?.typingUserIds
      .filter((userId) => userId !== currentUser?.id)
      .map((userId) => db.users.find((user) => user.id === userId)?.fullName.split(' ')[0] ?? '')
      .filter(Boolean) ?? [];

  const threadTitle = useMemo(() => {
    if (mode === 'project') {
      return db.projects.find((project) => project.id === projectId)?.title ?? 'Project Chat';
    }
    const otherParticipant = db.users.find((user) => user.id === otherUserId);
    return otherParticipant?.fullName ?? 'Private Chat';
  }, [mode, otherUserId, projectId]);

  return (
    <AppScreen scroll={false}>
      <View className="flex-1">
        <AppHeader
          title={threadTitle}
          subtitle={mode === 'project' ? 'Project group chat' : 'Direct conversation'}
        />
        {!resolvedConversationId || messagesQuery.isLoading ? (
          <LoadingState label="Joining conversation..." />
        ) : null}
        {resolvedConversationId ? (
          <>
            <ScrollView className="flex-1" contentContainerStyle={{ gap: 12, paddingBottom: 16 }}>
              {messagesQuery.data?.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isCurrentUser={message.senderId === currentUser?.id}
                />
              ))}
              <TypingIndicator names={typingNames} />
            </ScrollView>
            <ChatComposer
              value={composer}
              onChangeText={(value) => {
                setComposer(value);
                if (resolvedConversationId) {
                  void chatService.setTyping(
                    resolvedConversationId,
                    currentUser!.id,
                    Boolean(value)
                  );
                }
              }}
              onSend={() => {
                if (!composer.trim()) return;
                sendMutation.mutate();
              }}
              onAttach={() => attachMutation.mutate()}
            />
          </>
        ) : null}
      </View>
    </AppScreen>
  );
};
