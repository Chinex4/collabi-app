import { QueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';

import { QUERY_KEYS } from '@/constants';
import { cache } from '@/data/cache';
import { db } from '@/data/mockDb';
import { Conversation, FileResource, Message } from '@/types';

import { SOCKET_BASE_URL, apiRequest } from '../http';
import { mapConversation, mapMessage, mapNotification, mapProject, mapUser } from '../mappers';

type ChatEventPayload = {
  conversation?: any;
  message?: any;
};

const PROJECT_PLACEHOLDER_PREFIX = 'project:';

let socket: Socket | null = null;
let client: QueryClient | null = null;

const isProjectPlaceholder = (conversationId: string) =>
  conversationId.startsWith(PROJECT_PLACEHOLDER_PREFIX);

const updateMessagesCache = (conversationId: string, updater: (items: Message[]) => Message[]) => {
  const current = db.messages.filter((item) => item.conversationId === conversationId);
  const next = updater(current);

  cache.replaceMessages([
    ...db.messages.filter((item) => item.conversationId !== conversationId),
    ...next,
  ]);
  client?.setQueryData([...QUERY_KEYS.messages, conversationId], next);
};

const updateConversationsCache = (updater: (items: Conversation[]) => Conversation[]) => {
  const next = updater(db.conversations);
  cache.replaceConversations(next);
  client?.setQueryData(
    [...QUERY_KEYS.conversations, undefined],
    next
  );
};

const sortConversations = (items: Conversation[]) =>
  [...items].sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));

const syncConversationPayload = (payload: ChatEventPayload) => {
  if (payload.conversation?.participants) {
    payload.conversation.participants.forEach((participant: any) => {
      if (participant && typeof participant === 'object') {
        cache.syncUsers([mapUser(participant)]);
      }
    });
  }
  if (payload.conversation?.project && typeof payload.conversation.project === 'object') {
    cache.syncProjects([mapProject(payload.conversation.project)]);
  }
  if (payload.message?.sender && typeof payload.message.sender === 'object') {
    cache.syncUsers([mapUser(payload.message.sender)]);
  }
};

const applyIncomingMessage = (payload: ChatEventPayload) => {
  syncConversationPayload(payload);

  if (!payload.conversation || !payload.message) {
    return;
  }

  const conversation = mapConversation(payload.conversation);
  const message = mapMessage(payload.message);
  const mergedConversation = {
    ...db.conversations.find((item) => item.id === conversation.id),
    ...conversation,
    lastMessageId: message.id,
    updatedAt: message.createdAt,
  };

  cache.syncConversations([mergedConversation]);
  cache.syncMessages([message]);
  client?.invalidateQueries({ queryKey: QUERY_KEYS.conversations });
  client?.setQueryData([...QUERY_KEYS.messages, message.conversationId], (current: Message[] = []) =>
    dedupeMessages([...current, message])
  );
};

const dedupeMessages = (items: Message[]) => {
  const map = new Map<string, Message>();
  items.forEach((item) => {
    map.set(item.id, item);
  });
  return [...map.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
};

const bindSocket = () => {
  if (!socket) {
    return;
  }

  socket.on('private_message', (payload: ChatEventPayload) => applyIncomingMessage(payload));
  socket.on('project_message', (payload: ChatEventPayload) => applyIncomingMessage(payload));
  socket.on('message_edited', (payload: any) => {
    const updated = {
      ...(db.messages.find((item) => item.id === payload._id) as Message | undefined),
      id: payload._id,
      body: payload.content,
      editedAt: payload.isEdited ? new Date().toISOString() : undefined,
    } as Message;
    cache.syncMessages([updated]);
    client?.invalidateQueries({ queryKey: QUERY_KEYS.messages });
  });
  socket.on('message_deleted', (payload: any) => {
    const updated = {
      ...(db.messages.find((item) => item.id === payload._id) as Message | undefined),
      id: payload._id,
      body: payload.content,
      deletedAt: new Date().toISOString(),
    } as Message;
    cache.syncMessages([updated]);
    client?.invalidateQueries({ queryKey: QUERY_KEYS.messages });
  });
  socket.on('messages_read', ({ conversationId, messageIds }: { conversationId: string; messageIds: string[] }) => {
    updateMessagesCache(conversationId, (items) =>
      items.map((item) =>
        messageIds.includes(item.id)
          ? { ...item, readBy: Array.from(new Set([...item.readBy, 'self'])) }
          : item
      )
    );
  });
  socket.on('typing_start', (payload: any) => {
    const conversation = resolveTypingConversation(payload);
    if (!conversation || conversation.typingUserIds.includes(payload.userId)) {
      return;
    }
    cache.syncConversations([
      { ...conversation, typingUserIds: [...conversation.typingUserIds, payload.userId] },
    ]);
    client?.invalidateQueries({ queryKey: QUERY_KEYS.conversations });
  });
  socket.on('typing_stop', (payload: any) => {
    const conversation = resolveTypingConversation(payload);
    if (!conversation) {
      return;
    }
    cache.syncConversations([
      {
        ...conversation,
        typingUserIds: conversation.typingUserIds.filter((item) => item !== payload.userId),
      },
    ]);
    client?.invalidateQueries({ queryKey: QUERY_KEYS.conversations });
  });
  socket.on('notification:new', (payload: any) => {
    const notification = mapNotification(payload);
    cache.syncNotifications([notification]);
    client?.invalidateQueries({ queryKey: QUERY_KEYS.notifications });
  });
};

const resolveTypingConversation = (payload: any) => {
  if (payload.conversationId) {
    return db.conversations.find((item) => item.id === payload.conversationId);
  }
  if (payload.projectId) {
    return db.conversations.find((item) => item.projectId === payload.projectId);
  }
  return undefined;
};

const getActualConversationId = (conversationId: string) => {
  if (!isProjectPlaceholder(conversationId)) {
    return conversationId;
  }

  return db.conversations.find((item) => item.id === conversationId)?.lastMessageId
    ? conversationId
    : '';
};

export const chatService = {
  connect(accessToken: string, queryClient: QueryClient) {
    client = queryClient;

    if (socket?.connected) {
      return socket;
    }

    socket = io(SOCKET_BASE_URL, {
      auth: { token: accessToken },
      transports: ['websocket'],
    });

    bindSocket();
    return socket;
  },
  disconnect() {
    socket?.removeAllListeners();
    socket?.disconnect();
    socket = null;
    client = null;
  },
  async getInbox(_userId: string) {
    const response = await apiRequest<any[]>('/chat/conversations', {
      auth: true,
      query: { page: 1, limit: 50 },
    });

    const conversations = response.data.map((item) => {
      item.participants?.forEach((participant: any) => {
        if (participant && typeof participant === 'object') {
          cache.syncUsers([mapUser(participant)]);
        }
      });
      if (item.lastMessage && typeof item.lastMessage === 'object') {
        cache.syncMessages([mapMessage(item.lastMessage)]);
      }
      return mapConversation(item);
    });

    cache.replaceConversations(sortConversations(conversations));
    return sortConversations(conversations);
  },
  async getMessages(conversationId: string) {
    if (isProjectPlaceholder(conversationId)) {
      return [];
    }

    const response = await apiRequest<any[]>(`/chat/conversations/${conversationId}/messages`, {
      auth: true,
      query: { page: 1, limit: 100 },
    });

    const messages = response.data.map((item) => {
      if (item.sender && typeof item.sender === 'object') {
        cache.syncUsers([mapUser(item.sender)]);
      }
      return mapMessage(item);
    });
    updateMessagesCache(conversationId, () => dedupeMessages(messages));
    return dedupeMessages(messages);
  },
  async getPrivateConversation(_currentUserId: string, otherUserId: string) {
    const response = await apiRequest<any>('/chat/conversations/private', {
      method: 'POST',
      auth: true,
      json: { participantId: otherUserId },
    });

    const conversation = mapConversation(response.data);
    cache.syncConversations([conversation]);
    return conversation;
  },
  async getProjectConversation(projectId: string) {
    const inbox = await this.getInbox('');
    const existing = inbox.find((item) => item.projectId === projectId);
    if (existing) {
      return existing;
    }

    const response = await apiRequest<any[]>(`/chat/projects/${projectId}/messages`, {
      auth: true,
      query: { page: 1, limit: 100 },
    });

    const messages = response.data.map(mapMessage);
    const actualConversationId = messages[0]?.conversationId;
    if (actualConversationId) {
      const latestMessage = messages[messages.length - 1];
      const derivedConversation: Conversation = {
        id: actualConversationId,
        type: 'project',
        participantIds: db.memberships
          .filter((item) => item.projectId === projectId && item.status === 'active')
          .map((item) => item.studentId),
        projectId,
        title: db.projects.find((item) => item.id === projectId)?.title ?? 'Project Chat',
        lastMessageId: latestMessage?.id,
        typingUserIds: [],
        unreadBy: {},
        presence: {},
        updatedAt: latestMessage?.createdAt,
      };
      cache.syncConversations([derivedConversation]);
      updateMessagesCache(actualConversationId, () => dedupeMessages(messages));
      return derivedConversation;
    }

    const placeholder: Conversation = {
      id: `${PROJECT_PLACEHOLDER_PREFIX}${projectId}`,
      type: 'project',
      participantIds: db.memberships
        .filter((item) => item.projectId === projectId && item.status === 'active')
        .map((item) => item.studentId),
      projectId,
      title: db.projects.find((item) => item.id === projectId)?.title ?? 'Project Chat',
      typingUserIds: [],
      unreadBy: {},
      presence: {},
    };
    cache.syncConversations([placeholder]);
    return placeholder;
  },
  async joinProjectRoom(projectId: string) {
    socket?.emit('join_project_room', { projectId });
    return { connected: true };
  },
  async sendMessage(
    conversationId: string,
    senderId: string,
    body: string,
    attachments: FileResource[] = []
  ) {
    const conversation = db.conversations.find((item) => item.id === conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (conversation.type === 'project' && conversation.projectId) {
      const response = await apiRequest<any>('/chat/messages/project', {
        method: 'POST',
        auth: true,
        json: {
          projectId: conversation.projectId,
          content: body,
          attachments: attachments.map((item) => item.id),
        },
      });

      applyIncomingMessage(response.data);
      return mapMessage(response.data.message);
    }

    const recipientId = conversation.participantIds.find((item) => item !== senderId);
    if (!recipientId) {
      throw new Error('Recipient not found');
    }

    const response = await apiRequest<any>('/chat/messages/private', {
      method: 'POST',
      auth: true,
      json: {
        recipientId,
        content: body,
        attachments: attachments.map((item) => item.id),
      },
    });

    applyIncomingMessage(response.data);
    return mapMessage(response.data.message);
  },
  async editMessage(messageId: string, body: string) {
    const response = await apiRequest<any>(`/chat/messages/${messageId}`, {
      method: 'PATCH',
      auth: true,
      json: { content: body },
    });

    const message = mapMessage(response.data);
    cache.syncMessages([message]);
    return message;
  },
  async deleteMessage(messageId: string) {
    const response = await apiRequest<any>(`/chat/messages/${messageId}`, {
      method: 'DELETE',
      auth: true,
    });

    const message = mapMessage(response.data);
    cache.syncMessages([message]);
    return message;
  },
  async setTyping(conversationId: string, userId: string, isTyping: boolean) {
    const conversation = db.conversations.find((item) => item.id === conversationId);
    if (!conversation || !socket) {
      return conversation;
    }

    if (conversation.type === 'project' && conversation.projectId) {
      socket.emit(isTyping ? 'typing_start' : 'typing_stop', {
        projectId: conversation.projectId,
      });
    } else {
      const recipientId = conversation.participantIds.find((item) => item !== userId);
      socket.emit(isTyping ? 'typing_start' : 'typing_stop', {
        recipientId,
        conversationId: getActualConversationId(conversationId) || conversationId,
      });
    }

    return conversation;
  },
  async markConversationRead(conversationId: string, _userId: string) {
    if (isProjectPlaceholder(conversationId)) {
      return db.conversations.find((item) => item.id === conversationId);
    }

    await apiRequest(`/chat/conversations/${conversationId}/read`, {
      method: 'PATCH',
      auth: true,
    });

    const updated = db.conversations.find((item) => item.id === conversationId);
    if (updated) {
      cache.syncConversations([{ ...updated, unreadBy: {} }]);
    }
    return updated;
  },
};
