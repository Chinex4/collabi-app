import { useMutation } from '@tanstack/react-query';
import React from 'react';
import { View } from 'react-native';

import { authService } from '@/api/services/authService';
import { AppButton, AppScreen, AppText } from '@/components/common';
import { FormOtpInput, FormPasswordInput, FormTextInput, useAppForm } from '@/components/forms';
import { useAppDispatch } from '@/hooks/useAppStore';
import { showToast } from '@/store/uiSlice';
import { resetPasswordSchema } from '@/utils/validation';
import { AuthBackButton } from './AuthChrome';

export const ResetPasswordScreen = ({ route, navigation }: any) => {
  const dispatch = useAppDispatch();
  const email = route?.params?.email ?? '';
  const form = useAppForm({
    defaultValues: {
      email,
      otp: '',
      password: '',
      confirmPassword: '',
    },
    schema: resetPasswordSchema,
  });

  const mutation = useMutation({
    mutationFn: (values: { email: string; otp: string; password: string }) =>
      authService.resetPassword(values.email, values.otp, values.password),
    onSuccess: (result) => {
      dispatch(showToast({ type: 'success', message: result.message }));
      navigation.navigate('StudentLogin');
    },
    onError: (error: Error) => dispatch(showToast({ type: 'error', message: error.message })),
  });

  return (
    <AppScreen withGradient>
      <AuthBackButton navigation={navigation} />
      <AppText className="text-3xl font-bold text-slate-950">Reset Password</AppText>
      <AppText className="mt-2 text-sm text-slate-500">
        Use the OTP sent to your email. The mock reset code is `123456`.
      </AppText>
      <View className="mt-8 rounded-[32px] bg-white p-5">
        <FormTextInput
          control={form.control}
          name="email"
          label="Email"
          placeholder="student@university.edu"
          keyboardType="email-address"
        />
        <FormOtpInput control={form.control} name="otp" label="Reset code" />
        <FormPasswordInput
          control={form.control}
          name="password"
          label="New Password"
          placeholder="Enter new password"
        />
        <FormPasswordInput
          control={form.control}
          name="confirmPassword"
          label="Confirm New Password"
          placeholder="Repeat password"
        />
        <AppButton
          label="Update Password"
          onPress={form.handleSubmit((values) =>
            mutation.mutate({ email: values.email, otp: values.otp, password: values.password })
          )}
          loading={mutation.isPending}
        />
      </View>
    </AppScreen>
  );
};
