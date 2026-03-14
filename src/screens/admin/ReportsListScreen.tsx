import React from 'react';
import { View } from 'react-native';

import { AppButton, AppHeader, AppScreen, AppText, Badge, LoadingState } from '@/components/common';
import { useAdminReports } from '@/hooks/useQueries';

export const ReportsListScreen = ({ navigation }: any) => {
  const reports = useAdminReports();

  return (
    <AppScreen>
      <AppHeader
        title="Reports"
        subtitle="Student safety reports across users, projects, and chat content."
      />
      {reports.isLoading ? <LoadingState label="Loading reports..." /> : null}
      {reports.data?.map((report) => (
        <View key={report.id} className="mb-3 rounded-3xl bg-white p-4">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <AppText className="text-base font-semibold text-slate-900">{report.reason}</AppText>
              <AppText className="mt-1 text-sm text-slate-500">
                {report.targetType} • {report.description}
              </AppText>
            </View>
            <Badge
              label={report.status}
              tone={
                report.status === 'resolved'
                  ? 'success'
                  : report.status === 'dismissed'
                    ? 'danger'
                    : 'warning'
              }
            />
          </View>
          <AppButton
            label="View Report"
            onPress={() => navigation.navigate('ReportDetail', { reportId: report.id })}
            variant="secondary"
            className="mt-4"
          />
        </View>
      ))}
    </AppScreen>
  );
};
