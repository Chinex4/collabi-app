import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import {
  Membership,
  Notification,
  PresenceStatus,
  Project,
  ProjectStatus,
  ProjectVisibility,
  TaskPriority,
  TaskStatus,
} from '@/types';

export const delay = (ms = 700) => new Promise((resolve) => setTimeout(resolve, ms));

dayjs.extend(relativeTime);

export const generateId = (prefix: string) =>
  `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;

export const formatDate = (value: string, template = 'DD MMM YYYY') =>
  dayjs(value).format(template);

export const formatRelativeTime = (value: string) =>
  dayjs(value).fromNow?.() ?? formatDate(value, 'DD MMM');

export const getProjectStatusTone = (status: ProjectStatus) => {
  switch (status) {
    case 'open':
      return 'success';
    case 'in_progress':
      return 'info';
    case 'completed':
      return 'primary';
    case 'cancelled':
      return 'danger';
    case 'closed':
      return 'warning';
  }
};

export const getVisibilityLabel = (visibility: ProjectVisibility) =>
  visibility === 'department_only' ? 'Department only' : visibility;

export const getTaskPriorityTone = (priority: TaskPriority) => {
  switch (priority) {
    case 'high':
      return 'danger';
    case 'medium':
      return 'warning';
    case 'low':
      return 'success';
  }
};

export const getTaskStatusLabel = (status: TaskStatus) =>
  status === 'in_progress' ? 'In Progress' : status === 'todo' ? 'Todo' : 'Done';

export const getPresenceTone = (presence: PresenceStatus) => {
  switch (presence) {
    case 'online':
      return 'success';
    case 'away':
      return 'warning';
    case 'offline':
      return 'muted';
  }
};

export const getUnreadCount = (notifications: Notification[]) =>
  notifications.filter((item) => !item.isRead).length;

export const isProjectMember = (project: Project, userId: string, memberships: Membership[]) =>
  project.ownerId === userId ||
  memberships.some(
    (membership) =>
      membership.projectId === project.id &&
      membership.studentId === userId &&
      membership.status === 'active'
  );

export const initials = (name: string) =>
  name
    .split(' ')
    .map((chunk) => chunk[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

export const cn = (...values: (string | false | null | undefined)[]) =>
  values.filter(Boolean).join(' ');
