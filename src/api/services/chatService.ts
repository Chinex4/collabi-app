import { db } from '@/data/mockDb';
import { FileResource } from '@/types';
import { generateId } from '@/utils/helpers';

import { addNotification, ensureProjectConversation, requireProject, simulate } from './base';

const syncLastMessage = (conversationId: string, messageId: string) => {
  const conversation = db.conversations.find((item) => item.id === conversationId);
  if (conversation) {
    conversation.lastMessageId = messageId;
  }
};

export const chatService = {
  async getInbox(userId: string) {
    return simulate(() =>
      db.conversations
        .filter((conversation) => conversation.participantIds.includes(userId))
        .sort((a, b) => {
          const latestA =
            db.messages.find((message) => message.id === a.lastMessageId)?.createdAt ?? '';
          const latestB =
            db.messages.find((message) => message.id === b.lastMessageId)?.createdAt ?? '';
          return latestB.localeCompare(latestA);
        })
    );
  },
  async getMessages(conversationId: string) {
    return simulate(() =>
      db.messages
        .filter((message) => message.conversationId === conversationId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    );
  },
  async getPrivateConversation(currentUserId: string, otherUserId: string) {
    return simulate(() => {
      let conversation = db.conversations.find(
        (item) =>
          item.type === 'private' &&
          item.participantIds.includes(currentUserId) &&
          item.participantIds.includes(otherUserId)
      );

      if (!conversation) {
        conversation = {
          id: generateId('conversation'),
          type: 'private',
          participantIds: [currentUserId, otherUserId],
          title: 'New private chat',
          typingUserIds: [],
          unreadBy: { [currentUserId]: 0, [otherUserId]: 0 },
          presence: { [currentUserId]: 'online', [otherUserId]: 'away' },
          lastMessageId: undefined,
        };
        db.conversations.unshift(conversation);
      }

      return conversation;
    });
  },
  async getProjectConversation(projectId: string) {
    return simulate(() => ensureProjectConversation(projectId));
  },
  async joinProjectRoom(projectId: string) {
    return simulate(() => {
      requireProject(projectId);
      return { connected: true };
    }, 300);
  },
  async sendMessage(
    conversationId: string,
    senderId: string,
    body: string,
    attachments: FileResource[] = []
  ) {
    return simulate(() => {
      const conversation = db.conversations.find((item) => item.id === conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      const message = {
        id: generateId('message'),
        conversationId,
        senderId,
        body,
        attachments,
        createdAt: new Date().toISOString(),
        readBy: [senderId],
      };

      db.messages.push(message);
      syncLastMessage(conversationId, message.id);
      conversation.typingUserIds = conversation.typingUserIds.filter(
        (userId) => userId !== senderId
      );
      conversation.participantIds
        .filter((participantId) => participantId !== senderId)
        .forEach((participantId) => {
          conversation.unreadBy[participantId] = (conversation.unreadBy[participantId] ?? 0) + 1;
          addNotification({
            userId: participantId,
            type: 'message',
            title: conversation.type === 'project' ? 'New project message' : 'New direct message',
            body: body || 'Attachment shared in chat.',
            entityType: 'conversation',
            entityId: conversationId,
            isRead: false,
          });
        });
      return message;
    }, 350);
  },
  async editMessage(messageId: string, body: string) {
    return simulate(() => {
      const message = db.messages.find((item) => item.id === messageId);
      if (!message) {
        throw new Error('Message not found');
      }
      message.body = body;
      message.editedAt = new Date().toISOString();
      return message;
    });
  },
  async deleteMessage(messageId: string) {
    return simulate(() => {
      const message = db.messages.find((item) => item.id === messageId);
      if (!message) {
        throw new Error('Message not found');
      }
      message.deletedAt = new Date().toISOString();
      message.body = 'Message deleted';
      return message;
    });
  },
  async setTyping(conversationId: string, userId: string, isTyping: boolean) {
    return simulate(() => {
      const conversation = db.conversations.find((item) => item.id === conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      if (isTyping && !conversation.typingUserIds.includes(userId)) {
        conversation.typingUserIds.push(userId);
      }
      if (!isTyping) {
        conversation.typingUserIds = conversation.typingUserIds.filter((item) => item !== userId);
      }
      return conversation;
    }, 150);
  },
  async markConversationRead(conversationId: string, userId: string) {
    return simulate(() => {
      const conversation = db.conversations.find((item) => item.id === conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      conversation.unreadBy[userId] = 0;
      db.messages
        .filter((message) => message.conversationId === conversationId)
        .forEach((message) => {
          if (!message.readBy.includes(userId)) {
            message.readBy.push(userId);
          }
        });
      return conversation;
    }, 200);
  },
};
