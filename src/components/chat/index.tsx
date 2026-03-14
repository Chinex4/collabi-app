import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, View } from 'react-native';

import { AppButton, AppInput, AppText, Avatar, Badge } from '@/components/common';
import { db } from '@/data/mockDb';
import { Conversation, Message } from '@/types';
import { formatDate } from '@/utils/helpers';

export const ConversationListItem = ({
  conversation,
  currentUserId,
  onPress,
}: {
  conversation: Conversation;
  currentUserId: string;
  onPress: () => void;
}) => {
  const otherParticipant = db.users.find(
    (user) => user.id !== currentUserId && conversation.participantIds.includes(user.id)
  );
  const lastMessage = db.messages.find((message) => message.id === conversation.lastMessageId);
  const isProject = conversation.type === 'project';

  return (
    <Pressable onPress={onPress} className="mb-3 flex-row items-center rounded-3xl bg-white p-4">
      <Avatar
        name={isProject ? conversation.title : (otherParticipant?.fullName ?? 'Conversation')}
        uri={isProject ? undefined : otherParticipant?.avatar}
      />
      <View className="ml-3 flex-1">
        <AppText className="text-base font-semibold text-slate-900">
          {isProject ? conversation.title : otherParticipant?.fullName}
        </AppText>
        <AppText className="mt-1 text-sm text-slate-500" numberOfLines={1}>
          {lastMessage?.body ?? 'No messages yet'}
        </AppText>
      </View>
      <View className="items-end">
        <AppText className="text-xs text-slate-400">
          {lastMessage ? formatDate(lastMessage.createdAt, 'HH:mm') : ''}
        </AppText>
        {(conversation.unreadBy[currentUserId] ?? 0) > 0 ? (
          <Badge label={String(conversation.unreadBy[currentUserId])} tone="danger" />
        ) : null}
      </View>
    </Pressable>
  );
};

export const MessageBubble = ({
  message,
  isCurrentUser,
}: {
  message: Message;
  isCurrentUser: boolean;
}) => (
  <View className={isCurrentUser ? 'items-end' : 'items-start'}>
    <View
      className={
        isCurrentUser
          ? 'max-w-[82%] rounded-[24px] rounded-br-md bg-[#7921BF] px-4 py-3'
          : 'max-w-[82%] rounded-[24px] rounded-bl-md bg-white px-4 py-3'
      }>
      <AppText className={isCurrentUser ? 'text-white' : 'text-slate-900'}>{message.body}</AppText>
      <AppText
        className={
          isCurrentUser ? 'mt-2 text-[11px] text-violet-100' : 'mt-2 text-[11px] text-slate-400'
        }>
        {formatDate(message.createdAt, 'HH:mm')} {message.editedAt ? '• edited' : ''}
      </AppText>
    </View>
  </View>
);

export const TypingIndicator = ({ names }: { names: string[] }) => {
  if (!names.length) {
    return null;
  }

  return (
    <View className="rounded-full bg-violet-100 px-4 py-2">
      <AppText className="text-xs text-violet-700">{names.join(', ')} typing...</AppText>
    </View>
  );
};

export const ChatComposer = ({
  value,
  onChangeText,
  onSend,
  onAttach,
}: {
  value: string;
  onChangeText: (value: string) => void;
  onSend: () => void;
  onAttach?: () => void;
}) => (
  <View className="flex-row items-center rounded-[28px] border border-violet-200 bg-white p-2">
    <Pressable
      onPress={onAttach}
      className="h-11 w-11 items-center justify-center rounded-full bg-violet-100">
      <Ionicons name="attach" size={18} color="#7921BF" />
    </Pressable>
    <View className="mx-2 flex-1">
      <AppInput value={value} onChangeText={onChangeText} placeholder="Write a message" />
    </View>
    <AppButton label="Send" onPress={onSend} />
  </View>
);
