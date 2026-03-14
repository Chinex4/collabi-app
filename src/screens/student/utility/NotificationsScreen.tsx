import { useMutation, useQueryClient } from '@tanstack/react-query';
import React from 'react';

import { notificationService } from '@/api/services/notificationService';
import { AppButton, AppHeader, AppScreen, EmptyState, LoadingState } from '@/components/common';
import { NotificationItem } from '@/components/notification';
import { QUERY_KEYS } from '@/constants';
import { useNotifications } from '@/hooks/useQueries';
import { useSession } from '@/hooks/useSession';
import { useAppDispatch } from '@/hooks/useAppStore';
import { setUnreadCount } from '@/store/notificationsSlice';
import { showToast } from '@/store/uiSlice';

export const NotificationsScreen = () => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { currentUser } = useSession();
  const notificationsQuery = useNotifications(currentUser?.id);

  const markAllMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(currentUser!.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications });
      dispatch(setUnreadCount(0));
      dispatch(showToast({ type: 'success', message: 'All notifications marked as read' }));
    },
  });

  return (
    <AppScreen>
      <AppHeader
        title="Notifications"
        subtitle="Activity across applications, team updates, messages, tasks, and announcements."
        right={
          <AppButton
            label="Mark all read"
            onPress={() => markAllMutation.mutate()}
            variant="secondary"
          />
        }
      />
      {notificationsQuery.isLoading ? <LoadingState label="Loading notifications..." /> : null}
      {notificationsQuery.data?.length ? (
        notificationsQuery.data.map((notification) => (
          <NotificationItem
            key={notification.id}
            item={notification}
            onPress={async () => {
              await notificationService.markAsRead(notification.id);
              await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications });
            }}
          />
        ))
      ) : (
        <EmptyState
          title="No notifications yet"
          message="Platform activity, chat pings, and announcements will show here."
        />
      )}
    </AppScreen>
  );
};
