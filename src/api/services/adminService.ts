import { db } from '@/data/mockDb';
import { ProjectStatus } from '@/types';
import { generateId } from '@/utils/helpers';

import { addNotification, logAudit, requireProject, requireUser, simulate } from './base';

const recalcAnalytics = () => {
  db.analytics.totalUsers = db.users.filter((user) => user.role === 'student').length;
  db.analytics.activeUsers = db.users.filter(
    (user) => user.role === 'student' && user.status === 'active'
  ).length;
  db.analytics.totalProjects = db.projects.length;
  db.analytics.openProjects = db.projects.filter((project) => project.status === 'open').length;
  db.analytics.completedProjects = db.projects.filter(
    (project) => project.status === 'completed'
  ).length;
  db.analytics.taskActivity = db.tasks.length;
  db.analytics.reportsOverview = db.reports.length;
};

export const adminService = {
  async getDashboard() {
    return simulate(() => ({
      analytics: db.analytics,
      recentReports: db.reports.slice(0, 5),
      announcements: db.announcements.slice(0, 3),
    }));
  },
  async getAnalytics() {
    return simulate(() => db.analytics);
  },
  async getUsers(search = '') {
    return simulate(() =>
      db.users.filter(
        (user) =>
          user.role === 'student' &&
          (!search ||
            user.fullName.toLowerCase().includes(search.toLowerCase()) ||
            user.email.toLowerCase().includes(search.toLowerCase()))
      )
    );
  },
  async getUserDetail(userId: string) {
    return simulate(() => ({
      user: requireUser(userId),
      profile: db.profiles.find((profile) => profile.userId === userId),
      projects: db.projects.filter(
        (project) => project.ownerId === userId || project.teamMemberIds.includes(userId)
      ),
    }));
  },
  async setUserSuspension(userId: string, suspended: boolean, actorId: string) {
    return simulate(() => {
      const user = requireUser(userId);
      user.status = suspended ? 'suspended' : 'active';
      recalcAnalytics();
      logAudit(
        actorId,
        suspended ? 'suspend_user' : 'unsuspend_user',
        'user',
        userId,
        `${user.fullName} status changed`
      );
      return user;
    });
  },
  async verifyUser(userId: string, actorId: string) {
    return simulate(() => {
      const user = requireUser(userId);
      user.isVerified = true;
      logAudit(actorId, 'verify_user', 'user', userId, `Verified ${user.fullName}`);
      return user;
    });
  },
  async deleteUser(userId: string, actorId: string) {
    return simulate(() => {
      const user = requireUser(userId);
      user.status = 'deleted';
      recalcAnalytics();
      logAudit(actorId, 'delete_user', 'user', userId, `Soft deleted ${user.fullName}`);
      return user;
    });
  },
  async getProjects(search = '') {
    return simulate(() =>
      db.projects.filter(
        (project) =>
          !search ||
          project.title.toLowerCase().includes(search.toLowerCase()) ||
          project.description.toLowerCase().includes(search.toLowerCase())
      )
    );
  },
  async getProjectDetail(projectId: string) {
    return simulate(() => ({
      project: requireProject(projectId),
      applications: db.applications.filter((application) => application.projectId === projectId),
      reports: db.reports.filter((report) => report.targetId === projectId),
    }));
  },
  async removeProject(projectId: string, actorId: string) {
    return simulate(() => {
      const index = db.projects.findIndex((item) => item.id === projectId);
      if (index === -1) {
        throw new Error('Project not found');
      }
      const project = db.projects[index];
      db.projects.splice(index, 1);
      recalcAnalytics();
      logAudit(actorId, 'remove_project', 'project', projectId, `Removed ${project.title}`);
      return { success: true };
    });
  },
  async changeProjectStatus(projectId: string, status: ProjectStatus, actorId: string) {
    return simulate(() => {
      const project = requireProject(projectId);
      project.status = status;
      recalcAnalytics();
      logAudit(actorId, 'change_project_status', 'project', projectId, `Marked as ${status}`);
      return project;
    });
  },
  async getReports() {
    return simulate(() => db.reports);
  },
  async getReportDetail(reportId: string) {
    return simulate(() => {
      const report = db.reports.find((item) => item.id === reportId);
      if (!report) {
        throw new Error('Report not found');
      }
      return report;
    });
  },
  async updateReportStatus(
    reportId: string,
    status: 'resolved' | 'dismissed' | 'reviewed',
    actorId: string
  ) {
    return simulate(() => {
      const report = db.reports.find((item) => item.id === reportId);
      if (!report) {
        throw new Error('Report not found');
      }
      report.status = status;
      logAudit(actorId, 'update_report_status', 'report', reportId, `Marked report as ${status}`);
      addNotification({
        userId: report.reporterId,
        type: 'report',
        title: 'Report updated',
        body: `Your report is now marked ${status}.`,
        entityType: 'report',
        entityId: report.id,
        isRead: false,
      });
      return report;
    }, 600);
  },
  async getAuditLogs() {
    return simulate(() => db.auditLogs);
  },
  async getSettings() {
    return simulate(() => db.settings);
  },
  async upsertSetting(
    actorId: string,
    payload: {
      id?: string;
      key?: string;
      label: string;
      value: string;
      description: string;
      category: string;
    }
  ) {
    return simulate(() => {
      if (payload.id) {
        const existing = db.settings.find((setting) => setting.id === payload.id);
        if (!existing) {
          throw new Error('Setting not found');
        }
        Object.assign(existing, payload);
        logAudit(actorId, 'update_setting', 'setting', existing.id, `Updated ${existing.label}`);
        return existing;
      }

      const setting = {
        id: generateId('setting'),
        key: payload.key ?? payload.label.toLowerCase().replace(/\s+/g, '_'),
        label: payload.label,
        value: payload.value,
        description: payload.description,
        category: payload.category,
      };
      db.settings.unshift(setting);
      logAudit(actorId, 'create_setting', 'setting', setting.id, `Created ${setting.label}`);
      return setting;
    });
  },
  async deleteSetting(settingId: string, actorId: string) {
    return simulate(() => {
      const index = db.settings.findIndex((setting) => setting.id === settingId);
      if (index === -1) {
        throw new Error('Setting not found');
      }
      const setting = db.settings[index];
      db.settings.splice(index, 1);
      logAudit(actorId, 'delete_setting', 'setting', settingId, `Deleted ${setting.label}`);
      return { success: true };
    });
  },
  async getAnnouncements() {
    return simulate(() => db.announcements);
  },
  async sendAnnouncement(
    actorId: string,
    payload: { title: string; body: string; audience: 'all' | 'students' | 'admins' }
  ) {
    return simulate(() => {
      const announcement = {
        id: generateId('announcement'),
        title: payload.title,
        body: payload.body,
        audience: payload.audience,
        createdAt: new Date().toISOString(),
        createdBy: actorId,
        isSent: true,
      };
      db.announcements.unshift(announcement);
      db.users
        .filter((user) => {
          if (payload.audience === 'all') return true;
          return payload.audience === 'students' ? user.role === 'student' : user.role === 'admin';
        })
        .forEach((user) =>
          addNotification({
            userId: user.id,
            type: 'announcement',
            title: announcement.title,
            body: announcement.body,
            entityType: 'announcement',
            entityId: announcement.id,
            isRead: false,
          })
        );
      logAudit(
        actorId,
        'send_announcement',
        'announcement',
        announcement.id,
        `Announcement sent to ${payload.audience}`
      );
      return announcement;
    }, 800);
  },
};
