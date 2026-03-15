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

export const StudentLoginScreen = ({ navigation, route }: any) => {
  const dispatch = useAppDispatch();
  const { completeAuth } = useSession();
  const form = useAppForm({
    defaultValues: { email: route?.params?.email ?? '', password: '' },
    schema: loginSchema,
  });

  const mutation = useMutation({
    mutationFn: (values: { email: string; password: string }) =>
      authService.studentLogin(values.email, values.password),
    onSuccess: async (result) => {
      await completeAuth(result);
      dispatch(showToast({ type: 'success', message: 'Welcome back' }));
    },
    onError: (error: Error) => dispatch(showToast({ type: 'error', message: error.message })),
  });

  return (
    <AppScreen withGradient>
      <AppText className="text-3xl font-bold text-slate-950">Student Login</AppText>
      <AppText className="mt-2 text-sm text-slate-500">
        Access your project workspace, tasks, chat, and teammate discovery.
      </AppText>
      <View className="mt-8 rounded-[32px] bg-white p-5">
        <FormTextInput
          control={form.control}
          name="email"
          label="Email"
          placeholder="student@university.edu"
          keyboardType="email-address"
        />
        <FormPasswordInput
          control={form.control}
          name="password"
          label="Password"
          placeholder="Enter password"
        />
        <AppButton
          label="Login"
          onPress={form.handleSubmit((values) => mutation.mutate(values))}
          loading={mutation.isPending}
        />
        <Pressable onPress={() => navigation.navigate('ForgotPassword')} className="mt-4">
          <AppText className="text-center text-sm font-medium text-violet-700">
            Forgot password?
          </AppText>
        </Pressable>
      </View>
    </AppScreen>
  );
};
