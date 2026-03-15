import { cache } from '@/data/cache';
import { db } from '@/data/mockDb';
import { PaginatedResult, Project, ProjectFilterInput, ProjectStatus } from '@/types';

import { apiRequest } from '../http';
import { mapCategory, mapDepartment, mapFaculty, mapProject, mapSkill, mapUser } from '../mappers';

const syncProjectDependencies = (raw: any) => {
  if (raw.owner && typeof raw.owner === 'object') {
    cache.syncUsers([mapUser(raw.owner)]);
  }
  if (raw.category && typeof raw.category === 'object') {
    cache.replaceLookups({ categories: [mapCategory(raw.category)] });
  }
  if (raw.faculty && typeof raw.faculty === 'object') {
    cache.replaceLookups({ faculties: [mapFaculty(raw.faculty)] });
  }
  if (raw.department && typeof raw.department === 'object') {
    cache.replaceLookups({ departments: [mapDepartment(raw.department)] });
  }
  raw.requiredSkills?.forEach((skill: any) => {
    if (skill && typeof skill === 'object') {
      cache.replaceLookups({ skills: [mapSkill(skill)] });
    }
  });
  raw.optionalSkills?.forEach((skill: any) => {
    if (skill && typeof skill === 'object') {
      cache.replaceLookups({ skills: [mapSkill(skill)] });
    }
  });
};

const preserveProjectState = (project: Project, currentUserId?: string) => {
  const existing = db.projects.find((item) => item.id === project.id);
  return {
    ...project,
    teamMemberIds: existing?.teamMemberIds?.length ? existing.teamMemberIds : project.teamMemberIds,
    bookmarkedBy:
      existing?.bookmarkedBy?.length || currentUserId
        ? Array.from(new Set([...(existing?.bookmarkedBy ?? []), ...(project.bookmarkedBy ?? [])]))
        : [],
  };
};

const mapProjectList = (items: any[], currentUserId?: string) =>
  items.map((item) => {
    syncProjectDependencies(item);
    return preserveProjectState(mapProject(item, currentUserId), currentUserId);
  });

export const projectService = {
  async getProjects(filters: ProjectFilterInput = {}, currentUserId?: string): Promise<PaginatedResult<Project>> {
    const response = await apiRequest<any[]>('/projects', {
      auth: Boolean(currentUserId),
      query: {
        page: filters.page,
        limit: filters.pageSize,
        search: filters.search,
        category: filters.categoryId,
        department: filters.departmentId,
        requiredSkill: filters.skillIds?.[0],
        status: filters.status,
        visibility: filters.visibility,
        sort:
          filters.sortBy === 'latest'
            ? 'recent'
            : filters.sortBy === 'team_size'
              ? 'relevance'
              : filters.sortBy,
      },
    });

    const items = mapProjectList(response.data, currentUserId);
    cache.syncProjects(items);

    const meta = (response.meta as any) ?? {};
    return {
      items,
      total: meta.total ?? items.length,
      page: meta.page ?? filters.page ?? 1,
      pageSize: meta.limit ?? filters.pageSize ?? items.length,
    };
  },
  async getProjectById(projectId: string) {
    const response = await apiRequest<any>(`/projects/${projectId}`);
    syncProjectDependencies(response.data);
    const project = preserveProjectState(mapProject(response.data));
    cache.syncProjects([project]);
    return project;
  },
  async createProject(
    _ownerId: string,
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
    const response = await apiRequest<any>('/projects', {
      method: 'POST',
      auth: true,
      json: {
        title: payload.title,
        description: payload.description,
        category: payload.categoryId,
        department: payload.departmentId,
        faculty: payload.facultyId,
        requiredSkills: payload.requiredSkillIds,
        optionalSkills: payload.optionalSkillIds,
        maxTeamSize: payload.teamSizeLimit,
        deadline: payload.deadline,
        visibility: payload.visibility,
        tags: payload.tags,
      },
    });

    syncProjectDependencies(response.data);
    const project = preserveProjectState(mapProject(response.data));
    cache.syncProjects([project]);
    return project;
  },
  async updateProject(projectId: string, payload: Partial<Project>) {
    const response = await apiRequest<any>(`/projects/${projectId}`, {
      method: 'PATCH',
      auth: true,
      json: {
        title: payload.title,
        description: payload.description,
        category: payload.categoryId,
        department: payload.departmentId,
        faculty: payload.facultyId,
        requiredSkills: payload.requiredSkillIds,
        optionalSkills: payload.optionalSkillIds,
        maxTeamSize: payload.teamSizeLimit,
        deadline: payload.deadline,
        status: payload.status,
        visibility: payload.visibility,
        tags: payload.tags,
      },
    });

    syncProjectDependencies(response.data);
    const project = preserveProjectState(mapProject(response.data));
    cache.syncProjects([project]);
    return project;
  },
  async deleteProject(projectId: string) {
    const response = await apiRequest(`/projects/${projectId}`, {
      method: 'DELETE',
      auth: true,
    });

    cache.replaceProjects(db.projects.filter((item) => item.id !== projectId));
    return { message: response.message };
  },
  async changeProjectStatus(projectId: string, status: ProjectStatus) {
    const response = await apiRequest<any>(`/projects/${projectId}/status`, {
      method: 'PATCH',
      auth: true,
      json: { status },
    });

    const project = preserveProjectState(mapProject(response.data));
    cache.syncProjects([project]);
    return project;
  },
  async toggleBookmark(projectId: string, userId: string) {
    const existing = db.projects.find((item) => item.id === projectId);
    const isSaved = existing?.bookmarkedBy.includes(userId);
    await apiRequest(`/projects/${projectId}/bookmark`, {
      method: isSaved ? 'DELETE' : 'POST',
      auth: true,
    });

    const nextBookmarkedBy = isSaved
      ? (existing?.bookmarkedBy ?? []).filter((item) => item !== userId)
      : Array.from(new Set([...(existing?.bookmarkedBy ?? []), userId]));
    const updated = { ...(existing ?? { id: projectId }), bookmarkedBy: nextBookmarkedBy } as Project;
    cache.syncProjects([updated]);
    return updated;
  },
  async getMyProjects(_userId: string) {
    const response = await apiRequest<any[]>('/projects/mine', {
      auth: true,
    });

    const items = mapProjectList(response.data);
    cache.syncProjects(items);
    return items;
  },
  async getSavedProjects(userId: string) {
    const response = await apiRequest<any[]>('/projects/saved', {
      auth: true,
    });

    const items = mapProjectList(response.data, userId).map((item) => ({
      ...item,
      bookmarkedBy: Array.from(new Set([...(item.bookmarkedBy ?? []), userId])),
    }));
    cache.syncProjects(items);
    return items;
  },
};
