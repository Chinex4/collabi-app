import { useMutation } from '@tanstack/react-query';
import React from 'react';
import { View } from 'react-native';

import { authService } from '@/api/services/authService';
import { AppButton, AppHeader, AppScreen } from '@/components/common';
import { FormPasswordInput, useAppForm } from '@/components/forms';
import { useSession } from '@/hooks/useSession';
import { useAppDispatch } from '@/hooks/useAppStore';
import { showToast } from '@/store/uiSlice';
import { changePasswordSchema } from '@/utils/validation';

export const ChangePasswordScreen = ({ navigation }: any) => {
  const dispatch = useAppDispatch();
  const { currentUser } = useSession();
  const form = useAppForm({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
    schema: changePasswordSchema,
  });

  const mutation = useMutation({
    mutationFn: (values: { currentPassword: string; newPassword: string }) =>
      authService.changePassword(currentUser!.id, values.currentPassword, values.newPassword),
    onSuccess: (result) => {
      dispatch(showToast({ type: 'success', message: result.message }));
      navigation.goBack();
    },
    onError: (error: Error) => dispatch(showToast({ type: 'error', message: error.message })),
  });

  return (
    <AppScreen>
      <AppHeader
        title="Change Password"
        subtitle="Update your password for the mock session and future logins."
      />
      <View className="rounded-[32px] bg-white p-5">
        <FormPasswordInput
          control={form.control}
          name="currentPassword"
          label="Current Password"
          placeholder="Enter current password"
        />
        <FormPasswordInput
          control={form.control}
          name="newPassword"
          label="New Password"
          placeholder="Choose new password"
        />
        <FormPasswordInput
          control={form.control}
          name="confirmNewPassword"
          label="Confirm New Password"
          placeholder="Repeat new password"
        />
        <AppButton
          label="Update Password"
          onPress={form.handleSubmit((values) =>
            mutation.mutate({
              currentPassword: values.currentPassword,
              newPassword: values.newPassword,
            })
          )}
          loading={mutation.isPending}
        />
      </View>
    </AppScreen>
  );
};
