import { cache } from '@/data/cache';

import { apiRequest } from '../http';
import { mapReport } from '../mappers';

export const reportService = {
  async getMyReports(_userId: string) {
    const response = await apiRequest<any[]>('/reports', {
      auth: true,
    });

    const items = response.data.map(mapReport);
    cache.replaceReports(items);
    return items;
  },
  async submitReport(
    _userId: string,
    payload: {
      targetType: 'user' | 'project' | 'message';
      targetId: string;
      reason: string;
      description?: string;
    }
  ) {
    const response = await apiRequest<any>('/reports', {
      method: 'POST',
      auth: true,
      json: payload,
    });

    const report = mapReport(response.data);
    cache.syncReports([report]);
    return report;
  },
};
