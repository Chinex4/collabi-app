import { useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { View } from 'react-native';

import { collaborationService } from '@/api/services/collaborationService';
import { AppButton, AppHeader, AppScreen, SearchBar } from '@/components/common';
import { FormSelect, FormTextArea, useAppForm } from '@/components/forms';
import { QUERY_KEYS } from '@/constants';
import { db } from '@/data/mockDb';
import { useSession } from '@/hooks/useSession';
import { useAppDispatch } from '@/hooks/useAppStore';
import { showToast } from '@/store/uiSlice';
import { inviteSchema } from '@/utils/validation';

import { ProjectContextCard } from './shared';

export const InviteStudentScreen = ({ navigation, route }: any) => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { currentUser } = useSession();
  const [search, setSearch] = useState('');
  const projectId =
    route.params?.projectId ??
    db.projects.find((project) => project.ownerId === currentUser?.id)?.id;
  const presetStudentId = route.params?.studentId as string | undefined;

  const project = db.projects.find((item) => item.id === projectId);
  const existingMemberIds = db.memberships
    .filter((membership) => membership.projectId === projectId && membership.status === 'active')
    .map((membership) => membership.studentId);
  const candidates = db.users.filter(
    (user) =>
      user.role === 'student' &&
      user.id !== currentUser?.id &&
      !existingMemberIds.includes(user.id) &&
      (!search || user.fullName.toLowerCase().includes(search.toLowerCase()))
  );

  const form = useAppForm({
    defaultValues: {
      studentId: presetStudentId ?? '',
      message: `We would like you to join ${project?.title} and strengthen the final delivery.`,
    },
    schema: inviteSchema,
  });

  const mutation = useMutation({
    mutationFn: (values: { studentId: string; message: string }) =>
      collaborationService.inviteStudent(
        projectId,
        currentUser!.id,
        values.studentId,
        values.message
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.invitations });
      dispatch(showToast({ type: 'success', message: 'Invitation sent' }));
      navigation.goBack();
    },
  });

  return (
    <AppScreen>
      <AppHeader
        title="Invite Student"
        subtitle="Reach out to strong profile matches directly from your project workspace."
      />
      <ProjectContextCard projectId={projectId} />
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search students" />
      <View className="mt-4 rounded-[32px] bg-white p-5">
        <FormSelect
          control={form.control}
          name="studentId"
          label="Student"
          options={candidates.map((candidate) => ({
            label: candidate.fullName,
            value: candidate.id,
          }))}
        />
        <FormTextArea
          control={form.control}
          name="message"
          label="Invitation Message"
          placeholder="Explain why they are a strong fit."
        />
        <AppButton
          label="Send Invitation"
          onPress={form.handleSubmit((values) => mutation.mutate(values))}
          loading={mutation.isPending}
        />
      </View>
    </AppScreen>
  );
};
