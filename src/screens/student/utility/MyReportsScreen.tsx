import React from 'react';
import { View } from 'react-native';

import {
  AppButton,
  AppHeader,
  AppScreen,
  AppText,
  Badge,
  EmptyState,
  LoadingState,
} from '@/components/common';
import { useMyReports } from '@/hooks/useQueries';
import { useSession } from '@/hooks/useSession';

export const MyReportsScreen = ({ navigation }: any) => {
  const { currentUser } = useSession();
  const reportsQuery = useMyReports(currentUser?.id);

  return (
    <AppScreen>
      <AppHeader
        title="My Reports"
        subtitle="Track the status of abuse and moderation reports you have submitted."
      />
      {reportsQuery.isLoading ? <LoadingState label="Loading reports..." /> : null}
      {reportsQuery.data?.length ? (
        reportsQuery.data.map((report) => (
          <View key={report.id} className="mb-3 rounded-3xl bg-white p-4">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-4">
                <AppText className="text-base font-semibold text-slate-900">
                  {report.targetType} • {report.reason}
                </AppText>
                <AppText className="mt-1 text-sm text-slate-500">
                  {report.description || 'No extra description provided.'}
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
          </View>
        ))
      ) : (
        <EmptyState
          title="No reports submitted"
          message="Use the report action from users, projects, or messages when something needs moderation."
          action={
            <AppButton
              label="Report a Project"
              onPress={() =>
                navigation.navigate('ReportTarget', {
                  targetType: 'project',
                  targetId: 'project_1',
                })
              }
            />
          }
        />
      )}
    </AppScreen>
  );
};
