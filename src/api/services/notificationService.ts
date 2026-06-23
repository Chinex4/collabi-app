import { QueryClient } from '@tanstack/react-query';
import { RealtimeChannel } from '@supabase/supabase-js';

import { QUERY_KEYS } from '@/constants';
import { cache } from '@/data/cache';
import { db } from '@/data/mockDb';

import { throwIfSupabaseError } from '../errors';
import { mapNotification } from '../mappers';
import { supabase } from '../supabase';

const supabaseAny = supabase as any;

let channel: RealtimeChannel | null = null;

export const notificationService = {
  subscribe(userId: string, queryClient: QueryClient) {
    if (channel) {
      supabase.removeChannel(channel);
    }

    channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          cache.syncNotifications([mapNotification(payload.new)]);
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications });
        }
      )
      .subscribe();

    return channel;
  },
  unsubscribe() {
    if (channel) {
      supabase.removeChannel(channel);
    }
    channel = null;
  },
  async getNotifications(userId: string) {
    const { data, error } = await supabaseAny
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    throwIfSupabaseError(error);

    const items = (data ?? []).map(mapNotification);
    cache.replaceNotifications(items);
    return items;
  },
  async markAsRead(notificationId: string) {
    const { data, error } = await supabaseAny
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .select('*')
      .single();

    throwIfSupabaseError(error);

    const notification = mapNotification(data);
    cache.syncNotifications([notification]);
    return notification;
  },
  async markAllAsRead(userId: string) {
    const { error } = await supabaseAny
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    throwIfSupabaseError(error);

    cache.replaceNotifications(db.notifications.map((item) => ({ ...item, isRead: true })));
    return { success: true };
  },
  async deleteNotification(notificationId: string) {
    const { error } = await supabaseAny.from('notifications').delete().eq('id', notificationId);
    throwIfSupabaseError(error);

    cache.replaceNotifications(db.notifications.filter((item) => item.id !== notificationId));
    return { success: true };
  },
};
