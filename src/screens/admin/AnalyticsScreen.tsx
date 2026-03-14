import React from 'react';
import { View } from 'react-native';

import { AppHeader, AppScreen, AppText, LoadingState } from '@/components/common';
import { useAdminDashboard } from '@/hooks/useQueries';

export const AnalyticsScreen = () => {
  const dashboard = useAdminDashboard();
  if (dashboard.isLoading || !dashboard.data) {
    return <LoadingState label="Loading analytics..." />;
  }

  const { analytics } = dashboard.data;
  return (
    <AppScreen>
      <AppHeader
        title="Analytics"
        subtitle="Core platform metrics for team formation, task activity, and moderation load."
      />
      <View className="rounded-[32px] bg-white p-5">
        <View className="mb-3 flex-row items-center justify-between rounded-2xl bg-violet-50 p-4">
          <AppText className="font-medium text-slate-700">Completed Projects</AppText>
          <AppText className="text-lg font-bold text-slate-950">
            {analytics.completedProjects}
          </AppText>
        </View>
        <View className="mb-3 flex-row items-center justify-between rounded-2xl bg-violet-50 p-4">
          <AppText className="font-medium text-slate-700">Team Formation Activity</AppText>
          <AppText className="text-lg font-bold text-slate-950">
            {analytics.teamFormationActivity}
          </AppText>
        </View>
        <View className="mb-3 flex-row items-center justify-between rounded-2xl bg-violet-50 p-4">
          <AppText className="font-medium text-slate-700">Task Activity</AppText>
          <AppText className="text-lg font-bold text-slate-950">{analytics.taskActivity}</AppText>
        </View>
        <View className="flex-row items-center justify-between rounded-2xl bg-violet-50 p-4">
          <AppText className="font-medium text-slate-700">Reports Overview</AppText>
          <AppText className="text-lg font-bold text-slate-950">
            {analytics.reportsOverview}
          </AppText>
        </View>
      </View>
    </AppScreen>
  );
};
