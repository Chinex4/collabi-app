import { useMutation, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { View } from 'react-native';

import { collaborationService } from '@/api/services/collaborationService';
import { AppButton, AppHeader, AppScreen, AppText, Badge, EmptyState } from '@/components/common';
import { QUERY_KEYS } from '@/constants';
import { db } from '@/data/mockDb';
import { useReceivedInvitations, useSentInvitations } from '@/hooks/useQueries';
import { useSession } from '@/hooks/useSession';
import { useAppDispatch } from '@/hooks/useAppStore';
import { showToast } from '@/store/uiSlice';

export const InvitationsScreen = () => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { currentUser } = useSession();
  const received = useReceivedInvitations(currentUser?.id);
  const sent = useSentInvitations(currentUser?.id);

  const mutation = useMutation({
    mutationFn: ({
      invitationId,
      status,
    }: {
      invitationId: string;
      status: 'accepted' | 'declined' | 'cancelled';
    }) => collaborationService.updateInvitationStatus(invitationId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.invitations });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.memberships });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
      dispatch(showToast({ type: 'success', message: 'Invitation updated' }));
    },
  });

  return (
    <AppScreen>
      <AppHeader
        title="Invitations"
        subtitle="Review pending invites you received and the invites you already sent."
      />
      <View className="rounded-[32px] bg-white p-5">
        <AppText className="text-lg font-semibold text-slate-900">Received invitations</AppText>
        {received.data?.length ? (
          received.data.map((invitation) => {
            const project = db.projects.find((item) => item.id === invitation.projectId);
            return (
              <View key={invitation.id} className="mt-4 rounded-2xl bg-violet-50 p-4">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-4">
                    <AppText className="font-semibold text-slate-900">{project?.title}</AppText>
                    <AppText className="mt-1 text-sm text-slate-500">{invitation.message}</AppText>
                  </View>
                  <Badge
                    label={invitation.status}
                    tone={
                      invitation.status === 'accepted'
                        ? 'success'
                        : invitation.status === 'declined'
                          ? 'danger'
                          : 'warning'
                    }
                  />
                </View>
                {invitation.status === 'pending' ? (
                  <View className="mt-4 flex-row gap-3">
                    <AppButton
                      label="Accept"
                      onPress={() =>
                        mutation.mutate({ invitationId: invitation.id, status: 'accepted' })
                      }
                    />
                    <AppButton
                      label="Decline"
                      onPress={() =>
                        mutation.mutate({ invitationId: invitation.id, status: 'declined' })
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
            title="No invitations received"
            message="Project invites sent to you will land here."
          />
        )}
      </View>
      <View className="mt-4 rounded-[32px] bg-white p-5">
        <AppText className="text-lg font-semibold text-slate-900">Sent invitations</AppText>
        {sent.data?.length ? (
          sent.data.map((invitation) => {
            const project = db.projects.find((item) => item.id === invitation.projectId);
            const student = db.users.find((item) => item.id === invitation.studentId);
            return (
              <View key={invitation.id} className="mt-4 rounded-2xl bg-violet-50 p-4">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-4">
                    <AppText className="font-semibold text-slate-900">{student?.fullName}</AppText>
                    <AppText className="mt-1 text-sm text-slate-500">{project?.title}</AppText>
                  </View>
                  <Badge
                    label={invitation.status}
                    tone={
                      invitation.status === 'accepted'
                        ? 'success'
                        : invitation.status === 'declined'
                          ? 'danger'
                          : 'warning'
                    }
                  />
                </View>
                {invitation.status === 'pending' ? (
                  <AppButton
                    label="Cancel Invite"
                    onPress={() =>
                      mutation.mutate({ invitationId: invitation.id, status: 'cancelled' })
                    }
                    variant="secondary"
                    className="mt-4"
                  />
                ) : null}
              </View>
            );
          })
        ) : (
          <EmptyState
            title="No invites sent"
            message="Use the invite flow from team management or teammate discovery."
          />
        )}
      </View>
    </AppScreen>
  );
};
