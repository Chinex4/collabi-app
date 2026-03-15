import { useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { View } from 'react-native';

import { profileService } from '@/api/services/profileService';
import { uploadService } from '@/api/services/uploadService';
import { AppButton, AppHeader, AppScreen, LoadingState } from '@/components/common';
import {
  FormMultiSelect,
  FormSelect,
  FormTextArea,
  FormTextInput,
  useAppForm,
} from '@/components/forms';
import { AVAILABILITY_OPTIONS, PREFERRED_ROLES, QUERY_KEYS, VISIBILITY_OPTIONS } from '@/constants';
import { db } from '@/data/mockDb';
import { useLookups } from '@/hooks/useQueries';
import { useSession } from '@/hooks/useSession';
import { useAppDispatch } from '@/hooks/useAppStore';
import { showToast } from '@/store/uiSlice';
import { profileSchema } from '@/utils/validation';

export const EditProfileScreen = ({ navigation }: any) => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { currentUser } = useSession();
  const lookups = useLookups();
  const profile = db.profiles.find((item) => item.userId === currentUser?.id);
  const [photoUrl, setPhotoUrl] = useState(profile?.photoUrl);

  const form = useAppForm({
    defaultValues: {
      bio: profile?.bio ?? '',
      skills: profile?.skills ?? [],
      interests: profile?.interests ?? [],
      availability: profile?.availability ?? 'available',
      preferredRoles: profile?.preferredRoles ?? [],
      portfolioLinks: profile?.portfolioLinks.join(', ') ?? '',
      visibility: profile?.visibility ?? 'public',
    },
    schema: profileSchema,
  });

  const mutation = useMutation({
    mutationFn: (values: any) =>
      profileService.updateProfile(currentUser!.id, {
        ...values,
        availability: values.availability,
        visibility: values.visibility,
        portfolioLinks: values.portfolioLinks
          .split(',')
          .map((item: string) => item.trim())
          .filter(Boolean),
        photoUrl,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profiles });
      dispatch(showToast({ type: 'success', message: 'Profile updated' }));
      navigation.goBack();
    },
    onError: (error: Error) => dispatch(showToast({ type: 'error', message: error.message })),
  });

  const photoMutation = useMutation({
    mutationFn: () => uploadService.pickImage(currentUser!.id, 'profile'),
    onSuccess: (file) => {
      if (!file) {
        return;
      }
      setPhotoUrl(file.url);
      dispatch(showToast({ type: 'success', message: 'Profile photo updated' }));
    },
  });

  if (lookups.isLoading) {
    return <LoadingState label="Loading edit profile form..." />;
  }

  return (
    <AppScreen>
      <AppHeader title="Edit Profile" subtitle="Update what teammates can count on you for." />
      <View className="rounded-[32px] bg-white p-5">
        <AppButton
          label="Change Photo"
          onPress={() => photoMutation.mutate()}
          variant="secondary"
          className="mb-4"
        />
        <FormTextArea
          control={form.control}
          name="bio"
          label="Bio"
          placeholder="Tell people what you do well."
        />
        <FormMultiSelect
          control={form.control}
          name="skills"
          label="Skills"
          options={lookups.data?.skills.map((item) => ({ label: item.name, value: item.id })) ?? []}
        />
        <FormMultiSelect
          control={form.control}
          name="interests"
          label="Interests"
          options={
            lookups.data?.interests.map((item) => ({ label: item.name, value: item.id })) ?? []
          }
        />
        <FormSelect
          control={form.control}
          name="availability"
          label="Availability"
          options={AVAILABILITY_OPTIONS.map((item) => ({ label: item.label, value: item.value }))}
        />
        <FormMultiSelect
          control={form.control}
          name="preferredRoles"
          label="Preferred Roles"
          options={PREFERRED_ROLES.map((role) => ({ label: role, value: role }))}
        />
        <FormTextInput
          control={form.control}
          name="portfolioLinks"
          label="Portfolio Links"
          placeholder="Comma separated URLs"
        />
        <FormSelect
          control={form.control}
          name="visibility"
          label="Visibility"
          options={VISIBILITY_OPTIONS}
        />
        <AppButton
          label="Save Profile"
          onPress={form.handleSubmit((values) => mutation.mutate(values))}
          loading={mutation.isPending}
        />
      </View>
    </AppScreen>
  );
};
