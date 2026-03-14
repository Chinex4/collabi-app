import React from 'react';
import { Modal, Pressable, View } from 'react-native';

import { Announcement, Setting } from '@/types';
import { formatDate } from '@/utils/helpers';

import { AppButton, AppText, Badge } from '../common';

export const MetricCard = ({ label, value }: { label: string; value: number | string }) => (
  <View className="mb-3 w-[48%] rounded-3xl bg-white p-4">
    <AppText className="text-sm text-slate-500">{label}</AppText>
    <AppText className="mt-2 text-2xl font-bold text-slate-950">{value}</AppText>
  </View>
);

export const ModerationActionSheet = ({
  visible,
  title,
  actions,
  onClose,
}: {
  visible: boolean;
  title: string;
  actions: { label: string; onPress: () => void; tone?: 'primary' | 'danger' }[];
  onClose: () => void;
}) => (
  <Modal visible={visible} transparent animationType="slide">
    <View className="flex-1 justify-end bg-black/30">
      <View className="rounded-t-[28px] bg-white p-5">
        <AppText className="text-lg font-semibold text-slate-900">{title}</AppText>
        <View className="mt-4">
          {actions.map((action) => (
            <AppButton
              key={action.label}
              label={action.label}
              onPress={action.onPress}
              variant={action.tone === 'danger' ? 'danger' : 'secondary'}
              className="mb-3"
            />
          ))}
        </View>
        <AppButton label="Close" onPress={onClose} variant="ghost" />
      </View>
    </View>
  </Modal>
);

export const SettingRow = ({ setting, onPress }: { setting: Setting; onPress?: () => void }) => (
  <Pressable onPress={onPress} className="mb-3 rounded-3xl bg-white p-4">
    <View className="flex-row items-start justify-between">
      <View className="flex-1 pr-4">
        <AppText className="text-base font-semibold text-slate-900">{setting.label}</AppText>
        <AppText className="mt-1 text-sm text-slate-500">{setting.description}</AppText>
      </View>
      <Badge label={setting.category} tone="muted" />
    </View>
    <AppText className="mt-3 text-sm text-violet-700">{setting.value}</AppText>
  </Pressable>
);

export const AnnouncementCard = ({ announcement }: { announcement: Announcement }) => (
  <View className="mb-3 rounded-3xl bg-white p-4">
    <View className="flex-row items-center justify-between">
      <AppText className="text-base font-semibold text-slate-900">{announcement.title}</AppText>
      <Badge label={announcement.audience} tone="primary" />
    </View>
    <AppText className="mt-2 text-sm text-slate-500">{announcement.body}</AppText>
    <AppText className="mt-3 text-xs text-slate-400">
      {formatDate(announcement.createdAt, 'DD MMM, HH:mm')}
    </AppText>
  </View>
);
