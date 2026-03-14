import { useMutation, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { View } from 'react-native';

import { adminService } from '@/api/services/adminService';
import { AnnouncementCard } from '@/components/admin';
import { AppButton, AppHeader, AppScreen, LoadingState, SectionHeader } from '@/components/common';
import { FormSelect, FormTextArea, FormTextInput, useAppForm } from '@/components/forms';
import { QUERY_KEYS } from '@/constants';
import { useAdminAnnouncements } from '@/hooks/useQueries';
import { useSession } from '@/hooks/useSession';
import { useAppDispatch } from '@/hooks/useAppStore';
import { showToast } from '@/store/uiSlice';
import { announcementSchema } from '@/utils/validation';

export const AnnouncementsScreen = () => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { currentUser } = useSession();
  const announcements = useAdminAnnouncements();

  const form = useAppForm({
    defaultValues: {
      title: '',
      body: '',
      audience: 'students',
    },
    schema: announcementSchema,
  });

  const mutation = useMutation({
    mutationFn: (values: {
      title: string;
      body: string;
      audience: 'all' | 'students' | 'admins';
    }) => adminService.sendAnnouncement(currentUser!.id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.announcements });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications });
      dispatch(showToast({ type: 'success', message: 'Announcement sent' }));
      form.reset({ title: '', body: '', audience: 'students' });
    },
  });

  return (
    <AppScreen>
      <AppHeader
        title="Announcements"
        subtitle="Compose platform-wide or audience-specific updates from the admin area."
      />
      <View className="rounded-[32px] bg-white p-5">
        <FormTextInput
          control={form.control}
          name="title"
          label="Title"
          placeholder="Faculty Innovation Showcase"
        />
        <FormTextArea
          control={form.control}
          name="body"
          label="Body"
          placeholder="Write the announcement details."
        />
        <FormSelect
          control={form.control}
          name="audience"
          label="Audience"
          options={[
            { label: 'Students', value: 'students' },
            { label: 'Admins', value: 'admins' },
            { label: 'Everyone', value: 'all' },
          ]}
        />
        <AppButton
          label="Send Announcement"
          onPress={form.handleSubmit((values) => mutation.mutate(values as any))}
          loading={mutation.isPending}
        />
      </View>
      <SectionHeader title="Sent announcements" />
      {announcements.isLoading ? <LoadingState label="Loading announcements..." /> : null}
      {announcements.data?.map((announcement) => (
        <AnnouncementCard key={announcement.id} announcement={announcement} />
      ))}
    </AppScreen>
  );
};
