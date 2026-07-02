import { useMutation } from '@tanstack/react-query';
import React from 'react';
import { View } from 'react-native';

import { authService } from '@/api/services/authService';
import { AppButton, AppScreen, AppText, LoadingState } from '@/components/common';
import { FormPasswordInput, FormSelect, FormTextInput, useAppForm } from '@/components/forms';
import { LEVEL_OPTIONS } from '@/constants';
import { useLookups } from '@/hooks/useQueries';
import { useAppDispatch } from '@/hooks/useAppStore';
import { showToast } from '@/store/uiSlice';
import { registerSchema } from '@/utils/validation';
import { AuthBackButton, AuthSwitchLink } from './AuthChrome';

export const RegisterScreen = ({ navigation }: any) => {
  const dispatch = useAppDispatch();
  const lookups = useLookups();
  const form = useAppForm({
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      facultyId: '',
      departmentId: '',
      level: '',
    },
    schema: registerSchema,
  });

  const mutation = useMutation({
    mutationFn: authService.registerStudent,
    onSuccess: (result) => {
      dispatch(showToast({ type: 'success', message: result.message }));
      navigation.replace('StudentLogin', { email: result.email });
    },
    onError: (error: Error) => dispatch(showToast({ type: 'error', message: error.message })),
  });

  if (lookups.isLoading) {
    return <LoadingState label="Loading registration options..." />;
  }

  const faculties =
    lookups.data?.faculties.map((item) => ({ label: item.name, value: item.id })) ?? [];
  const selectedFaculty = form.watch('facultyId');
  const departmentOptions =
    lookups.data?.departments
      .filter((department) => !selectedFaculty || department.facultyId === selectedFaculty)
      .map((item) => ({ label: item.name, value: item.id })) ?? [];

  return (
    <AppScreen withGradient>
      <AuthBackButton navigation={navigation} />
      <AppText className="text-3xl font-bold text-slate-950">Create Student Account</AppText>
      <AppText className="mt-2 text-sm text-slate-500">
        Set up your profile and start matching with serious final year collaborators.
      </AppText>
      <View className="mt-8 rounded-[32px] bg-white p-5">
        {mutation.error ? (
          <View className="mb-4 rounded-2xl bg-rose-50 px-4 py-3">
            <AppText className="text-sm font-semibold text-rose-800">
              {mutation.error.message}
            </AppText>
          </View>
        ) : null}
        <FormTextInput
          control={form.control}
          name="fullName"
          label="Full Name"
          placeholder="Adaeze Okafor"
        />
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
          placeholder="Create password"
        />
        <FormPasswordInput
          control={form.control}
          name="confirmPassword"
          label="Confirm Password"
          placeholder="Repeat password"
        />
        <FormSelect control={form.control} name="facultyId" label="Faculty" options={faculties} />
        <FormSelect
          control={form.control}
          name="departmentId"
          label="Department"
          options={departmentOptions}
        />
        <FormSelect
          control={form.control}
          name="level"
          label="Level"
          options={LEVEL_OPTIONS.map((level) => ({ label: level, value: level }))}
        />
        <AppButton
          label="Create Account"
          onPress={form.handleSubmit((values) => mutation.mutate(values))}
          loading={mutation.isPending}
        />
        <AuthSwitchLink
          label="Already have an account?"
          actionLabel="Login"
          onPress={() => navigation.navigate('StudentLogin')}
        />
      </View>
    </AppScreen>
  );
};
