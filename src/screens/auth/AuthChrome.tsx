import React from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/common';

export const AuthBackButton = ({ navigation }: { navigation: any }) => (
  <Pressable
    onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Welcome'))}
    className="mb-6 self-start">
    <AppText className="text-sm font-semibold text-violet-700">Back</AppText>
  </Pressable>
);

export const AuthSwitchLink = ({
  label,
  actionLabel,
  onPress,
}: {
  label: string;
  actionLabel: string;
  onPress: () => void;
}) => (
  <View className="mt-5 flex-row justify-center">
    <AppText className="text-sm text-slate-500">{label} </AppText>
    <Pressable onPress={onPress}>
      <AppText className="text-sm font-semibold text-violet-700">{actionLabel}</AppText>
    </Pressable>
  </View>
);
