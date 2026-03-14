import React from 'react';
import { View } from 'react-native';

import { AnnouncementCard, MetricCard } from '@/components/admin';
import {
  AppButton,
  AppHeader,
  AppScreen,
  AppText,
  Badge,
  LoadingState,
  SectionHeader,
} from '@/components/common';
import { useAdminDashboard } from '@/hooks/useQueries';

export const AdminDashboardScreen = ({ navigation }: any) => {
  const dashboard = useAdminDashboard();

  if (dashboard.isLoading || !dashboard.data) {
    return <LoadingState label="Loading dashboard..." />;
  }

  const { analytics, recentReports, announcements } = dashboard.data;

  return (
    <AppScreen>
      <AppHeader
        title="Admin Dashboard"
        subtitle="Platform moderation, collaboration activity, and announcements in one place."
      />
      <View className="flex-row flex-wrap justify-between">
        <MetricCard label="Total Users" value={analytics.totalUsers} />
        <MetricCard label="Active Users" value={analytics.activeUsers} />
        <MetricCard label="Total Projects" value={analytics.totalProjects} />
        <MetricCard label="Open Projects" value={analytics.openProjects} />
      </View>
      <SectionHeader
        title="Moderation snapshot"
        action={
          <AppButton
            label="Reports"
            onPress={() => navigation.navigate('ReportsList')}
            variant="secondary"
          />
        }
      />
      <View className="rounded-[32px] bg-white p-5">
        {recentReports.map((report) => (
          <View
            key={report.id}
            className="mb-3 flex-row items-start justify-between rounded-2xl bg-violet-50 p-3">
            <View className="flex-1 pr-3">
              <AppText className="font-semibold text-slate-900">{report.reason}</AppText>
              <AppText className="mt-1 text-sm text-slate-500">
                {report.targetType} • {report.description}
              </AppText>
            </View>
            <Badge
              label={report.status}
              tone={report.status === 'resolved' ? 'success' : 'warning'}
            />
          </View>
        ))}
      </View>
      <SectionHeader
        title="Announcements"
        action={
          <AppButton
            label="Compose"
            onPress={() => navigation.navigate('Announcements')}
            variant="secondary"
          />
        }
      />
      {announcements.map((announcement) => (
        <AnnouncementCard key={announcement.id} announcement={announcement} />
      ))}
    </AppScreen>
  );
};
