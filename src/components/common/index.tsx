import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { PRIMARY_COLOR } from '@/constants';
import { cn, initials } from '@/utils/helpers';
import { StatusBar } from 'expo-status-bar';

type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'muted';

const toneStyles: Record<Tone, string> = {
  primary: 'bg-violet-100 text-violet-800 border-violet-200',
  success: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  warning: 'bg-amber-100 text-amber-800 border-amber-200',
  danger: 'bg-rose-100 text-rose-800 border-rose-200',
  info: 'bg-blue-100 text-blue-800 border-blue-200',
  muted: 'bg-slate-100 text-slate-700 border-slate-200',
};

export const AppText = ({
  children,
  className,
  numberOfLines,
}: {
  children: ReactNode;
  className?: string;
  numberOfLines?: number;
}) => (
  <Text numberOfLines={numberOfLines} className={cn(' text-slate-900', className)}>
    {children}
  </Text>
);

export const AppButton = ({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  className,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}) => {
  const styles =
    variant === 'primary'
      ? 'bg-[#7921BF]'
      : variant === 'secondary'
        ? 'bg-violet-100 border border-violet-200'
        : variant === 'danger'
          ? 'bg-rose-600'
          : 'bg-transparent';

  const textColor =
    variant === 'primary' || variant === 'danger'
      ? 'text-white'
      : variant === 'ghost'
        ? 'text-violet-700'
        : 'text-violet-900';

  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      className={cn(
        'flex-row items-center justify-center rounded-2xl px-4 py-3',
        styles,
        disabled ? 'opacity-60' : '',
        className
      )}>
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'danger' ? '#fff' : PRIMARY_COLOR}
        />
      ) : (
        <>
          {icon ? (
            <Ionicons
              name={icon}
              size={18}
              color={variant === 'primary' || variant === 'danger' ? '#fff' : PRIMARY_COLOR}
            />
          ) : null}
          <AppText className={cn('ml-2 text-center font-semibold', textColor)}>{label}</AppText>
        </>
      )}
    </Pressable>
  );
};

export const AppInput = ({
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  multiline,
  keyboardType,
}: {
  value?: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  multiline?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric';
}) => (
  <TextInput
    value={value}
    onChangeText={onChangeText}
    placeholder={placeholder}
    secureTextEntry={secureTextEntry}
    multiline={multiline}
    keyboardType={keyboardType}
    placeholderTextColor="#8E7BAA"
    className={cn(
      'rounded-2xl border border-violet-200 bg-white px-4 py-3 text-slate-900',
      multiline ? 'min-h-[110px]' : ''
    )}
  />
);

export const AppHeader = ({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) => (
  <View className="mb-5 flex-row items-center justify-between">
    <View className="flex-1 pr-3">
      <AppText className="text-2xl font-bold text-slate-950">{title}</AppText>
      {subtitle ? <AppText className="mt-1 text-sm text-slate-500">{subtitle}</AppText> : null}
    </View>
    {right}
  </View>
);

export const AppScreen = ({
  children,
  scroll = true,
  withGradient = false,
  backgroundClassName = 'bg-[#F6F4FB]',
}: {
  children: ReactNode;
  scroll?: boolean;
  withGradient?: boolean;
  backgroundClassName?: string;
}) => {
  const content = scroll ? (
    <>
      <StatusBar style="dark" />
      <ScrollView
        className="flex-1 pt-12"
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}>
          
        {children}
      </ScrollView>
    </>
  ) : (
    <View className="flex-1 px-5 py-5 pt-20">{children}</View>
  );

  if (withGradient) {
    return (
      <LinearGradient colors={['#F7F2FC', '#FFFFFF']} className="flex-1">
        <SafeAreaView className="flex-1">{content}</SafeAreaView>
      </LinearGradient>
    );
  }

  return <SafeAreaView className={cn('flex-1', backgroundClassName)}>{content}</SafeAreaView>;
};

export const SectionHeader = ({ title, action }: { title: string; action?: ReactNode }) => (
  <View className="mb-3 mt-2 flex-row items-center justify-between">
    <AppText className="text-lg font-semibold text-slate-900">{title}</AppText>
    {action}
  </View>
);

export const EmptyState = ({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: ReactNode;
}) => (
  <View className="items-center rounded-3xl border border-dashed border-violet-200 bg-white px-6 py-10">
    <Ionicons name="sparkles-outline" size={28} color={PRIMARY_COLOR} />
    <AppText className="mt-3 text-lg font-semibold text-slate-900">{title}</AppText>
    <AppText className="mt-2 text-center text-sm leading-6 text-slate-500">{message}</AppText>
    {action ? <View className="mt-5">{action}</View> : null}
  </View>
);

export const ErrorState = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <View className="rounded-3xl bg-rose-50 p-5">
    <AppText className="text-base font-semibold text-rose-900">Something went wrong</AppText>
    <AppText className="mt-1 text-sm text-rose-700">{message}</AppText>
    {onRetry ? (
      <AppButton label="Retry" onPress={onRetry} variant="danger" className="mt-4" />
    ) : null}
  </View>
);

export const LoadingState = ({
  label = 'Loading...',
  fullscreen = false,
}: {
  label?: string;
  fullscreen?: boolean;
}) => (
  <View className={cn('items-center justify-center py-14', fullscreen ? 'flex-1 px-5' : '')}>
    <ActivityIndicator color={PRIMARY_COLOR} />
    <AppText className="mt-3 text-sm text-slate-500">{label}</AppText>
  </View>
);

export const Avatar = ({ name, uri, size = 44 }: { name: string; uri?: string; size?: number }) =>
  uri ? (
    <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
  ) : (
    <View
      style={{ width: size, height: size, borderRadius: size / 2 }}
      className="items-center justify-center bg-violet-200">
      <AppText className="font-semibold text-violet-800">{initials(name)}</AppText>
    </View>
  );

export const AvatarStack = ({
  items,
}: {
  items: { id: string; name: string; avatar?: string }[];
}) => (
  <View className="flex-row">
    {items.slice(0, 4).map((item, index) => (
      <View
        key={item.id}
        style={{ marginLeft: index === 0 ? 0 : -10 }}
        className="rounded-full border-2 border-white">
        <Avatar name={item.name} uri={item.avatar} size={32} />
      </View>
    ))}
  </View>
);

export const Badge = ({ label, tone = 'primary' }: { label: string; tone?: Tone }) => (
  <View className={cn('self-start rounded-full border px-3 py-1', toneStyles[tone])}>
    <AppText className={cn('text-xs font-semibold capitalize', toneStyles[tone].split(' ')[1])}>
      {label}
    </AppText>
  </View>
);

export const Chip = ({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) => (
  <Pressable
    onPress={onPress}
    className={cn(
      'mr-2 mt-2 rounded-full border px-3 py-2',
      selected ? 'border-violet-600 bg-violet-100' : 'border-violet-200 bg-white'
    )}>
    <AppText className={cn('text-xs font-medium', selected ? 'text-violet-700' : 'text-slate-600')}>
      {label}
    </AppText>
  </Pressable>
);

export const SearchBar = ({
  value,
  onChangeText,
  placeholder = 'Search',
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}) => (
  <View className="flex-row items-center rounded-2xl border border-violet-200 bg-white px-4 py-3">
    <Ionicons name="search" size={18} color="#8E7BAA" />
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#8E7BAA"
      className="ml-3 flex-1 text-slate-900"
    />
  </View>
);

export const FilterPill = ({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    className={cn(
      'mr-2 rounded-full px-4 py-2',
      active ? 'bg-[#7921BF]' : 'border border-violet-200 bg-white'
    )}>
    <AppText className={cn('text-xs font-semibold', active ? 'text-white' : 'text-slate-700')}>
      {label}
    </AppText>
  </Pressable>
);

export const ConfirmModal = ({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  onClose,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: () => void;
}) => (
  <Modal visible={visible} transparent animationType="fade">
    <View className="flex-1 items-center justify-center bg-black/40 px-5">
      <View className="w-full rounded-3xl bg-white p-6">
        <AppText className="text-xl font-bold text-slate-950">{title}</AppText>
        <AppText className="mt-2 text-sm leading-6 text-slate-500">{message}</AppText>
        <View className="mt-6 flex-row gap-3">
          <AppButton label="Cancel" onPress={onClose} variant="secondary" className="flex-1" />
          <AppButton label={confirmLabel} onPress={onConfirm} className="flex-1" />
        </View>
      </View>
    </View>
  </Modal>
);
