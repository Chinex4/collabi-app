import { useMutation, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { View } from 'react-native';

import { adminService } from '@/api/services/adminService';
import {
  AppButton,
  AppHeader,
  AppScreen,
  AppText,
  Badge,
  EmptyState,
  SectionHeader,
} from '@/components/common';
import { QUERY_KEYS } from '@/constants';
import { db } from '@/data/mockDb';
import { useSession } from '@/hooks/useSession';
import { useAppDispatch } from '@/hooks/useAppStore';
import { showToast } from '@/store/uiSlice';

export const UserDetailScreen = ({ route }: any) => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { currentUser } = useSession();
  const userId = route.params.userId as string;
  const detail = db.users.find((item) => item.id === userId);
  const profile = db.profiles.find((item) => item.userId === userId);
  const projects = db.projects.filter(
    (project) => project.ownerId === userId || project.teamMemberIds.includes(userId)
  );

  const suspendMutation = useMutation({
    mutationFn: (suspended: boolean) =>
      adminService.setUserSuspension(userId, suspended, currentUser!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminUsers });
      dispatch(showToast({ type: 'success', message: 'User status updated' }));
    },
  });

  const verifyMutation = useMutation({
    mutationFn: () => adminService.verifyUser(userId, currentUser!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminUsers });
      dispatch(showToast({ type: 'success', message: 'User verified' }));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => adminService.deleteUser(userId, currentUser!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminUsers });
      dispatch(showToast({ type: 'success', message: 'User deleted' }));
    },
  });

  if (!detail) {
    return (
      <AppScreen>
        <EmptyState title="User not found" message="This account may have been removed." />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <AppHeader title="User Detail" subtitle={detail.fullName} />
      <View className="rounded-[32px] bg-white p-5">
        <AppText className="text-sm text-slate-500">{detail.email}</AppText>
        <AppText className="mt-1 text-sm text-slate-500">{profile?.bio}</AppText>
        <View className="mt-3 flex-row flex-wrap gap-2">
          {profile?.skills.map((skillId) => (
            <Badge
              key={skillId}
              label={db.skills.find((skill) => skill.id === skillId)?.name ?? skillId}
              tone="muted"
            />
          ))}
        </View>
      </View>
      <View className="mt-4 flex-row flex-wrap gap-3">
        <AppButton
          label={detail.status === 'suspended' ? 'Unsuspend' : 'Suspend'}
          onPress={() => suspendMutation.mutate(detail.status !== 'suspended')}
          variant="danger"
        />
        <AppButton
          label="Verify User"
          onPress={() => verifyMutation.mutate()}
          variant="secondary"
        />
        <AppButton label="Delete User" onPress={() => deleteMutation.mutate()} variant="danger" />
      </View>
      <SectionHeader title="Linked projects" />
      {projects.map((project) => (
        <View key={project.id} className="mb-3 rounded-3xl bg-white p-4">
          <AppText className="font-semibold text-slate-900">{project.title}</AppText>
          <AppText className="mt-1 text-sm text-slate-500">{project.status}</AppText>
        </View>
      ))}
    </AppScreen>
  );
};
