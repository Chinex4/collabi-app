import { useMutation } from '@tanstack/react-query';
import React from 'react';
import { View } from 'react-native';

import { authService } from '@/api/services/authService';
import { AppButton, AppScreen, AppText } from '@/components/common';
import { FormOtpInput, useAppForm } from '@/components/forms';
import { useAppDispatch } from '@/hooks/useAppStore';
import { showToast } from '@/store/uiSlice';
import { otpSchema } from '@/utils/validation';

export const VerifyEmailOtpScreen = ({ navigation, route }: any) => {
  const dispatch = useAppDispatch();
  const email = route?.params?.email ?? '';
  const form = useAppForm({
    defaultValues: { otp: '' },
    schema: otpSchema,
  });

  const mutation = useMutation({
    mutationFn: (values: { otp: string }) => authService.verifyEmailOtp(email, values.otp),
    onSuccess: () => {
      dispatch(showToast({ type: 'success', message: 'Email verified. Please sign in.' }));
      navigation.replace('StudentLogin', { email });
    },
    onError: (error: Error) => dispatch(showToast({ type: 'error', message: error.message })),
  });

  const resendMutation = useMutation({
    mutationFn: () => authService.resendVerificationOtp(email),
    onSuccess: (result) => dispatch(showToast({ type: 'info', message: result.message })),
  });

  return (
    <AppScreen withGradient>
      <AppText className="text-3xl font-bold text-slate-950">Verify Email</AppText>
      <AppText className="mt-2 text-sm text-slate-500">
        We sent a code to {email || 'your email'}.
      </AppText>
      <View className="mt-8 rounded-[32px] bg-white p-5">
        <FormOtpInput control={form.control} name="otp" label="Verification code" />
        <AppButton
          label="Verify & Continue"
          onPress={form.handleSubmit((values) => mutation.mutate(values))}
          loading={mutation.isPending}
        />
        <AppButton
          label="Resend OTP"
          onPress={() => resendMutation.mutate()}
          variant="secondary"
          className="mt-3"
          loading={resendMutation.isPending}
        />
      </View>
    </AppScreen>
  );
};
