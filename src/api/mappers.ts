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

const pickId = (item: any) => item.id ?? item._id;

const pickDate = (item: any, key: 'created' | 'updated' = 'created') =>
  key === 'created'
    ? (item.created_at ?? item.createdAt ?? new Date().toISOString())
    : (item.updated_at ?? item.updatedAt);

const portfolioLinksFromObject = (value: unknown) => {
  if (!value || typeof value !== 'object') {
    return [];
  }

  return Object.values(value as Record<string, unknown>)
    .filter((entry): entry is string => typeof entry === 'string' && Boolean(entry))
    .filter(Boolean);
};

export const mapLookup = (item: any): Faculty => ({
  id: pickId(item),
  name: item.name,
});

export const mapFaculty = mapLookup;

export const mapDepartment = (item: any): Department => ({
  id: pickId(item),
  name: item.name,
  facultyId: item.faculty_id ?? extractId(item.faculty),
});

export const mapCategory = (item: any): Category => ({
  id: pickId(item),
  name: item.name,
  facultyId: (item.faculty_id ?? extractId(item.faculty)) || undefined,
});

export const mapSkill = (item: any): Skill => ({
  id: pickId(item),
  name: item.name,
  category: item.category ?? undefined,
});

export const mapInterest = (item: any): Interest => ({
  id: pickId(item),
  name: item.name,
});

export const mapFileResource = (item: any): FileResource => ({
  id: pickId(item),
  name: item.original_name ?? item.originalName ?? item.label ?? 'Attachment',
  url: item.url,
  type: item.mime_type ?? item.mimeType ?? item.resourceType ?? 'application/octet-stream',
  sizeKb: Math.max(1, Math.round((item.size_kb ?? item.size ?? 0) / (item.size_kb ? 1 : 1024))),
  uploadedAt: pickDate(item),
  uploadedBy: item.uploaded_by ?? extractId(item.uploader),
  context: item.context ?? item.contextType ?? 'general',
});

export const mapUser = (item: any): User => ({
  id: pickId(item),
  role: item.role,
  fullName: item.full_name ?? item.fullName,
  email: item.email,
  facultyId: (item.faculty_id ?? extractId(item.faculty)) || undefined,
  departmentId: (item.department_id ?? extractId(item.department)) || undefined,
  level: item.level ? String(item.level) : undefined,
  avatar: item.avatar_url ?? item.profileImage?.url,
  isVerified: item.is_verified ?? Boolean(item.isEmailVerified),
  status:
    item.status ??
    (item.isSuspended ? 'suspended' : item.isActive === false ? 'deleted' : 'active'),
  createdAt: pickDate(item),
});

export const mapProfile = (item: any): StudentProfile => ({
  id: pickId(item),
  userId: item.user_id ?? extractId(item.user),
  bio: item.bio ?? '',
  skills: toArray(item.skills)
    .map((entry: any) => extractId(entry.skill ?? entry))
    .filter(Boolean),
  interests: toArray(item.interests)
    .map((entry: any) => extractId(entry.interest ?? entry.interest_id ?? entry))
    .filter(Boolean),
  availability: item.availability ?? 'available',
  preferredRoles: toArray(item.preferred_roles ?? item.preferredRoles),
  portfolioLinks: Array.isArray(item.portfolio_links)
    ? item.portfolio_links
    : portfolioLinksFromObject(item.portfolioLinks),
  visibility: item.visibility ?? 'public',
  photoUrl: item.photo_url ?? item.profilePicture?.url ?? item.user?.profileImage?.url,
  completedProjectsCount: item.completed_projects_count ?? item.completedProjectsCount ?? 0,
  activeProjectsCount: item.active_projects_count ?? item.currentProjectsCount ?? 0,
});

export const mapProject = (item: any, currentUserId?: string): Project => ({
  id: pickId(item),
  title: item.title,
  description: item.description,
  categoryId: item.category_id ?? extractId(item.category),
  departmentId: item.department_id ?? extractId(item.department),
  facultyId: item.faculty_id ?? extractId(item.faculty),
  requiredSkillIds: toArray(item.required_skills ?? item.requiredSkills)
    .map((entry: any) => extractId(entry.skill ?? entry.skill_id ?? entry))
    .filter(Boolean),
  optionalSkillIds: toArray(item.optional_skills ?? item.optionalSkills)
    .map((entry: any) => extractId(entry.skill ?? entry.skill_id ?? entry))
    .filter(Boolean),
  teamSizeLimit: item.max_team_size ?? item.maxTeamSize ?? 1,
  currentTeamSize:
    item.current_team_size ??
    item.currentTeamSize ??
    toArray(item.memberships).filter((membership: any) => membership.status === 'active').length,
  deadline: item.deadline ?? new Date().toISOString(),
  visibility: item.visibility ?? 'public',
  tags: toArray(item.tags),
  attachments: toArray(item.attachments).map((entry: any) => mapFileResource(entry.file ?? entry)),
  ownerId: item.owner_id ?? extractId(item.owner),
  teamMemberIds: toArray(item.memberships)
    .filter((membership: any) => membership.status === 'active')
    .map((membership: any) => membership.student_id ?? extractId(membership.user))
    .filter(Boolean),
  status: item.status ?? 'open',
  createdAt: pickDate(item),
  bookmarkedBy: (() => {
    const userIds = toArray(item.bookmarks)
      .map((bookmark: any) => bookmark.user_id ?? extractId(bookmark.user))
      .filter(Boolean);

    return userIds.length ? userIds : currentUserId ? [currentUserId] : [];
  })(),
});

export const mapApplication = (item: any): Application => ({
  id: pickId(item),
  projectId: item.project_id ?? extractId(item.project),
  studentId: item.student_id ?? extractId(item.applicant),
  message: item.message ?? '',
  status: item.status,
  createdAt: pickDate(item),
});

export const mapInvitation = (item: any): Invitation => ({
  id: pickId(item),
  projectId: item.project_id ?? extractId(item.project),
  studentId: item.student_id ?? extractId(item.invitedUser),
  senderId: item.sender_id ?? extractId(item.invitedBy),
  message: item.message ?? '',
  status: item.status,
  createdAt: pickDate(item),
});

export const mapMembership = (item: any): Membership => ({
  id: pickId(item),
  projectId: item.project_id ?? extractId(item.project),
  studentId: item.student_id ?? extractId(item.user),
  roleName: item.role_name ?? item.roleName ?? 'Contributor',
  status: item.status ?? 'active',
  joinedAt: item.joined_at ?? item.joinedAt ?? pickDate(item),
});

export const mapTaskComment = (item: any): TaskComment => ({
  id: pickId(item),
  taskId: item.task_id ?? extractId(item.task),
  authorId: item.author_id ?? extractId(item.user),
  body: item.body ?? item.content ?? '',
  createdAt: pickDate(item),
  updatedAt: pickDate(item, 'updated'),
});

export const mapTask = (item: any): Task => ({
  id: pickId(item),
  projectId: item.project_id ?? extractId(item.project),
  title: item.title,
  description: item.description ?? '',
  assignedMemberIds: toArray(item.assignees ?? item.assignedTo)
    .map((entry: any) => entry.member_id ?? extractId(entry.member ?? entry.user ?? entry))
    .filter(Boolean),
  priority: item.priority ?? 'medium',
  status: item.status ?? 'todo',
  dueDate: item.due_date ?? item.dueDate ?? new Date().toISOString(),
  progress: item.progress ?? 0,
  attachments: toArray(item.attachments).map(mapFileResource),
  comments: toArray(item.comments).map(mapTaskComment),
  createdBy: item.created_by ?? extractId(item.createdBy),
});

export const mapMessage = (item: any): Message => ({
  id: pickId(item),
  conversationId: item.conversation_id ?? extractId(item.conversation),
  senderId: item.sender_id ?? extractId(item.sender),
  body: item.body ?? item.content ?? '',
  attachments: toArray(item.attachments).map(mapFileResource),
  createdAt: pickDate(item),
  editedAt: item.edited_at ?? (item.isEdited ? item.updatedAt : undefined),
  deletedAt: item.deleted_at ?? item.deletedAt ?? undefined,
  readBy: toArray(item.read_by ?? item.readBy)
    .map((entry: any) => extractId(entry.user ?? entry))
    .filter(Boolean),
});

export const mapConversation = (item: any): Conversation => ({
  id: pickId(item),
  type: item.type,
  participantIds: toArray(item.participants)
    .map((entry: any) => entry.user_id ?? extractId(entry.user ?? entry))
    .filter(Boolean),
  projectId: (item.project_id ?? extractId(item.project)) || undefined,
  title:
    item.type === 'project'
      ? item.title || item.project?.title || 'Project Chat'
      : toArray(item.participants)
          .map((entry: any) => entry.user?.full_name ?? entry.user?.fullName ?? entry.fullName)
          .filter(Boolean)
          .join(', ') || 'Private Chat',
  lastMessageId:
    extractId(item.last_message ?? item.lastMessage ?? item.messages?.[0]) || undefined,
  typingUserIds: toArray(item.participants)
    .filter(
      (entry: any) => entry.typing_until && new Date(entry.typing_until).getTime() > Date.now()
    )
    .map((entry: any) => entry.user_id)
    .filter(Boolean),
  unreadBy: Object.fromEntries(
    toArray(item.participants)
      .filter((entry: any) => entry.unread_count)
      .map((entry: any) => [entry.user_id, entry.unread_count])
  ),
  presence: {},
  updatedAt: pickDate(item, 'updated'),
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
  id: pickId(item),
  userId: item.user_id ?? extractId(item.recipient),
  type: notificationTypeMap[item.type] ?? 'message',
  title: item.title,
  body: item.body ?? item.message ?? '',
  entityType: item.entity_type ?? item.type,
  entityId:
    (item.entity_id ??
      (extractId(item.data?.conversationId) ||
        extractId(item.data?.projectId) ||
        extractId(item.data?.messageId))) ||
    undefined,
  isRead: item.is_read ?? Boolean(item.isRead),
  createdAt: pickDate(item),
});

export const mapReport = (item: any): Report => ({
  id: pickId(item),
  reporterId: item.reporter_id ?? extractId(item.reporter),
  targetType: item.target_type ?? item.targetType,
  targetId: item.target_id ?? item.targetId,
  reason: item.reason,
  description: item.description,
  status: item.status,
  createdAt: pickDate(item),
});

export const mapSetting = (item: any): Setting => ({
  id: pickId(item),
  key: item.key,
  label: item.label ?? item.key,
  value: typeof item.value === 'string' ? item.value : JSON.stringify(item.value),
  description: item.description ?? '',
  category: item.category ?? 'Platform',
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
  id: pickId(item),
  actorId: item.actor_id ?? extractId(item.actor),
  action: item.action,
  entityType: item.entity_type ?? item.targetType ?? 'entity',
  entityId: item.entity_id ?? item.targetId ?? '',
  details: typeof item.details === 'string' ? item.details : JSON.stringify(item.details ?? {}),
  createdAt: pickDate(item),
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
