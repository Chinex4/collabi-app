import { useMutation, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { View } from 'react-native';

import { collaborationService } from '@/api/services/collaborationService';
import { AppButton, AppHeader, AppScreen, AppText, Badge, LoadingState } from '@/components/common';
import { QUERY_KEYS } from '@/constants';
import { db } from '@/data/mockDb';
import { useProjectDetail, useTeamMembers } from '@/hooks/useQueries';
import { useSession } from '@/hooks/useSession';
import { useAppDispatch } from '@/hooks/useAppStore';
import { showToast } from '@/store/uiSlice';

export const TeamMembersScreen = ({ navigation, route }: any) => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { currentUser } = useSession();
  const projectId = route.params.projectId as string;
  const teamQuery = useTeamMembers(projectId);
  const project = useProjectDetail(projectId);
  const isOwner = project.data?.ownerId === currentUser?.id;

  const removeMutation = useMutation({
    mutationFn: (membershipId: string) => collaborationService.removeMember(membershipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.memberships });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
      dispatch(showToast({ type: 'success', message: 'Member removed' }));
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({ membershipId, roleName }: { membershipId: string; roleName: string }) =>
      collaborationService.updateMemberRole(membershipId, roleName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.memberships });
      dispatch(showToast({ type: 'success', message: 'Role updated' }));
    },
  });

  const leaveMutation = useMutation({
    mutationFn: () => collaborationService.leaveTeam(projectId, currentUser!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.memberships });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
      navigation.goBack();
    },
  });

  return (
    <AppScreen>
      <AppHeader
        title="Manage Team"
        subtitle="Review roles, remove inactive members, and keep project ownership clear."
        right={
          isOwner ? (
            <AppButton
              label="Invite"
              onPress={() => navigation.navigate('InviteStudent', { projectId })}
              variant="secondary"
            />
          ) : undefined
        }
      />
      {teamQuery.isLoading ? <LoadingState label="Loading team..." /> : null}
      {teamQuery.data?.map((membership) => {
        const user = db.users.find((item) => item.id === membership.studentId);
        return (
          <View key={membership.id} className="mb-3 rounded-3xl bg-white p-4">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-4">
                <AppText className="text-base font-semibold text-slate-900">
                  {user?.fullName}
                </AppText>
                <AppText className="mt-1 text-sm text-slate-500">{membership.roleName}</AppText>
              </View>
              <Badge label={membership.status} tone="success" />
            </View>
            {isOwner && membership.studentId !== currentUser?.id ? (
              <View className="mt-4 flex-row flex-wrap gap-3">
                <AppButton
                  label="Make Research Lead"
                  onPress={() =>
                    roleMutation.mutate({ membershipId: membership.id, roleName: 'Research Lead' })
                  }
                  variant="secondary"
                />
                <AppButton
                  label="Remove"
                  onPress={() => removeMutation.mutate(membership.id)}
                  variant="danger"
                />
              </View>
            ) : null}
          </View>
        );
      })}
      {!isOwner ? (
        <AppButton
          label="Leave Team"
          onPress={() => leaveMutation.mutate()}
          variant="danger"
          className="mt-4"
        />
      ) : null}
    </AppScreen>
  );
};
