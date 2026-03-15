export type Role = 'student' | 'admin';

export type UserStatus = 'active' | 'suspended' | 'deleted';
export type ProjectStatus = 'open' | 'in_progress' | 'completed' | 'cancelled' | 'closed';
export type ProjectVisibility = 'public' | 'private' | 'department_only';
export type Availability = 'available' | 'busy' | 'unavailable';
export type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';
export type MembershipStatus = 'active' | 'left' | 'removed';
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';
export type PresenceStatus = 'online' | 'away' | 'offline';
export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed';
export type ReportTargetType = 'user' | 'project' | 'message';
export type NotificationType =
  | 'application'
  | 'invitation'
  | 'team'
  | 'task'
  | 'message'
  | 'mention'
  | 'announcement'
  | 'report';
export type AnnouncementAudience = 'all' | 'students' | 'admins';

export interface LookupItem {
  id: string;
  name: string;
}

export type Faculty = LookupItem;

export interface Department extends LookupItem {
  facultyId: string;
}

export interface Skill extends LookupItem {
  category?: string;
}

export type Interest = LookupItem;

export interface Category extends LookupItem {
  facultyId?: string;
}

export interface FileResource {
  id: string;
  name: string;
  url: string;
  type: string;
  sizeKb: number;
  uploadedAt: string;
  uploadedBy: string;
  context: 'profile' | 'project' | 'task' | 'chat' | 'general';
}

export interface User {
  id: string;
  role: Role;
  fullName: string;
  email: string;
  facultyId?: string;
  departmentId?: string;
  level?: string;
  avatar?: string;
  isVerified: boolean;
  status: UserStatus;
  password?: string;
  createdAt: string;
}

export interface StudentProfile {
  id?: string;
  userId: string;
  bio: string;
  skills: string[];
  interests: string[];
  availability: Availability;
  preferredRoles: string[];
  portfolioLinks: string[];
  visibility: 'public' | 'department_only' | 'private';
  photoUrl?: string;
  completedProjectsCount: number;
  activeProjectsCount: number;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  role: Role;
  userId: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  departmentId: string;
  facultyId: string;
  requiredSkillIds: string[];
  optionalSkillIds: string[];
  teamSizeLimit: number;
  currentTeamSize: number;
  deadline: string;
  visibility: ProjectVisibility;
  tags: string[];
  attachments: FileResource[];
  ownerId: string;
  teamMemberIds: string[];
  status: ProjectStatus;
  createdAt: string;
  bookmarkedBy: string[];
}

export interface Application {
  id: string;
  projectId: string;
  studentId: string;
  message: string;
  status: ApplicationStatus;
  createdAt: string;
}

export interface Invitation {
  id: string;
  projectId: string;
  studentId: string;
  senderId: string;
  message: string;
  status: InvitationStatus;
  createdAt: string;
}

export interface Membership {
  id: string;
  projectId: string;
  studentId: string;
  roleName: string;
  status: MembershipStatus;
  joinedAt: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  assignedMemberIds: string[];
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  progress: number;
  attachments: FileResource[];
  comments: TaskComment[];
  createdBy: string;
}

export interface Conversation {
  id: string;
  type: 'private' | 'project';
  participantIds: string[];
  projectId?: string;
  title: string;
  lastMessageId?: string;
  typingUserIds: string[];
  unreadBy: Record<string, number>;
  presence: Record<string, PresenceStatus>;
  updatedAt?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  attachments: FileResource[];
  createdAt: string;
  editedAt?: string;
  deletedAt?: string;
  readBy: string[];
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface Report {
  id: string;
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  description?: string;
  status: ReportStatus;
  createdAt: string;
}

export interface Setting {
  id: string;
  key: string;
  label: string;
  value: string;
  description: string;
  category: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  createdAt: string;
  createdBy: string;
  isSent: boolean;
}

export interface AuditLog {
  id: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  createdAt: string;
}

export interface AnalyticsMetrics {
  totalUsers: number;
  activeUsers: number;
  totalProjects: number;
  openProjects: number;
  completedProjects: number;
  teamFormationActivity: number;
  taskActivity: number;
  reportsOverview: number;
}

export interface AuthResponse {
  session: Session;
  user: User;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ProjectFilterInput {
  search?: string;
  categoryId?: string;
  departmentId?: string;
  facultyId?: string;
  skillIds?: string[];
  status?: ProjectStatus;
  visibility?: ProjectVisibility;
  sortBy?: 'latest' | 'deadline' | 'team_size';
  page?: number;
  pageSize?: number;
}

export interface ProfileFilterInput {
  search?: string;
  skillIds?: string[];
  interestIds?: string[];
  departmentId?: string;
  availability?: Availability;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export interface LookupBundle {
  faculties: Faculty[];
  departments: Department[];
  skills: Skill[];
  interests: Interest[];
  categories: Category[];
}
