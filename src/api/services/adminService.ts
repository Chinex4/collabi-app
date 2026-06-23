import { cache } from '@/data/cache';
import { db } from '@/data/mockDb';
import { AnalyticsMetrics, ProjectStatus } from '@/types';

import {
  mapAnnouncement,
  mapAuditLog,
  mapProfile,
  mapProject,
  mapReport,
  mapSetting,
  mapUser,
} from '../mappers';
import { supabase } from '../supabase';
import { throwIfSupabaseError } from '../errors';

const supabaseAny = supabase as any;

const projectSelect = `
  *,
  owner:users(*),
  category:categories(*),
  faculty:faculties(*),
  department:departments(*),
  required_skills:project_required_skills(skill:skills(*)),
  optional_skills:project_optional_skills(skill:skills(*)),
  bookmarks:project_bookmarks(user_id),
  memberships(*)
`;

const emptyAnalytics: AnalyticsMetrics = {
  totalUsers: 0,
  activeUsers: 0,
  totalProjects: 0,
  openProjects: 0,
  completedProjects: 0,
  teamFormationActivity: 0,
  taskActivity: 0,
  reportsOverview: 0,
};

const getCount = async (table: string, filter?: (query: any) => any) => {
  let query = supabaseAny.from(table).select('id', { count: 'exact', head: true });
  if (filter) {
    query = filter(query);
  }
  const { count, error } = await query;
  throwIfSupabaseError(error);
  return count ?? 0;
};

const buildAnalytics = async (): Promise<AnalyticsMetrics> => {
  const [
    totalUsers,
    activeUsers,
    totalProjects,
    openProjects,
    completedProjects,
    teamFormationActivity,
    taskActivity,
    reportsOverview,
  ] = await Promise.all([
    getCount('users'),
    getCount('users', (query) => query.eq('status', 'active')),
    getCount('projects'),
    getCount('projects', (query) => query.eq('status', 'open')),
    getCount('projects', (query) => query.eq('status', 'completed')),
    getCount('memberships', (query) => query.eq('status', 'active')),
    getCount('tasks'),
    getCount('reports', (query) => query.eq('status', 'pending')),
  ]);

  return {
    totalUsers,
    activeUsers,
    totalProjects,
    openProjects,
    completedProjects,
    teamFormationActivity,
    taskActivity,
    reportsOverview,
  };
};

export const adminService = {
  async getDashboard() {
    const [analytics, reports, announcements] = await Promise.all([
      this.getAnalytics(),
      this.getReports(),
      this.getAnnouncements(),
    ]);

    const recentReports = reports.slice(0, 5);
    cache.replaceReports(recentReports);

    return {
      analytics,
      recentReports,
      announcements,
    };
  },
  async getAnalytics() {
    const analytics = await buildAnalytics().catch(() => emptyAnalytics);
    cache.replaceAnalytics(analytics);
    return analytics;
  },
  async getUsers(search = '') {
    let query = supabaseAny
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error } = await query;
    throwIfSupabaseError(error);

    const items = (data ?? []).map(mapUser);
    cache.syncUsers(items);
    return items;
  },
  async getUserDetail(userId: string) {
    const [userResult, profileResult, ownedProjects, memberships] = await Promise.all([
      supabaseAny.from('users').select('*').eq('id', userId).single(),
      supabaseAny.from('student_profiles').select('*').eq('user_id', userId).maybeSingle(),
      supabaseAny.from('projects').select(projectSelect).eq('owner_id', userId),
      supabaseAny.from('memberships').select('project:projects(*)').eq('student_id', userId),
    ]);

    throwIfSupabaseError(userResult.error);
    throwIfSupabaseError(profileResult.error);
    throwIfSupabaseError(ownedProjects.error);
    throwIfSupabaseError(memberships.error);

    const user = mapUser(userResult.data);
    const profile = profileResult.data ? mapProfile(profileResult.data) : undefined;
    const projects = [
      ...((ownedProjects.data ?? []) as any[]),
      ...((memberships.data ?? []) as any[]).map((item) => item.project).filter(Boolean),
    ].map((item) => mapProject(item));

    cache.syncUsers([user]);
    if (profile) {
      cache.syncProfiles([profile]);
    }
    cache.syncProjects(projects);

    return {
      user,
      profile: profile ?? db.profiles.find((item) => item.userId === userId),
      projects,
      activity: {
        projectCount: projects.length,
      },
    };
  },
  async setUserSuspension(userId: string, suspended: boolean, _actorId: string) {
    const { data, error } = await supabaseAny
      .from('users')
      .update({ status: suspended ? 'suspended' : 'active' })
      .eq('id', userId)
      .select('*')
      .single();

    throwIfSupabaseError(error);
    const user = mapUser(data);
    cache.syncUsers([user]);
    return user;
  },
  async verifyUser(userId: string, _actorId: string) {
    const { data, error } = await supabaseAny
      .from('users')
      .update({ is_verified: true })
      .eq('id', userId)
      .select('*')
      .single();

    throwIfSupabaseError(error);
    const user = mapUser(data);
    cache.syncUsers([user]);
    return user;
  },
  async deleteUser(userId: string, _actorId: string) {
    const { data, error } = await supabaseAny
      .from('users')
      .update({ status: 'deleted' })
      .eq('id', userId)
      .select('*')
      .single();

    throwIfSupabaseError(error);
    const user = mapUser(data);
    cache.syncUsers([user]);
    return user;
  },
  async getProjects(search = '') {
    let query = supabaseAny
      .from('projects')
      .select(projectSelect)
      .order('created_at', { ascending: false })
      .limit(100);
    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    const { data, error } = await query;
    throwIfSupabaseError(error);

    const items = (data ?? []).map(mapProject);
    cache.syncProjects(items);
    return items;
  },
  async getProjectDetail(projectId: string) {
    const [projectResult, applications, reports] = await Promise.all([
      supabaseAny.from('projects').select(projectSelect).eq('id', projectId).single(),
      supabaseAny.from('applications').select('*').eq('project_id', projectId),
      supabaseAny
        .from('reports')
        .select('*')
        .eq('target_type', 'project')
        .eq('target_id', projectId),
    ]);

    throwIfSupabaseError(projectResult.error);
    throwIfSupabaseError(applications.error);
    throwIfSupabaseError(reports.error);

    const project = mapProject(projectResult.data);
    cache.syncProjects([project]);

    return {
      project,
      applications: (applications.data ?? []).map((item: any) => ({
        id: item.id,
        projectId: item.project_id,
        studentId: item.student_id,
        message: item.message ?? '',
        status: item.status,
        createdAt: item.created_at,
      })),
      reports: (reports.data ?? []).map(mapReport),
    };
  },
  async removeProject(projectId: string, _actorId: string) {
    const { error } = await supabaseAny.from('projects').delete().eq('id', projectId);
    throwIfSupabaseError(error);

    cache.replaceProjects(db.projects.filter((item) => item.id !== projectId));
    return { success: true };
  },
  async changeProjectStatus(projectId: string, status: ProjectStatus, _actorId: string) {
    const { data, error } = await supabaseAny
      .from('projects')
      .update({ status })
      .eq('id', projectId)
      .select(projectSelect)
      .single();

    throwIfSupabaseError(error);
    const project = mapProject(data);
    cache.syncProjects([project]);
    return project;
  },
  async getReports() {
    const { data, error } = await supabaseAny
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    throwIfSupabaseError(error);
    const items = (data ?? []).map(mapReport);
    cache.replaceReports(items);
    return items;
  },
  async getReportDetail(reportId: string) {
    const { data, error } = await supabaseAny
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .single();

    throwIfSupabaseError(error);
    const report = mapReport(data);
    cache.syncReports([report]);
    return report;
  },
  async updateReportStatus(
    reportId: string,
    status: 'resolved' | 'dismissed' | 'reviewed',
    actorId: string
  ) {
    const { data, error } = await supabaseAny
      .from('reports')
      .update({
        status,
        reviewed_by: actorId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', reportId)
      .select('*')
      .single();

    throwIfSupabaseError(error);
    const report = mapReport(data);
    cache.syncReports([report]);
    return report;
  },
  async getAuditLogs() {
    const { data, error } = await supabaseAny
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    throwIfSupabaseError(error);
    const items = (data ?? []).map(mapAuditLog);
    cache.replaceAuditLogs(items);
    return items;
  },
  async getSettings() {
    const { data, error } = await supabaseAny
      .from('settings')
      .select('*')
      .order('category', { ascending: true })
      .order('label', { ascending: true });

    throwIfSupabaseError(error);
    const items = (data ?? []).map(mapSetting);
    cache.replaceSettings(items);
    return items;
  },
  async upsertSetting(
    _actorId: string,
    payload: {
      id?: string;
      key?: string;
      label: string;
      value: string;
      description: string;
      category: string;
    }
  ) {
    const row = {
      key: payload.key ?? payload.label.toLowerCase().replace(/\s+/g, '_'),
      label: payload.label,
      value: payload.value,
      description: payload.description,
      category: payload.category,
    };

    const query = payload.id
      ? supabaseAny.from('settings').update(row).eq('id', payload.id)
      : supabaseAny.from('settings').insert(row);

    const { data, error } = await query.select('*').single();
    throwIfSupabaseError(error);

    const setting = mapSetting(data);
    cache.replaceSettings(
      payload.id
        ? db.settings.map((item) => (item.id === payload.id ? setting : item))
        : [setting, ...db.settings]
    );
    return setting;
  },
  async deleteSetting(settingId: string, _actorId: string) {
    const { error } = await supabaseAny.from('settings').delete().eq('id', settingId);
    throwIfSupabaseError(error);

    cache.replaceSettings(db.settings.filter((item) => item.id !== settingId));
    return { success: true };
  },
  async getAnnouncements() {
    const { data, error } = await supabaseAny
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    throwIfSupabaseError(error);
    const items = (data ?? []).map(mapAnnouncement);
    cache.replaceAnnouncements(items);
    return items;
  },
  async sendAnnouncement(
    actorId: string,
    payload: { title: string; body: string; audience: 'all' | 'students' | 'admins' }
  ) {
    const { data, error } = await supabaseAny
      .from('announcements')
      .insert({
        title: payload.title,
        body: payload.body,
        audience: payload.audience,
        created_by: actorId,
        is_sent: true,
        sent_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    throwIfSupabaseError(error);
    const announcement = mapAnnouncement(data);
    cache.replaceAnnouncements([announcement, ...db.announcements]);
    return announcement;
  },
};
