import { QueryClient } from '@tanstack/react-query';
import { RealtimeChannel } from '@supabase/supabase-js';

import { QUERY_KEYS } from '@/constants';
import { cache } from '@/data/cache';
import { db } from '@/data/mockDb';
import { Conversation, FileResource, Message } from '@/types';

import { requireData, throwIfSupabaseError } from '../errors';
import { mapConversation, mapMessage, mapProject, mapUser } from '../mappers';
import { supabase } from '../supabase';
import { notificationService } from './notificationService';

const supabaseAny = supabase as any;

const conversationSelect = `
  *,
  project:projects(*),
  participants:conversation_participants(*, user:users(*)),
  messages(*)
`;
const messageSelect = '*, sender:users(*), attachments:message_attachments(*)';

let channels: RealtimeChannel[] = [];
let client: QueryClient | null = null;

const removeChannels = () => {
  channels.forEach((channel) => supabase.removeChannel(channel));
  channels = [];
};

const sortConversations = (items: Conversation[]) =>
  [...items].sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));

const dedupeMessages = (items: Message[]) => {
  const map = new Map<string, Message>();
  items.forEach((item) => {
    map.set(item.id, item);
  });
  return [...map.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
};

const updateMessagesCache = (conversationId: string, updater: (items: Message[]) => Message[]) => {
  const current = db.messages.filter((item) => item.conversationId === conversationId);
  const next = updater(current);

  cache.replaceMessages([
    ...db.messages.filter((item) => item.conversationId !== conversationId),
    ...next,
  ]);
  client?.setQueryData([...QUERY_KEYS.messages, conversationId], next);
};

const syncConversationDependencies = (row: any) => {
  if (row.project && typeof row.project === 'object') {
    cache.syncProjects([mapProject(row.project)]);
  }
  row.participants?.forEach((participant: any) => {
    if (participant.user && typeof participant.user === 'object') {
      cache.syncUsers([mapUser(participant.user)]);
    }
  });
};

const syncConversation = (row: any) => {
  syncConversationDependencies(row);
  const conversation = mapConversation(row);
  cache.syncConversations([conversation]);
  return conversation;
};

const syncMessage = (row: any) => {
  if (row.sender && typeof row.sender === 'object') {
    cache.syncUsers([mapUser(row.sender)]);
  }
  const message = mapMessage(row);
  cache.syncMessages([message]);
  return message;
};

const subscribeToConversation = (conversationId: string) => {
  if (channels.some((channel) => channel.topic === `realtime:conversation:${conversationId}`)) {
    return;
  }

  const channel = supabase
    .channel(`conversation:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      async () => {
        const messages = await chatService.getMessages(conversationId);
        client?.setQueryData([...QUERY_KEYS.messages, conversationId], messages);
        client?.invalidateQueries({ queryKey: QUERY_KEYS.conversations });
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversation_participants',
        filter: `conversation_id=eq.${conversationId}`,
      },
      () => client?.invalidateQueries({ queryKey: QUERY_KEYS.conversations })
    )
    .subscribe();

  channels.push(channel);
};

const insertMessageAttachments = async (messageId: string, attachments: FileResource[]) => {
  if (!attachments.length) {
    return;
  }

  const { error } = await supabaseAny.from('message_attachments').insert(
    attachments.map((file) => ({
      id: file.id,
      message_id: messageId,
      bucket_id: 'cloudinary',
      object_path: file.url,
      name: file.name,
      mime_type: file.type,
      size_kb: file.sizeKb,
      uploaded_by: file.uploadedBy,
    }))
  );
  throwIfSupabaseError(error);
};

export const chatService = {
  connect(_accessToken: string, queryClient: QueryClient) {
    client = queryClient;
    return supabase.channel('collabi-chat');
  },
  disconnect() {
    removeChannels();
    notificationService.unsubscribe();
    client = null;
  },
  subscribeToConversation,
  async getInbox(userId: string) {
    const { data, error } = await supabaseAny
      .from('conversations')
      .select(conversationSelect)
      .order('updated_at', { ascending: false })
      .limit(50);

    throwIfSupabaseError(error);

    const conversations = sortConversations(
      (data ?? [])
        .filter((item: any) =>
          (item.participants ?? []).some((participant: any) => participant.user_id === userId)
        )
        .map(syncConversation)
    );

    cache.replaceConversations(conversations);
    return conversations;
  },
  async getMessages(conversationId: string) {
    subscribeToConversation(conversationId);

    const { data, error } = await supabaseAny
      .from('messages')
      .select(messageSelect)
      .eq('conversation_id', conversationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .limit(100);

    throwIfSupabaseError(error);

    const messages = dedupeMessages((data ?? []).map(syncMessage));
    updateMessagesCache(conversationId, () => messages);
    return messages;
  },
  async getPrivateConversation(currentUserId: string, otherUserId: string) {
    const inbox = await this.getInbox(currentUserId);
    const existing = inbox.find(
      (item) =>
        item.type === 'private' &&
        item.participantIds.includes(currentUserId) &&
        item.participantIds.includes(otherUserId)
    );
    if (existing) {
      return existing;
    }

    const { data: conversation, error } = await supabaseAny
      .from('conversations')
      .insert({ type: 'private', title: 'Private Chat', created_by: currentUserId })
      .select('*')
      .single();
    throwIfSupabaseError(error);

    const { error: participantError } = await supabaseAny.from('conversation_participants').insert([
      { conversation_id: conversation.id, user_id: currentUserId },
      { conversation_id: conversation.id, user_id: otherUserId },
    ]);
    throwIfSupabaseError(participantError);

    const { data, error: readError } = await supabaseAny
      .from('conversations')
      .select(conversationSelect)
      .eq('id', conversation.id)
      .single();
    throwIfSupabaseError(readError);

    return syncConversation(data);
  },
  async getProjectConversation(projectId: string) {
    const { data: existing, error: existingError } = await supabaseAny
      .from('conversations')
      .select(conversationSelect)
      .eq('type', 'project')
      .eq('project_id', projectId)
      .maybeSingle();
    throwIfSupabaseError(existingError);

    if (existing) {
      return syncConversation(existing);
    }

    const project = db.projects.find((item) => item.id === projectId);
    const { data: conversation, error } = await supabaseAny
      .from('conversations')
      .insert({
        type: 'project',
        project_id: projectId,
        title: project?.title ?? 'Project Chat',
        created_by: project?.ownerId,
      })
      .select('*')
      .single();
    throwIfSupabaseError(error);

    const { data: memberships, error: membershipError } = await supabaseAny
      .from('memberships')
      .select('student_id')
      .eq('project_id', projectId)
      .eq('status', 'active');
    throwIfSupabaseError(membershipError);

    const participantIds = Array.from(
      new Set(((memberships ?? []) as { student_id: string }[]).map((item) => item.student_id))
    );
    if (participantIds.length) {
      const { error: participantError } = await supabaseAny
        .from('conversation_participants')
        .insert(
          participantIds.map((userId) => ({
            conversation_id: conversation.id,
            user_id: userId,
          }))
        );
      throwIfSupabaseError(participantError);
    }

    const { data, error: readError } = await supabaseAny
      .from('conversations')
      .select(conversationSelect)
      .eq('id', conversation.id)
      .single();
    throwIfSupabaseError(readError);

    return syncConversation(data);
  },
  async joinProjectRoom(projectId: string) {
    const conversation = await this.getProjectConversation(projectId);
    subscribeToConversation(conversation.id);
    return { connected: true };
  },
  async sendMessage(
    conversationId: string,
    senderId: string,
    body: string,
    attachments: FileResource[] = []
  ) {
    const conversation = requireData(
      db.conversations.find((item) => item.id === conversationId) ?? null,
      'Conversation not found'
    );

    const { data, error } = await supabaseAny
      .from('messages')
      .insert({ conversation_id: conversation.id, sender_id: senderId, body })
      .select(messageSelect)
      .single();
    throwIfSupabaseError(error);

    await insertMessageAttachments(data.id, attachments);

    const message = await this.getMessage(data.id);
    updateMessagesCache(conversation.id, (items) => dedupeMessages([...items, message]));
    client?.invalidateQueries({ queryKey: QUERY_KEYS.conversations });
    return message;
  },
  async getMessage(messageId: string) {
    const { data, error } = await supabaseAny
      .from('messages')
      .select(messageSelect)
      .eq('id', messageId)
      .single();

    throwIfSupabaseError(error);
    return syncMessage(data);
  },
  async editMessage(messageId: string, body: string) {
    const { data, error } = await supabaseAny
      .from('messages')
      .update({ body, edited_at: new Date().toISOString() })
      .eq('id', messageId)
      .select(messageSelect)
      .single();

    throwIfSupabaseError(error);
    return syncMessage(data);
  },
  async deleteMessage(messageId: string) {
    const { data, error } = await supabaseAny
      .from('messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', messageId)
      .select(messageSelect)
      .single();

    throwIfSupabaseError(error);
    return syncMessage(data);
  },
  async setTyping(conversationId: string, userId: string, isTyping: boolean) {
    const { error } = await supabaseAny
      .from('conversation_participants')
      .update({ typing_until: isTyping ? new Date(Date.now() + 5000).toISOString() : null })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    throwIfSupabaseError(error);
    return db.conversations.find((item) => item.id === conversationId);
  },
  async markConversationRead(conversationId: string, _userId: string) {
    const { error } = await supabaseAny.rpc('mark_conversation_read', {
      p_conversation_id: conversationId,
    });
    throwIfSupabaseError(error);

    const updated = db.conversations.find((item) => item.id === conversationId);
    if (updated) {
      cache.syncConversations([{ ...updated, unreadBy: {} }]);
    }
    return updated;
  },
};
