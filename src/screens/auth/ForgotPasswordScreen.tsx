import { useMutation } from '@tanstack/react-query';
import React from 'react';
import { View } from 'react-native';

import { authService } from '@/api/services/authService';
import { AppButton, AppScreen, AppText } from '@/components/common';
import { FormTextInput, useAppForm } from '@/components/forms';
import { useAppDispatch } from '@/hooks/useAppStore';
import { showToast } from '@/store/uiSlice';
import { forgotPasswordSchema } from '@/utils/validation';

export const ForgotPasswordScreen = ({ navigation }: any) => {
  const dispatch = useAppDispatch();
  const form = useAppForm({
    defaultValues: { email: '' },
    schema: forgotPasswordSchema,
  });

  const mutation = useMutation({
    mutationFn: (values: { email: string }) => authService.forgotPassword(values.email),
    onSuccess: (result) => {
      dispatch(showToast({ type: 'info', message: result.message }));
      navigation.navigate('ResetPassword', { email: result.email });
    },
    onError: (error: Error) => dispatch(showToast({ type: 'error', message: error.message })),
  });

  return (
    <AppScreen withGradient>
      <AppText className="text-3xl font-bold text-slate-950">Forgot Password</AppText>
      <AppText className="mt-2 text-sm text-slate-500">
        Enter the email linked to your account to receive an OTP reset code.
      </AppText>
      <View className="mt-8 rounded-[32px] bg-white p-5">
        <FormTextInput
          control={form.control}
          name="email"
          label="Email"
          placeholder="student@university.edu"
          keyboardType="email-address"
        />
        <AppButton
          label="Send Reset OTP"
          onPress={form.handleSubmit((values) => mutation.mutate(values))}
          loading={mutation.isPending}
        />
      </View>
    </AppScreen>
  );
};
