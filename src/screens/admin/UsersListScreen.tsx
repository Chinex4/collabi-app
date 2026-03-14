import React, { useState } from 'react';
import { View } from 'react-native';

import {
  AppButton,
  AppHeader,
  AppScreen,
  AppText,
  Badge,
  LoadingState,
  SearchBar,
} from '@/components/common';
import { useAdminUsers } from '@/hooks/useQueries';

export const UsersListScreen = ({ navigation }: any) => {
  const [search, setSearch] = useState('');
  const users = useAdminUsers(search);

  return (
    <AppScreen>
      <AppHeader
        title="Users"
        subtitle="Search student accounts, inspect details, and apply moderation actions."
      />
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search by name or email" />
      {users.isLoading ? <LoadingState label="Loading users..." /> : null}
      {users.data?.map((user) => (
        <View key={user.id} className="mt-4 rounded-3xl bg-white p-4">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <AppText className="text-base font-semibold text-slate-900">{user.fullName}</AppText>
              <AppText className="mt-1 text-sm text-slate-500">{user.email}</AppText>
            </View>
            <Badge
              label={user.status}
              tone={
                user.status === 'active'
                  ? 'success'
                  : user.status === 'suspended'
                    ? 'warning'
                    : 'danger'
              }
            />
          </View>
          <AppButton
            label="View Detail"
            onPress={() => navigation.navigate('UserDetail', { userId: user.id })}
            variant="secondary"
            className="mt-4"
          />
        </View>
      ))}
    </AppScreen>
  );
};
