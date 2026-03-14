import { db } from '@/data/mockDb';
import { Notification, Project, Role, User } from '@/types';
import { delay, generateId } from '@/utils/helpers';

export const simulate = async <T>(factory: () => T, ms = 500) => {
  await delay(ms);
  return clone(factory());
};

export const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const requireUser = (userId: string) => {
  const user = db.users.find((item) => item.id === userId);
  if (!user) {
    throw new Error('User not found');
  }

  return user;
};

export const requireStudent = (userId: string) => {
  const user = requireUser(userId);
  if (user.role !== 'student') {
    throw new Error('Student account not found');
  }

  return user;
};

export const requireProject = (projectId: string) => {
  const project = db.projects.find((item) => item.id === projectId);
  if (!project) {
    throw new Error('Project not found');
  }

  return project;
};

export const getCurrentRoleLabel = (role: Role) => (role === 'admin' ? 'Admin' : 'Student');

export const addNotification = (payload: Omit<Notification, 'id' | 'createdAt'>) => {
  db.notifications.unshift({
    id: generateId('notification'),
    createdAt: new Date().toISOString(),
    ...payload,
  });
};

export const logAudit = (
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
  details: string
) => {
  db.auditLogs.unshift({
    id: generateId('audit'),
    actorId,
    action,
    entityType,
    entityId,
    details,
    createdAt: new Date().toISOString(),
  });
};

export const recalcProjectMembers = (project: Project) => {
  const activeMembers = db.memberships
    .filter((membership) => membership.projectId === project.id && membership.status === 'active')
    .map((membership) => membership.studentId);

  project.teamMemberIds = Array.from(new Set(activeMembers));
  project.currentTeamSize = project.teamMemberIds.length;
};

export const getDisplayName = (user: User) => user.fullName.split(' ')[0];

export const ensureProjectConversation = (projectId: string) => {
  const project = requireProject(projectId);
  const existing = db.conversations.find(
    (conversation) => conversation.type === 'project' && conversation.projectId === projectId
  );
  if (existing) {
    return existing;
  }

  const conversation = {
    id: generateId('conversation'),
    type: 'project' as const,
    participantIds: [...project.teamMemberIds],
    projectId,
    title: project.title,
    typingUserIds: [],
    unreadBy: Object.fromEntries(project.teamMemberIds.map((memberId) => [memberId, 0])),
    presence: Object.fromEntries(
      project.teamMemberIds.map((memberId) => [memberId, 'online' as const])
    ),
    lastMessageId: undefined,
  };

  db.conversations.unshift(conversation);
  return conversation;
};
