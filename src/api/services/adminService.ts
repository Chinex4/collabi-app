import { cache } from '@/data/cache';
import { db } from '@/data/mockDb';
import { ProjectStatus } from '@/types';

import { apiRequest } from '../http';
import {
  mapAnalytics,
  mapAnnouncement,
  mapAuditLog,
  mapProfile,
  mapProject,
  mapReport,
  mapSetting,
  mapUser,
} from '../mappers';

export const adminService = {
  async getDashboard() {
    const [dashboard, reports] = await Promise.all([
      apiRequest<any>('/admin/dashboard', { auth: true }),
      apiRequest<any[]>('/admin/reports', { auth: true, query: { page: 1, limit: 5 } }),
    ]);

    const analytics = mapAnalytics(dashboard.data);
    const recentReports = reports.data.map(mapReport);
    cache.replaceAnalytics(analytics);
    cache.replaceReports(recentReports);

    return {
      analytics,
      recentReports,
      announcements: db.announcements,
    };
  },
  async getAnalytics() {
    const response = await apiRequest<any>('/admin/analytics', {
      auth: true,
    });
    const analytics = mapAnalytics(response.data);
    cache.replaceAnalytics(analytics);
    return analytics;
  },
  async getUsers(search = '') {
    const response = await apiRequest<any[]>('/admin/users', {
      auth: true,
      query: { search },
    });
    const items = response.data.map(mapUser);
    cache.syncUsers(items);
    return items;
  },
  async getUserDetail(userId: string) {
    const [userResponse, activityResponse] = await Promise.all([
      apiRequest<any>(`/admin/users/${userId}`, { auth: true }),
      apiRequest<any>(`/admin/users/${userId}/activity`, { auth: true }),
    ]);

    const user = mapUser(userResponse.data);
    cache.syncUsers([user]);
    const profile = activityResponse.data.profile ? mapProfile(activityResponse.data.profile) : undefined;
    if (profile) {
      cache.syncProfiles([profile]);
    }

    return {
      user,
      profile: profile ?? db.profiles.find((item) => item.userId === userId),
      projects: db.projects.filter(
        (project) => project.ownerId === userId || project.teamMemberIds.includes(userId)
      ),
      activity: activityResponse.data,
    };
  },
  async setUserSuspension(userId: string, suspended: boolean, _actorId: string) {
    const response = await apiRequest<any>(
      `/admin/users/${userId}/${suspended ? 'suspend' : 'unsuspend'}`,
      {
        method: 'PATCH',
        auth: true,
      }
    );

    const user = mapUser(response.data);
    cache.syncUsers([user]);
    return user;
  },
  async verifyUser(userId: string, _actorId: string) {
    const response = await apiRequest<any>(`/admin/users/${userId}/verify`, {
      method: 'PATCH',
      auth: true,
    });

    const user = mapUser(response.data);
    cache.syncUsers([user]);
    return user;
  },
  async deleteUser(userId: string, _actorId: string) {
    const response = await apiRequest<any>(`/admin/users/${userId}`, {
      method: 'DELETE',
      auth: true,
    });

    const user = mapUser(response.data);
    cache.syncUsers([user]);
    return user;
  },
  async getProjects(search = '') {
    const response = await apiRequest<any[]>('/admin/projects', {
      auth: true,
      query: { search },
    });
    const items = response.data.map((item) => mapProject(item));
    cache.syncProjects(items);
    return items;
  },
  async getProjectDetail(projectId: string) {
    const [projectResponse, reportsResponse] = await Promise.all([
      apiRequest<any>(`/admin/projects/${projectId}`, { auth: true }),
      apiRequest<any[]>(`/admin/reports`, {
        auth: true,
        query: { targetType: 'project' },
      }),
    ]);

    const project = mapProject(projectResponse.data);
    cache.syncProjects([project]);

    return {
      project,
      applications: db.applications.filter((item) => item.projectId === projectId),
      reports: reportsResponse.data.map(mapReport).filter((item) => item.targetId === projectId),
    };
  },
  async removeProject(projectId: string, _actorId: string) {
    await apiRequest(`/admin/projects/${projectId}`, {
      method: 'DELETE',
      auth: true,
    });

    cache.replaceProjects(db.projects.filter((item) => item.id !== projectId));
    return { success: true };
  },
  async changeProjectStatus(projectId: string, status: ProjectStatus, _actorId: string) {
    const response = await apiRequest<any>(`/admin/projects/${projectId}/status`, {
      method: 'PATCH',
      auth: true,
      json: { status },
    });

    const project = mapProject(response.data);
    cache.syncProjects([project]);
    return project;
  },
  async getReports() {
    const response = await apiRequest<any[]>('/admin/reports', {
      auth: true,
    });
    const items = response.data.map(mapReport);
    cache.replaceReports(items);
    return items;
  },
  async getReportDetail(reportId: string) {
    const response = await apiRequest<any>(`/admin/reports/${reportId}`, {
      auth: true,
    });
    const report = mapReport(response.data);
    cache.syncReports([report]);
    return report;
  },
  async updateReportStatus(
    reportId: string,
    status: 'resolved' | 'dismissed' | 'reviewed',
    _actorId: string
  ) {
    const actionPath =
      status === 'resolved'
        ? `/admin/reports/${reportId}/resolve`
        : status === 'dismissed'
          ? `/admin/reports/${reportId}/dismiss`
          : `/admin/reports/${reportId}/action`;

    const response = await apiRequest<any>(actionPath, {
      method: 'PATCH',
      auth: true,
      json: status === 'reviewed' ? { action: 'remove_message', resolutionNote: 'Reviewed' } : {},
    });

    const report = mapReport(response.data);
    cache.syncReports([report]);
    return report;
  },
  async getAuditLogs() {
    const response = await apiRequest<any[]>('/admin/audit-logs', {
      auth: true,
    });
    const items = response.data.map(mapAuditLog);
    cache.replaceAuditLogs(items);
    return items;
  },
  async getSettings() {
    const response = await apiRequest<any[]>('/admin/settings', {
      auth: true,
    });
    const items = response.data.map(mapSetting);
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
    const response = await apiRequest<any>('/admin/settings', {
      method: 'POST',
      auth: true,
      json: {
        key: payload.key ?? payload.label.toLowerCase().replace(/\s+/g, '_'),
        value: payload.value,
        description: payload.description,
        isPublic: true,
      },
    });

    const setting = mapSetting(response.data);
    cache.replaceSettings(
      payload.id
        ? db.settings.map((item) => (item.id === payload.id ? setting : item))
        : [setting, ...db.settings]
    );
    return setting;
  },
  async deleteSetting(settingId: string, _actorId: string) {
    await apiRequest(`/admin/settings/${settingId}`, {
      method: 'DELETE',
      auth: true,
    });

    cache.replaceSettings(db.settings.filter((item) => item.id !== settingId));
    return { success: true };
  },
  async getAnnouncements() {
    return db.announcements;
  },
  async sendAnnouncement(
    _actorId: string,
    payload: { title: string; body: string; audience: 'all' | 'students' | 'admins' }
  ) {
    const response = await apiRequest<any>('/admin/announcements', {
      method: 'POST',
      auth: true,
      json: {
        title: payload.title,
        message: payload.body,
      },
    });

    const announcement = mapAnnouncement({
      id: `${Date.now()}`,
      title: payload.title,
      body: payload.body,
      audience: payload.audience,
      createdAt: new Date().toISOString(),
    });
    cache.replaceAnnouncements([announcement, ...db.announcements]);
    return response.data ?? announcement;
  },
};
