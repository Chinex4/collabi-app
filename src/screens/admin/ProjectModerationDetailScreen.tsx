import { useMutation, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { View } from 'react-native';

import { adminService } from '@/api/services/adminService';
import {
  AppButton,
  AppHeader,
  AppScreen,
  AppText,
  EmptyState,
  SectionHeader,
} from '@/components/common';
import { PROJECT_STATUS_OPTIONS, QUERY_KEYS } from '@/constants';
import { db } from '@/data/mockDb';
import { useSession } from '@/hooks/useSession';
import { useAppDispatch } from '@/hooks/useAppStore';
import { showToast } from '@/store/uiSlice';

export const ProjectModerationDetailScreen = ({ route }: any) => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { currentUser } = useSession();
  const projectId = route.params.projectId as string;
  const project = db.projects.find((item) => item.id === projectId);

  const statusMutation = useMutation({
    mutationFn: (status: any) =>
      adminService.changeProjectStatus(projectId, status, currentUser!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminProjects });
      dispatch(showToast({ type: 'success', message: 'Project status updated' }));
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => adminService.removeProject(projectId, currentUser!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminProjects });
      dispatch(showToast({ type: 'success', message: 'Project removed' }));
    },
  });

  if (!project) {
    return (
      <AppScreen>
        <EmptyState
          title="Project not found"
          message="This project may already have been removed."
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <AppHeader title="Project Detail" subtitle={project.title} />
      <View className="rounded-[32px] bg-white p-5">
        <AppText className="text-sm leading-7 text-slate-600">{project.description}</AppText>
        <SectionHeader title="Moderation actions" />
        <View className="flex-row flex-wrap gap-3">
          {PROJECT_STATUS_OPTIONS.map((option) => (
            <AppButton
              key={option.value}
              label={option.label}
              onPress={() => statusMutation.mutate(option.value)}
              variant="secondary"
            />
          ))}
        </View>
        <AppButton
          label="Remove Project"
          onPress={() => removeMutation.mutate()}
          variant="danger"
          className="mt-4"
        />
      </View>
    </AppScreen>
  );
};
