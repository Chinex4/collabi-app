import { cache } from '@/data/cache';

import { throwIfSupabaseError } from '../errors';
import { mapReport } from '../mappers';
import { supabase } from '../supabase';

const supabaseAny = supabase as any;

export const reportService = {
  async getMyReports(userId: string) {
    const { data, error } = await supabaseAny
      .from('reports')
      .select('*')
      .eq('reporter_id', userId)
      .order('created_at', { ascending: false });

    throwIfSupabaseError(error);

    const items = (data ?? []).map(mapReport);
    cache.replaceReports(items);
    return items;
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
    const { data, error } = await supabaseAny
      .from('reports')
      .insert({
        reporter_id: userId,
        target_type: payload.targetType,
        target_id: payload.targetId,
        reason: payload.reason,
        description: payload.description,
      })
      .select('*')
      .single();

    throwIfSupabaseError(error);

    const report = mapReport(data);
    cache.syncReports([report]);
    return report;
  },
};
