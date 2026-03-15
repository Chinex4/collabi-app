import { db } from '@/data/mockDb';
import {
  AnalyticsMetrics,
  Announcement,
  Application,
  AuditLog,
  Category,
  Conversation,
  Department,
  Faculty,
  Interest,
  Invitation,
  Membership,
  Message,
  Notification,
  Project,
  Report,
  Setting,
  Skill,
  StudentProfile,
  Task,
  User,
} from '@/types';

const replaceList = <T>(target: T[], items: T[]) => {
  target.splice(0, target.length, ...items);
};

const upsertList = <T extends { id: string }>(target: T[], items: T[]) => {
  items.forEach((item) => {
    const index = target.findIndex((entry) => entry.id === item.id);
    if (index >= 0) {
      target[index] = { ...target[index], ...item };
    } else {
      target.unshift(item);
    }
  });
};

const upsertProfileList = (target: StudentProfile[], items: StudentProfile[]) => {
  items.forEach((item) => {
    const index = target.findIndex((entry) => entry.userId === item.userId);
    if (index >= 0) {
      target[index] = { ...target[index], ...item };
    } else {
      target.unshift(item);
    }
  });
};

export const cache = {
  replaceLookups(payload: {
    faculties?: Faculty[];
    departments?: Department[];
    skills?: Skill[];
    interests?: Interest[];
    categories?: Category[];
  }) {
    if (payload.faculties) replaceList(db.faculties, payload.faculties);
    if (payload.departments) replaceList(db.departments, payload.departments);
    if (payload.skills) replaceList(db.skills, payload.skills);
    if (payload.interests) replaceList(db.interests, payload.interests);
    if (payload.categories) replaceList(db.categories, payload.categories);
  },
  syncUsers(items: User[]) {
    upsertList(db.users, items);
  },
  syncProfiles(items: StudentProfile[]) {
    upsertProfileList(db.profiles, items);
  },
  replaceProjects(items: Project[]) {
    replaceList(db.projects, items);
  },
  syncProjects(items: Project[]) {
    upsertList(db.projects, items);
  },
  replaceApplications(items: Application[]) {
    replaceList(db.applications, items);
  },
  syncApplications(items: Application[]) {
    upsertList(db.applications, items);
  },
  replaceInvitations(items: Invitation[]) {
    replaceList(db.invitations, items);
  },
  syncInvitations(items: Invitation[]) {
    upsertList(db.invitations, items);
  },
  replaceMemberships(items: Membership[]) {
    replaceList(db.memberships, items);
  },
  syncMemberships(items: Membership[]) {
    upsertList(db.memberships, items);
  },
  replaceTasks(items: Task[]) {
    replaceList(db.tasks, items);
  },
  syncTasks(items: Task[]) {
    upsertList(db.tasks, items);
  },
  replaceConversations(items: Conversation[]) {
    replaceList(db.conversations, items);
  },
  syncConversations(items: Conversation[]) {
    upsertList(db.conversations, items);
  },
  replaceMessages(items: Message[]) {
    replaceList(db.messages, items);
  },
  syncMessages(items: Message[]) {
    upsertList(db.messages, items);
  },
  replaceNotifications(items: Notification[]) {
    replaceList(db.notifications, items);
  },
  syncNotifications(items: Notification[]) {
    upsertList(db.notifications, items);
  },
  replaceReports(items: Report[]) {
    replaceList(db.reports, items);
  },
  syncReports(items: Report[]) {
    upsertList(db.reports, items);
  },
  replaceSettings(items: Setting[]) {
    replaceList(db.settings, items);
  },
  replaceAnnouncements(items: Announcement[]) {
    replaceList(db.announcements, items);
  },
  replaceAuditLogs(items: AuditLog[]) {
    replaceList(db.auditLogs, items);
  },
  replaceAnalytics(item: AnalyticsMetrics) {
    Object.assign(db.analytics, item);
  },
};
