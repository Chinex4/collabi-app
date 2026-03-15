import { cache } from '@/data/cache';
import { db } from '@/data/mockDb';

import { apiRequest } from '../http';
import { mapNotification } from '../mappers';

export const notificationService = {
  async getNotifications(_userId: string) {
    const response = await apiRequest<any[]>('/notifications', {
      auth: true,
    });

    const items = response.data.map(mapNotification);
    cache.replaceNotifications(items);
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async markAsRead(notificationId: string) {
    const response = await apiRequest<any>(`/notifications/${notificationId}/read`, {
      method: 'PATCH',
      auth: true,
    });

    const notification = mapNotification(response.data);
    cache.syncNotifications([notification]);
    return notification;
  },
  async markAllAsRead(_userId: string) {
    await apiRequest('/notifications/mark-all-read', {
      method: 'PATCH',
      auth: true,
    });

    cache.replaceNotifications(db.notifications.map((item) => ({ ...item, isRead: true })));
    return { success: true };
  },
  async deleteNotification(notificationId: string) {
    await apiRequest(`/notifications/${notificationId}`, {
      method: 'DELETE',
      auth: true,
    });

    cache.replaceNotifications(db.notifications.filter((item) => item.id !== notificationId));
    return { success: true };
  },
};
