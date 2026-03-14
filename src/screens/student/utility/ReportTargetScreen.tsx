import { useMutation, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { View } from 'react-native';

import { reportService } from '@/api/services/reportService';
import { AppButton, AppHeader, AppScreen } from '@/components/common';
import { FormSelect, FormTextArea, useAppForm } from '@/components/forms';
import { QUERY_KEYS, REPORT_REASONS } from '@/constants';
import { useSession } from '@/hooks/useSession';
import { useAppDispatch } from '@/hooks/useAppStore';
import { showToast } from '@/store/uiSlice';
import { reportSchema } from '@/utils/validation';

export const ReportTargetScreen = ({ navigation, route }: any) => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { currentUser } = useSession();
  const targetType = route.params.targetType as 'user' | 'project' | 'message';
  const targetId = route.params.targetId as string;

  const form = useAppForm({
    defaultValues: {
      reason: REPORT_REASONS[0],
      description: '',
    },
    schema: reportSchema,
  });

  const mutation = useMutation({
    mutationFn: (values: { reason: string; description?: string }) =>
      reportService.submitReport(currentUser!.id, { targetType, targetId, ...values }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.reports });
      dispatch(showToast({ type: 'success', message: 'Report submitted for review' }));
      navigation.goBack();
    },
  });

  return (
    <AppScreen>
      <AppHeader
        title="Report Content"
        subtitle={`Flag this ${targetType} for moderation review.`}
      />
      <View className="rounded-[32px] bg-white p-5">
        <FormSelect
          control={form.control}
          name="reason"
          label="Reason"
          options={REPORT_REASONS.map((reason) => ({ label: reason, value: reason }))}
        />
        <FormTextArea
          control={form.control}
          name="description"
          label="Description"
          placeholder="Add more context for moderators (optional)."
        />
        <AppButton
          label="Submit Report"
          onPress={form.handleSubmit((values) => mutation.mutate(values))}
          loading={mutation.isPending}
        />
      </View>
    </AppScreen>
  );
};
