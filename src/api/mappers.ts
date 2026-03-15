import {
  AnalyticsMetrics,
  Announcement,
  Application,
  AuditLog,
  Category,
  Conversation,
  Department,
  Faculty,
  FileResource,
  Interest,
  Invitation,
  Membership,
  Message,
  Notification,
  NotificationType,
  Project,
  Report,
  Setting,
  Skill,
  StudentProfile,
  Task,
  TaskComment,
  User,
} from '@/types';

const extractId = (value: unknown): string => {
  if (!value) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'object') {
    const maybeEntity = value as { _id?: string; id?: string };
    return maybeEntity._id ?? maybeEntity.id ?? '';
  }
  return '';
};

const toArray = <T>(value: T[] | null | undefined) => value ?? [];

const toIdArray = (value: unknown[] | null | undefined) => toArray(value).map(extractId).filter(Boolean);

const portfolioLinksFromObject = (value: unknown) => {
  if (!value || typeof value !== 'object') {
    return [];
  }

  return Object.values(value as Record<string, unknown>)
    .filter((entry): entry is string => typeof entry === 'string' && Boolean(entry))
    .filter(Boolean);
};

export const mapLookup = (item: any): Faculty => ({
  id: item._id,
  name: item.name,
});

export const mapFaculty = mapLookup;

export const mapDepartment = (item: any): Department => ({
  id: item._id,
  name: item.name,
  facultyId: extractId(item.faculty),
});

export const mapCategory = (item: any): Category => ({
  id: item._id,
  name: item.name,
});

export const mapSkill = (item: any): Skill => ({
  id: item._id,
  name: item.name,
});

export const mapInterest = (item: any): Interest => ({
  id: item._id,
  name: item.name,
});

export const mapFileResource = (item: any): FileResource => ({
  id: item._id,
  name: item.originalName ?? item.label ?? 'Attachment',
  url: item.url,
  type: item.mimeType ?? item.resourceType ?? 'application/octet-stream',
  sizeKb: Math.max(1, Math.round((item.size ?? 0) / 1024)),
  uploadedAt: item.createdAt ?? new Date().toISOString(),
  uploadedBy: extractId(item.uploader),
  context: item.contextType ?? 'general',
});

export const mapUser = (item: any): User => ({
  id: item._id,
  role: item.role,
  fullName: item.fullName,
  email: item.email,
  facultyId: extractId(item.faculty) || undefined,
  departmentId: extractId(item.department) || undefined,
  level: item.level ? String(item.level) : undefined,
  avatar: item.profileImage?.url,
  isVerified: Boolean(item.isEmailVerified),
  status: item.isSuspended ? 'suspended' : item.isActive === false ? 'deleted' : 'active',
  createdAt: item.createdAt ?? new Date().toISOString(),
});

export const mapProfile = (item: any): StudentProfile => ({
  id: item._id,
  userId: extractId(item.user),
  bio: item.bio ?? '',
  skills: toArray(item.skills).map((entry: any) => extractId(entry.skill ?? entry)).filter(Boolean),
  interests: toIdArray(item.interests),
  availability: item.availability ?? 'available',
  preferredRoles: toArray(item.preferredRoles),
  portfolioLinks: portfolioLinksFromObject(item.portfolioLinks),
  visibility: item.visibility ?? 'public',
  photoUrl: item.profilePicture?.url ?? item.user?.profileImage?.url,
  completedProjectsCount: item.completedProjectsCount ?? 0,
  activeProjectsCount: item.currentProjectsCount ?? 0,
});

export const mapProject = (item: any, currentUserId?: string): Project => ({
  id: item._id,
  title: item.title,
  description: item.description,
  categoryId: extractId(item.category),
  departmentId: extractId(item.department),
  facultyId: extractId(item.faculty),
  requiredSkillIds: toIdArray(item.requiredSkills),
  optionalSkillIds: toIdArray(item.optionalSkills),
  teamSizeLimit: item.maxTeamSize ?? 1,
  currentTeamSize: item.currentTeamSize ?? 0,
  deadline: item.deadline ?? new Date().toISOString(),
  visibility: item.visibility ?? 'public',
  tags: toArray(item.tags),
  attachments: toArray(item.attachments).map((entry: any) =>
    mapFileResource(entry.file ?? entry)
  ),
  ownerId: extractId(item.owner),
  teamMemberIds: extractId(item.owner) ? [extractId(item.owner)] : [],
  status: item.status ?? 'open',
  createdAt: item.createdAt ?? new Date().toISOString(),
  bookmarkedBy: currentUserId ? [currentUserId] : [],
});

export const mapApplication = (item: any): Application => ({
  id: item._id,
  projectId: extractId(item.project),
  studentId: extractId(item.applicant),
  message: item.message ?? '',
  status: item.status,
  createdAt: item.createdAt ?? new Date().toISOString(),
});

export const mapInvitation = (item: any): Invitation => ({
  id: item._id,
  projectId: extractId(item.project),
  studentId: extractId(item.invitedUser),
  senderId: extractId(item.invitedBy),
  message: item.message ?? '',
  status: item.status,
  createdAt: item.createdAt ?? new Date().toISOString(),
});

export const mapMembership = (item: any): Membership => ({
  id: item._id,
  projectId: extractId(item.project),
  studentId: extractId(item.user),
  roleName: item.roleName ?? 'Contributor',
  status: item.status ?? 'active',
  joinedAt: item.joinedAt ?? item.createdAt ?? new Date().toISOString(),
});

export const mapTaskComment = (item: any): TaskComment => ({
  id: item._id,
  taskId: extractId(item.task),
  authorId: extractId(item.user),
  body: item.content ?? '',
  createdAt: item.createdAt ?? new Date().toISOString(),
  updatedAt: item.updatedAt,
});

export const mapTask = (item: any): Task => ({
  id: item._id,
  projectId: extractId(item.project),
  title: item.title,
  description: item.description ?? '',
  assignedMemberIds: toIdArray(item.assignedTo),
  priority: item.priority ?? 'medium',
  status: item.status ?? 'todo',
  dueDate: item.dueDate ?? new Date().toISOString(),
  progress: item.progress ?? 0,
  attachments: toArray(item.attachments).map(mapFileResource),
  comments: toArray(item.comments).map(mapTaskComment),
  createdBy: extractId(item.createdBy),
});

export const mapMessage = (item: any): Message => ({
  id: item._id,
  conversationId: extractId(item.conversation),
  senderId: extractId(item.sender),
  body: item.content ?? '',
  attachments: toArray(item.attachments).map(mapFileResource),
  createdAt: item.createdAt ?? new Date().toISOString(),
  editedAt: item.isEdited ? item.updatedAt : undefined,
  deletedAt: item.deletedAt ?? undefined,
  readBy: toArray(item.readBy).map((entry: any) => extractId(entry.user ?? entry)).filter(Boolean),
});

export const mapConversation = (item: any): Conversation => ({
  id: item._id,
  type: item.type,
  participantIds: toIdArray(item.participants),
  projectId: extractId(item.project) || undefined,
  title:
    item.type === 'project'
      ? item.project?.title ?? 'Project Chat'
      : toArray(item.participants)
          .map((entry: any) => entry.fullName)
          .filter(Boolean)
          .join(', ') || 'Private Chat',
  lastMessageId: extractId(item.lastMessage) || undefined,
  typingUserIds: [],
  unreadBy: {},
  presence: {},
  updatedAt: item.updatedAt,
});

const notificationTypeMap: Record<string, NotificationType> = {
  application_submitted: 'application',
  application_decision: 'application',
  invitation_received: 'invitation',
  invitation_decision: 'invitation',
  team_update: 'team',
  task_assigned: 'task',
  task_updated: 'task',
  private_message: 'message',
  project_message: 'mention',
  project_deadline: 'task',
  admin_announcement: 'announcement',
  report_update: 'report',
};

export const mapNotification = (item: any): Notification => ({
  id: item._id,
  userId: extractId(item.recipient),
  type: notificationTypeMap[item.type] ?? 'message',
  title: item.title,
  body: item.message ?? '',
  entityType: item.type,
  entityId:
    extractId(item.data?.conversationId) ||
    extractId(item.data?.projectId) ||
    extractId(item.data?.messageId) ||
    undefined,
  isRead: Boolean(item.isRead),
  createdAt: item.createdAt ?? new Date().toISOString(),
});

export const mapReport = (item: any): Report => ({
  id: item._id,
  reporterId: extractId(item.reporter),
  targetType: item.targetType,
  targetId: item.targetId,
  reason: item.reason,
  description: item.description,
  status: item.status,
  createdAt: item.createdAt ?? new Date().toISOString(),
});

export const mapSetting = (item: any): Setting => ({
  id: item._id,
  key: item.key,
  label: item.key,
  value: typeof item.value === 'string' ? item.value : JSON.stringify(item.value),
  description: item.description ?? '',
  category: 'Platform',
});

export const mapAnnouncement = (item: any): Announcement => ({
  id: item._id ?? item.id,
  title: item.title,
  body: item.message ?? item.body ?? '',
  audience: item.audience ?? 'all',
  createdAt: item.createdAt ?? new Date().toISOString(),
  createdBy: extractId(item.createdBy),
  isSent: true,
});

export const mapAuditLog = (item: any): AuditLog => ({
  id: item._id,
  actorId: extractId(item.actor),
  action: item.action,
  entityType: item.targetType ?? 'entity',
  entityId: item.targetId ?? '',
  details:
    typeof item.details === 'string' ? item.details : JSON.stringify(item.details ?? {}),
  createdAt: item.createdAt ?? new Date().toISOString(),
});

export const mapAnalytics = (item: any): AnalyticsMetrics => ({
  totalUsers: item.overview?.totalUsers ?? 0,
  activeUsers: item.overview?.activeUsers30Days ?? 0,
  totalProjects: item.overview?.totalProjects ?? 0,
  openProjects: item.overview?.openProjects ?? 0,
  completedProjects: item.overview?.completedProjects ?? 0,
  teamFormationActivity: item.overview?.totalTeams ?? 0,
  taskActivity: item.charts?.tasks?.length ?? 0,
  reportsOverview: item.charts?.reports?.length ?? 0,
});
