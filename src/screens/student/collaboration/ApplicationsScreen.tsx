import { useMutation, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { View } from 'react-native';

import { collaborationService } from '@/api/services/collaborationService';
import {
  AppButton,
  AppHeader,
  AppScreen,
  AppText,
  Badge,
  EmptyState,
  LoadingState,
} from '@/components/common';
import { QUERY_KEYS } from '@/constants';
import { db } from '@/data/mockDb';
import { useMyApplications, useProjectApplications } from '@/hooks/useQueries';
import { useSession } from '@/hooks/useSession';
import { useAppDispatch } from '@/hooks/useAppStore';
import { showToast } from '@/store/uiSlice';

import { ProjectContextCard } from './shared';

export const ApplicationsScreen = ({ route }: any) => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { currentUser } = useSession();
  const projectId = route.params?.projectId as string | undefined;
  const myApplications = useMyApplications(currentUser?.id);
  const ownerApplications = useProjectApplications(projectId);

  const statusMutation = useMutation({
    mutationFn: ({
      applicationId,
      status,
    }: {
      applicationId: string;
      status: 'accepted' | 'rejected';
    }) => collaborationService.updateApplicationStatus(applicationId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.applications });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.memberships });
      dispatch(showToast({ type: 'success', message: 'Application updated' }));
    },
  });

  const items = projectId ? ownerApplications.data : myApplications.data;
  const isLoading = projectId ? ownerApplications.isLoading : myApplications.isLoading;

  return (
    <AppScreen>
      <AppHeader
        title={projectId ? 'Project Applications' : 'My Applications'}
        subtitle={
          projectId
            ? 'Review incoming students and move strong fits into the team.'
            : 'Track every project you applied to and the current decision state.'
        }
      />
      {projectId ? <ProjectContextCard projectId={projectId} /> : null}
      {isLoading ? <LoadingState label="Loading applications..." /> : null}
      {items?.length ? (
        items.map((application) => {
          const project = db.projects.find((item) => item.id === application.projectId);
          const student = db.users.find((item) => item.id === application.studentId);
          return (
            <View key={application.id} className="mb-3 rounded-3xl bg-white p-4">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-4">
                  <AppText className="text-base font-semibold text-slate-900">
                    {projectId ? student?.fullName : project?.title}
                  </AppText>
                  <AppText className="mt-1 text-sm text-slate-500">{application.message}</AppText>
                </View>
                <Badge
                  label={application.status}
                  tone={
                    application.status === 'accepted'
                      ? 'success'
                      : application.status === 'rejected'
                        ? 'danger'
                        : 'warning'
                  }
                />
              </View>
              {projectId && application.status === 'pending' ? (
                <View className="mt-4 flex-row flex-wrap gap-3">
                  <AppButton
                    label="Accept"
                    onPress={() =>
                      statusMutation.mutate({ applicationId: application.id, status: 'accepted' })
                    }
                  />
                  <AppButton
                    label="Reject"
                    onPress={() =>
                      statusMutation.mutate({ applicationId: application.id, status: 'rejected' })
                    }
                    variant="danger"
                  />
                </View>
              ) : null}
            </View>
          );
        })
      ) : (
        <EmptyState
          title="No applications yet"
          message="Applications will show here once students apply or you submit one."
        />
      )}
    </AppScreen>
  );
};
