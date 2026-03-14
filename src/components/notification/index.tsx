import React from 'react';
import { Pressable, View } from 'react-native';

import { AppText, Badge } from '@/components/common';
import { Notification } from '@/types';
import { formatDate } from '@/utils/helpers';

export const NotificationItem = ({
  item,
  onPress,
}: {
  item: Notification;
  onPress?: () => void;
}) => (
  <Pressable onPress={onPress} className="mb-3 rounded-3xl bg-white p-4">
    <View className="flex-row items-start justify-between">
      <View className="flex-1 pr-3">
        <AppText className="text-base font-semibold text-slate-900">{item.title}</AppText>
        <AppText className="mt-1 text-sm text-slate-500">{item.body}</AppText>
      </View>
      {!item.isRead ? <Badge label="New" tone="danger" /> : null}
    </View>
    <AppText className="mt-3 text-xs text-slate-400">
      {formatDate(item.createdAt, 'DD MMM, HH:mm')}
    </AppText>
  </Pressable>
);
