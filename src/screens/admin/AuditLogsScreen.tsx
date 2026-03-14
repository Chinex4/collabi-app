import React from 'react';
import { View } from 'react-native';

import { AppHeader, AppScreen, AppText, LoadingState } from '@/components/common';
import { useAdminAuditLogs } from '@/hooks/useQueries';

export const AuditLogsScreen = () => {
  const logs = useAdminAuditLogs();

  return (
    <AppScreen>
      <AppHeader
        title="Audit Logs"
        subtitle="High-level moderation and platform management actions."
      />
      {logs.isLoading ? <LoadingState label="Loading audit logs..." /> : null}
      {logs.data?.map((log) => (
        <View key={log.id} className="mb-3 rounded-3xl bg-white p-4">
          <AppText className="text-base font-semibold text-slate-900">{log.action}</AppText>
          <AppText className="mt-1 text-sm text-slate-500">{log.details}</AppText>
          <AppText className="mt-2 text-xs text-slate-400">{log.createdAt}</AppText>
        </View>
      ))}
    </AppScreen>
  );
};
