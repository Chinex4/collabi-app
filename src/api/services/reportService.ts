import { db } from '@/data/mockDb';
import { generateId } from '@/utils/helpers';

import { simulate } from './base';

export const reportService = {
  async getMyReports(userId: string) {
    return simulate(() => db.reports.filter((report) => report.reporterId === userId));
  },
  async submitReport(
    userId: string,
    payload: {
      targetType: 'user' | 'project' | 'message';
      targetId: string;
      reason: string;
      description?: string;
    }
  ) {
    return simulate(() => {
      const report = {
        id: generateId('report'),
        reporterId: userId,
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
        ...payload,
      };
      db.reports.unshift(report);
      return report;
    }, 650);
  },
};
