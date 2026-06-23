import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { adminService } from '@/api/services/adminService';
import { authService } from '@/api/services/authService';
import { chatService } from '@/api/services/chatService';
import { collaborationService } from '@/api/services/collaborationService';
import { lookupService } from '@/api/services/lookupService';
import { notificationService } from '@/api/services/notificationService';
import { profileService } from '@/api/services/profileService';
import { projectService } from '@/api/services/projectService';
import { reportService } from '@/api/services/reportService';
import { taskService } from '@/api/services/taskService';
import { QUERY_KEYS } from '@/constants';
import {
  AnalyticsMetrics,
  Announcement,
  Application,
  AuditLog,
  Conversation,
  Invitation,
  LookupBundle,
  Membership,
  Message,
  Notification,
  PaginatedResult,
  Project,
  Report,
  Setting,
  StudentProfile,
  Task,
  User,
} from '@/types';

type ProfileResult = { user: User; profile: StudentProfile };
type AdminDashboardResult = {
  analytics: AnalyticsMetrics;
  recentReports: Report[];
  announcements: Announcement[];
};

export const useLookups = () =>
  useQuery<LookupBundle>({ queryKey: QUERY_KEYS.lookups, queryFn: lookupService.getLookupBundle });

export const useProjects = (
  filters: Parameters<typeof projectService.getProjects>[0],
  currentUserId?: string
) =>
  useQuery<PaginatedResult<Project>>({
    queryKey: [...QUERY_KEYS.projects, filters, currentUserId],
    queryFn: () => projectService.getProjects(filters, currentUserId),
  });

export const useProjectDetail = (projectId: string) =>
  useQuery<Project>({
    queryKey: [...QUERY_KEYS.projects, projectId],
    queryFn: () => projectService.getProjectById(projectId),
    enabled: Boolean(projectId),
  });

export const useProfiles = (filters = {}) =>
  useQuery<ProfileResult[]>({
    queryKey: [...QUERY_KEYS.profiles, filters],
    queryFn: () => profileService.getProfiles(filters),
  });

export const useProfile = (userId?: string) =>
  useQuery<{ user: User | null; profile: StudentProfile }>({
    queryKey: [...QUERY_KEYS.profiles, userId],
    queryFn: () => profileService.getProfile(userId!),
    enabled: Boolean(userId),
  });

export const useNotifications = (userId?: string) =>
  useQuery<Notification[]>({
    queryKey: [...QUERY_KEYS.notifications, userId],
    queryFn: () => notificationService.getNotifications(userId!),
    enabled: Boolean(userId),
  });

export const useInbox = (userId?: string) =>
  useQuery<Conversation[]>({
    queryKey: [...QUERY_KEYS.conversations, userId],
    queryFn: () => chatService.getInbox(userId!),
    enabled: Boolean(userId),
  });

export const useMessages = (conversationId?: string) =>
  useQuery<Message[]>({
    queryKey: [...QUERY_KEYS.messages, conversationId],
    queryFn: () => chatService.getMessages(conversationId!),
    enabled: Boolean(conversationId),
  });

export const useMyTasks = (userId?: string) =>
  useQuery<Task[]>({
    queryKey: [...QUERY_KEYS.tasks, 'mine', userId],
    queryFn: () => taskService.getMyTasks(userId!),
    enabled: Boolean(userId),
  });

export const useProjectTasks = (projectId?: string) =>
  useQuery<Task[]>({
    queryKey: [...QUERY_KEYS.tasks, projectId],
    queryFn: () => taskService.getProjectTasks(projectId!),
    enabled: Boolean(projectId),
  });

export const useMyApplications = (userId?: string) =>
  useQuery<Application[]>({
    queryKey: [...QUERY_KEYS.applications, userId],
    queryFn: () => collaborationService.getMyApplications(userId!),
    enabled: Boolean(userId),
  });

export const useReceivedInvitations = (userId?: string) =>
  useQuery<Invitation[]>({
    queryKey: [...QUERY_KEYS.invitations, 'received', userId],
    queryFn: () => collaborationService.getReceivedInvitations(userId!),
    enabled: Boolean(userId),
  });

export const useSentInvitations = (userId?: string) =>
  useQuery<Invitation[]>({
    queryKey: [...QUERY_KEYS.invitations, 'sent', userId],
    queryFn: () => collaborationService.getSentInvitations(userId!),
    enabled: Boolean(userId),
  });

export const useProjectApplications = (projectId?: string) =>
  useQuery<Application[]>({
    queryKey: [...QUERY_KEYS.applications, projectId],
    queryFn: () => collaborationService.getProjectApplications(projectId!),
    enabled: Boolean(projectId),
  });

export const useTeamMembers = (projectId?: string) =>
  useQuery<Membership[]>({
    queryKey: [...QUERY_KEYS.memberships, projectId],
    queryFn: () => collaborationService.getTeamMembers(projectId!),
    enabled: Boolean(projectId),
  });

export const useMyReports = (userId?: string) =>
  useQuery<Report[]>({
    queryKey: [...QUERY_KEYS.reports, userId],
    queryFn: () => reportService.getMyReports(userId!),
    enabled: Boolean(userId),
  });

export const useAdminDashboard = () =>
  useQuery<AdminDashboardResult>({
    queryKey: QUERY_KEYS.adminDashboard,
    queryFn: adminService.getDashboard,
  });

export const useAdminUsers = (search = '') =>
  useQuery<User[]>({
    queryKey: [...QUERY_KEYS.adminUsers, search],
    queryFn: () => adminService.getUsers(search),
  });

export const useAdminProjects = (search = '') =>
  useQuery<Project[]>({
    queryKey: [...QUERY_KEYS.adminProjects, search],
    queryFn: () => adminService.getProjects(search),
  });

export const useAdminReports = () =>
  useQuery<Report[]>({
    queryKey: QUERY_KEYS.adminReports,
    queryFn: adminService.getReports,
  });

export const useAdminSettings = () =>
  useQuery<Setting[]>({
    queryKey: QUERY_KEYS.settings,
    queryFn: adminService.getSettings,
  });

export const useAdminAnnouncements = () =>
  useQuery<Announcement[]>({
    queryKey: QUERY_KEYS.announcements,
    queryFn: adminService.getAnnouncements,
  });

export const useAdminAuditLogs = () =>
  useQuery<AuditLog[]>({
    queryKey: QUERY_KEYS.auditLogs,
    queryFn: adminService.getAuditLogs,
  });

export const useBootstrapCurrentUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => authService.getCurrentUser(userId),
    onSuccess: (user) => {
      queryClient.setQueryData(QUERY_KEYS.currentUser, user);
    },
  });
};
