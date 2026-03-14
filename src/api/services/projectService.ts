import { db } from '@/data/mockDb';
import { Project, ProjectFilterInput, ProjectStatus } from '@/types';
import { generateId } from '@/utils/helpers';

import { recalcProjectMembers, requireProject, simulate } from './base';

export const projectService = {
  async getProjects(filters: ProjectFilterInput = {}, currentUserId?: string) {
    return simulate(() => {
      const page = filters.page ?? 1;
      const pageSize = filters.pageSize ?? 20;

      let items = db.projects.filter((project) => {
        const matchesSearch =
          !filters.search ||
          project.title.toLowerCase().includes(filters.search.toLowerCase()) ||
          project.description.toLowerCase().includes(filters.search.toLowerCase()) ||
          project.tags.some((tag) => tag.toLowerCase().includes(filters.search!.toLowerCase()));
        const matchesCategory = !filters.categoryId || project.categoryId === filters.categoryId;
        const matchesDepartment =
          !filters.departmentId || project.departmentId === filters.departmentId;
        const matchesFaculty = !filters.facultyId || project.facultyId === filters.facultyId;
        const matchesSkills =
          !filters.skillIds?.length ||
          filters.skillIds.every((skillId) => project.requiredSkillIds.includes(skillId));
        const matchesStatus = !filters.status || project.status === filters.status;
        const matchesVisibility = !filters.visibility || project.visibility === filters.visibility;
        const visibleToUser =
          project.visibility !== 'private' ||
          project.ownerId === currentUserId ||
          project.teamMemberIds.includes(currentUserId ?? '');

        return (
          matchesSearch &&
          matchesCategory &&
          matchesDepartment &&
          matchesFaculty &&
          matchesSkills &&
          matchesStatus &&
          matchesVisibility &&
          visibleToUser
        );
      });

      if (filters.sortBy === 'deadline') {
        items = items.sort((a, b) => a.deadline.localeCompare(b.deadline));
      } else if (filters.sortBy === 'team_size') {
        items = items.sort((a, b) => b.currentTeamSize - a.currentTeamSize);
      } else {
        items = items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      }

      const offset = (page - 1) * pageSize;
      return {
        items: items.slice(offset, offset + pageSize),
        total: items.length,
        page,
        pageSize,
      };
    });
  },
  async getProjectById(projectId: string) {
    return simulate(() => requireProject(projectId));
  },
  async createProject(
    ownerId: string,
    payload: Omit<
      Project,
      | 'id'
      | 'ownerId'
      | 'currentTeamSize'
      | 'teamMemberIds'
      | 'createdAt'
      | 'bookmarkedBy'
      | 'attachments'
    > & {
      tags: string[];
      attachments?: Project['attachments'];
    }
  ) {
    return simulate(() => {
      const project: Project = {
        id: generateId('project'),
        ownerId,
        currentTeamSize: 1,
        teamMemberIds: [ownerId],
        createdAt: new Date().toISOString(),
        bookmarkedBy: [],
        attachments: payload.attachments ?? [],
        ...payload,
      };

      db.projects.unshift(project);
      db.memberships.unshift({
        id: generateId('membership'),
        projectId: project.id,
        studentId: ownerId,
        roleName: 'Owner',
        status: 'active',
        joinedAt: new Date().toISOString(),
      });
      return project;
    }, 800);
  },
  async updateProject(projectId: string, payload: Partial<Project>) {
    return simulate(() => {
      const project = requireProject(projectId);
      Object.assign(project, payload);
      recalcProjectMembers(project);
      return project;
    }, 800);
  },
  async deleteProject(projectId: string) {
    return simulate(() => {
      const index = db.projects.findIndex((item) => item.id === projectId);
      if (index === -1) {
        throw new Error('Project not found');
      }

      db.projects.splice(index, 1);
      return { message: 'Project deleted' };
    }, 600);
  },
  async changeProjectStatus(projectId: string, status: ProjectStatus) {
    return simulate(() => {
      const project = requireProject(projectId);
      project.status = status;
      return project;
    });
  },
  async toggleBookmark(projectId: string, userId: string) {
    return simulate(() => {
      const project = requireProject(projectId);
      if (project.bookmarkedBy.includes(userId)) {
        project.bookmarkedBy = project.bookmarkedBy.filter((item) => item !== userId);
      } else {
        project.bookmarkedBy.push(userId);
      }

      return project;
    }, 300);
  },
  async getMyProjects(userId: string) {
    return simulate(() =>
      db.projects.filter(
        (project) => project.ownerId === userId || project.teamMemberIds.includes(userId)
      )
    );
  },
  async getSavedProjects(userId: string) {
    return simulate(() => db.projects.filter((project) => project.bookmarkedBy.includes(userId)));
  },
};
