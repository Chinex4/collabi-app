import { Availability, ProjectStatus, ProjectVisibility, TaskPriority, TaskStatus } from '@/types';

export const APP_NAME = 'Collabi';
export const PRIMARY_COLOR = '#7921BF';
export const SECONDARY_COLOR = '#2C0B4E';
export const SUCCESS_COLOR = '#1E9E63';
export const WARNING_COLOR = '#EFA72C';
export const DANGER_COLOR = '#D64550';
export const SURFACE_COLOR = '#F7F2FC';

export const STORAGE_KEYS = {
  session: 'collabi.session',
  role: 'collabi.role',
} as const;

export const OTP_LENGTH = 6;

export const LEVEL_OPTIONS = ['200', '300', '400', '500', 'Postgraduate'];
export const PREFERRED_ROLES = [
  'Frontend Developer',
  'Backend Developer',
  'Research Lead',
  'UI/UX Designer',
  'Data Analyst',
  'Product Manager',
];

export const AVAILABILITY_OPTIONS: { label: string; value: Availability }[] = [
  { label: 'Part-time', value: 'part_time' },
  { label: 'Weekends', value: 'weekends' },
  { label: 'Full-time', value: 'full_time' },
  { label: 'Flexible', value: 'flexible' },
];

export const PROJECT_STATUS_OPTIONS: { label: string; value: ProjectStatus }[] = [
  { label: 'Open', value: 'open' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'Closed', value: 'closed' },
];

export const VISIBILITY_OPTIONS: { label: string; value: ProjectVisibility }[] = [
  { label: 'Public', value: 'public' },
  { label: 'Private', value: 'private' },
  { label: 'Department Only', value: 'department_only' },
];

export const TASK_PRIORITY_OPTIONS: { label: string; value: TaskPriority }[] = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
];

export const TASK_STATUS_OPTIONS: { label: string; value: TaskStatus }[] = [
  { label: 'Todo', value: 'todo' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Done', value: 'done' },
];

export const REPORT_REASONS = [
  'Spam or fraudulent activity',
  'Harassment or abuse',
  'Plagiarism',
  'Off-topic or misleading project',
  'Inappropriate message',
];

export const QUERY_KEYS = {
  session: ['session'],
  currentUser: ['current-user'],
  lookups: ['lookups'],
  profiles: ['profiles'],
  projects: ['projects'],
  savedProjects: ['saved-projects'],
  applications: ['applications'],
  invitations: ['invitations'],
  memberships: ['memberships'],
  tasks: ['tasks'],
  conversations: ['conversations'],
  messages: ['messages'],
  notifications: ['notifications'],
  reports: ['reports'],
  adminDashboard: ['admin-dashboard'],
  adminUsers: ['admin-users'],
  adminProjects: ['admin-projects'],
  adminReports: ['admin-reports'],
  settings: ['settings'],
  announcements: ['announcements'],
  auditLogs: ['audit-logs'],
} as const;
