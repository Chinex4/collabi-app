import { db } from '@/data/mockDb';

import { simulate } from './base';

export const notificationService = {
  async getNotifications(userId: string) {
    return simulate(() =>
      db.notifications
        .filter((notification) => notification.userId === userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    );
  },
  async markAsRead(notificationId: string) {
    return simulate(() => {
      const notification = db.notifications.find((item) => item.id === notificationId);
      if (!notification) {
        throw new Error('Notification not found');
      }
      notification.isRead = true;
      return notification;
    }, 250);
  },
  async markAllAsRead(userId: string) {
    return simulate(() => {
      db.notifications
        .filter((notification) => notification.userId === userId)
        .forEach((notification) => {
          notification.isRead = true;
        });
      return { success: true };
    }, 300);
  },
  async deleteNotification(notificationId: string) {
    return simulate(() => {
      const index = db.notifications.findIndex((item) => item.id === notificationId);
      if (index === -1) {
        throw new Error('Notification not found');
      }
      db.notifications.splice(index, 1);
      return { success: true };
    }, 250);
  },
};
