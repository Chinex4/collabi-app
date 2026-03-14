import { useMutation, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { View } from 'react-native';

import { adminService } from '@/api/services/adminService';
import {
  AppButton,
  AppHeader,
  AppScreen,
  AppText,
  EmptyState,
  SectionHeader,
} from '@/components/common';
import { QUERY_KEYS } from '@/constants';
import { db } from '@/data/mockDb';
import { useSession } from '@/hooks/useSession';
import { useAppDispatch } from '@/hooks/useAppStore';
import { showToast } from '@/store/uiSlice';

export const ReportDetailScreen = ({ route }: any) => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { currentUser } = useSession();
  const reportId = route.params.reportId as string;
  const report = db.reports.find((item) => item.id === reportId);

  const mutation = useMutation({
    mutationFn: (status: 'reviewed' | 'resolved' | 'dismissed') =>
      adminService.updateReportStatus(reportId, status, currentUser!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminReports });
      dispatch(showToast({ type: 'success', message: 'Report updated' }));
    },
  });

  if (!report) {
    return (
      <AppScreen>
        <EmptyState title="Report not found" message="This report may already have been closed." />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <AppHeader title="Report Detail" subtitle={`${report.targetType} • ${report.reason}`} />
      <View className="rounded-[32px] bg-white p-5">
        <AppText className="text-sm leading-7 text-slate-600">
          {report.description || 'No extra context supplied.'}
        </AppText>
        <SectionHeader title="Moderation actions" />
        <View className="flex-row flex-wrap gap-3">
          <AppButton
            label="Mark Reviewed"
            onPress={() => mutation.mutate('reviewed')}
            variant="secondary"
          />
          <AppButton label="Resolve" onPress={() => mutation.mutate('resolved')} />
          <AppButton
            label="Dismiss"
            onPress={() => mutation.mutate('dismissed')}
            variant="danger"
          />
        </View>
      </View>
    </AppScreen>
  );
};
