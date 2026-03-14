import { useMutation, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { View } from 'react-native';

import { collaborationService } from '@/api/services/collaborationService';
import { projectService } from '@/api/services/projectService';
import {
  AppButton,
  AppScreen,
  AppText,
  Badge,
  Chip,
  LoadingState,
  SectionHeader,
} from '@/components/common';
import { MemberAvatarStack, ProjectDetailHeader } from '@/components/project';
import { QUERY_KEYS } from '@/constants';
import { db } from '@/data/mockDb';
import { useMyApplications, useProjectDetail, useTeamMembers } from '@/hooks/useQueries';
import { useSession } from '@/hooks/useSession';
import { useAppDispatch } from '@/hooks/useAppStore';
import { showToast } from '@/store/uiSlice';

export const ProjectDetailScreen = ({ navigation, route }: any) => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { currentUser } = useSession();
  const projectId = route.params.projectId as string;
  const projectQuery = useProjectDetail(projectId);
  const applicationsQuery = useMyApplications(currentUser?.id);
  const teamMembersQuery = useTeamMembers(projectId);

  const applyMutation = useMutation({
    mutationFn: () =>
      collaborationService.applyToProject(
        projectId,
        currentUser!.id,
        'Interested in contributing to this project.'
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.applications });
      dispatch(showToast({ type: 'success', message: 'Application submitted' }));
    },
    onError: (error: Error) => dispatch(showToast({ type: 'error', message: error.message })),
  });

  const bookmarkMutation = useMutation({
    mutationFn: () => projectService.toggleBookmark(projectId, currentUser!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
      dispatch(showToast({ type: 'success', message: 'Saved projects updated' }));
    },
  });

  if (projectQuery.isLoading || !projectQuery.data) {
    return <LoadingState label="Loading project details..." />;
  }

  const project = projectQuery.data;
  const owner = db.users.find((user) => user.id === project.ownerId);
  const category = db.categories.find((item) => item.id === project.categoryId)?.name;
  const skillNames = project.requiredSkillIds
    .map((skillId) => db.skills.find((skill) => skill.id === skillId)?.name)
    .filter(Boolean);
  const isOwner = currentUser?.id === project.ownerId;
  const isMember = project.teamMemberIds.includes(currentUser?.id ?? '');
  const isBookmarked = project.bookmarkedBy.includes(currentUser?.id ?? '');
  const myApplication = applicationsQuery.data?.find(
    (application) => application.projectId === project.id
  );

  return (
    <AppScreen>
      <ProjectDetailHeader project={project} />
      <View className="mt-4 rounded-[32px] bg-white p-5">
        <SectionHeader title="Project summary" />
        <AppText className="text-sm leading-7 text-slate-600">{project.description}</AppText>
        <View className="mt-4 flex-row flex-wrap gap-2">
          <Badge label={category ?? 'Category'} tone="muted" />
          <Badge
            label={`${project.currentTeamSize}/${project.teamSizeLimit} members`}
            tone="info"
          />
        </View>
        <SectionHeader title="Required skills" />
        <View className="flex-row flex-wrap">
          {skillNames.map((skill) => (
            <Chip key={skill} label={skill ?? ''} />
          ))}
        </View>
        <SectionHeader title="Team" />
        <MemberAvatarStack memberIds={project.teamMemberIds} />
        <AppText className="mt-3 text-sm text-slate-500">Owner: {owner?.fullName}</AppText>
      </View>
      <View className="mt-4 flex-row flex-wrap gap-3">
        {isOwner ? (
          <>
            <AppButton
              label="Edit Project"
              onPress={() => navigation.navigate('EditProject', { projectId })}
            />
            <AppButton
              label="Manage Team"
              onPress={() => navigation.navigate('TeamMembers', { projectId })}
              variant="secondary"
            />
            <AppButton
              label="Review Applications"
              onPress={() => navigation.navigate('Applications', { projectId })}
              variant="secondary"
            />
          </>
        ) : (
          <>
            {!isMember ? (
              <AppButton
                label={
                  myApplication?.status === 'pending' ? 'Application Pending' : 'Apply to Project'
                }
                onPress={() => applyMutation.mutate()}
                disabled={myApplication?.status === 'pending'}
                loading={applyMutation.isPending}
              />
            ) : null}
            <AppButton
              label={isBookmarked ? 'Remove Bookmark' : 'Save Project'}
              onPress={() => bookmarkMutation.mutate()}
              variant="secondary"
            />
          </>
        )}
      </View>
      <View className="mt-4 flex-row flex-wrap gap-3">
        {isMember ? (
          <>
            <AppButton
              label="Project Tasks"
              onPress={() => navigation.navigate('ProjectTaskBoard', { projectId })}
              variant="secondary"
            />
            <AppButton
              label="Project Chat"
              onPress={() => navigation.navigate('ProjectChat', { projectId })}
              variant="secondary"
            />
          </>
        ) : null}
        <AppButton
          label="Report Project"
          onPress={() =>
            navigation.navigate('ReportTarget', { targetType: 'project', targetId: project.id })
          }
          variant="ghost"
        />
      </View>
      {teamMembersQuery.data?.length ? (
        <View className="mt-5 rounded-[32px] bg-white p-5">
          <SectionHeader title="Active members" />
          {teamMembersQuery.data.map((membership) => {
            const user = db.users.find((item) => item.id === membership.studentId);
            return (
              <View
                key={membership.id}
                className="mb-3 flex-row items-center justify-between rounded-2xl bg-violet-50 p-3">
                <View>
                  <AppText className="font-semibold text-slate-900">{user?.fullName}</AppText>
                  <AppText className="text-sm text-slate-500">{membership.roleName}</AppText>
                </View>
                <Badge label={membership.status} tone="success" />
              </View>
            );
          })}
        </View>
      ) : null}
    </AppScreen>
  );
};
