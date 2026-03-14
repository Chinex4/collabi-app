import { useMutation } from '@tanstack/react-query';
import React from 'react';
import { Pressable, View } from 'react-native';

import { authService } from '@/api/services/authService';
import { AppButton, AppScreen, AppText } from '@/components/common';
import { FormPasswordInput, FormTextInput, useAppForm } from '@/components/forms';
import { useSession } from '@/hooks/useSession';
import { useAppDispatch } from '@/hooks/useAppStore';
import { showToast } from '@/store/uiSlice';
import { loginSchema } from '@/utils/validation';

export const AdminLoginScreen = ({ navigation }: any) => {
  const dispatch = useAppDispatch();
  const { completeAuth } = useSession();
  const form = useAppForm({
    defaultValues: { email: 'admin@collabi.edu', password: 'Admin123!' },
    schema: loginSchema,
  });

  const mutation = useMutation({
    mutationFn: (values: { email: string; password: string }) =>
      authService.adminLogin(values.email, values.password),
    onSuccess: async (result) => {
      await completeAuth(result);
      dispatch(showToast({ type: 'success', message: 'Admin session active' }));
    },
    onError: (error: Error) => dispatch(showToast({ type: 'error', message: error.message })),
  });

  return (
    <AppScreen withGradient>
      <AppText className="text-3xl font-bold text-slate-950">Admin Login</AppText>
      <AppText className="mt-2 text-sm text-slate-500">
        Moderate reports, manage users, monitor platform activity, and push announcements.
      </AppText>
      <View className="mt-8 rounded-[32px] bg-white p-5">
        <FormTextInput
          control={form.control}
          name="email"
          label="Admin Email"
          placeholder="admin@collabi.edu"
          keyboardType="email-address"
        />
        <FormPasswordInput
          control={form.control}
          name="password"
          label="Password"
          placeholder="Enter password"
        />
        <AppButton
          label="Login as Admin"
          onPress={form.handleSubmit((values) => mutation.mutate(values))}
          loading={mutation.isPending}
        />
        <Pressable onPress={() => navigation.navigate('Welcome')} className="mt-4">
          <AppText className="text-center text-sm font-medium text-violet-700">
            Back to welcome
          </AppText>
        </Pressable>
      </View>
    </AppScreen>
  );
};
