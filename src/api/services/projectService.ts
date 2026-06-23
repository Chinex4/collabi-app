import { cache } from '@/data/cache';
import { db } from '@/data/mockDb';
import { PaginatedResult, Project, ProjectFilterInput, ProjectStatus } from '@/types';

import { requireData, throwIfSupabaseError } from '../errors';
import { mapCategory, mapDepartment, mapFaculty, mapProject, mapSkill, mapUser } from '../mappers';
import { supabase } from '../supabase';

const supabaseAny = supabase as any;

const projectSelect = `
  *,
  owner:users(*),
  category:categories(*),
  faculty:faculties(*),
  department:departments(*),
  required_skills:project_required_skills(skill:skills(*)),
  optional_skills:project_optional_skills(skill:skills(*)),
  bookmarks:project_bookmarks(user_id),
  memberships(*)
`;

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
  (raw.required_skills ?? []).forEach((entry: any) => {
    if (entry.skill && typeof entry.skill === 'object') {
      cache.replaceLookups({ skills: [mapSkill(entry.skill)] });
    }
  });
  (raw.optional_skills ?? []).forEach((entry: any) => {
    if (entry.skill && typeof entry.skill === 'object') {
      cache.replaceLookups({ skills: [mapSkill(entry.skill)] });
    }
  });
};

const mapProjectList = (items: any[], currentUserId?: string) =>
  items.map((item) => {
    syncProjectDependencies(item);
    return mapProject(item, currentUserId);
  });

export const projectService = {
  async getProjects(
    filters: ProjectFilterInput = {},
    currentUserId?: string
  ): Promise<PaginatedResult<Project>> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase.from('projects').select(projectSelect, { count: 'exact' }).range(from, to);

    if (filters.search) {
      query = query.ilike('title', `%${filters.search}%`);
    }
    if (filters.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }
    if (filters.departmentId) {
      query = query.eq('department_id', filters.departmentId);
    }
    if (filters.facultyId) {
      query = query.eq('faculty_id', filters.facultyId);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.visibility) {
      query = query.eq('visibility', filters.visibility);
    }

    if (filters.sortBy === 'deadline') {
      query = query.order('deadline', { ascending: true });
    } else if (filters.sortBy === 'team_size') {
      query = query.order('max_team_size', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error, count } = await query;
    throwIfSupabaseError(error);

    const items = mapProjectList(data ?? [], currentUserId).filter((project) => {
      if (
        filters.skillIds?.length &&
        !filters.skillIds.some(
          (skillId) =>
            project.requiredSkillIds.includes(skillId) || project.optionalSkillIds.includes(skillId)
        )
      ) {
        return false;
      }
      return true;
    });

    cache.syncProjects(items);

    return {
      items,
      total: count ?? items.length,
      page,
      pageSize,
    };
  },
  async getProjectById(projectId: string) {
    const { data, error } = await supabase
      .from('projects')
      .select(projectSelect)
      .eq('id', projectId)
      .single();

    throwIfSupabaseError(error);
    syncProjectDependencies(requireData(data));

    const project = mapProject(data);
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
    const { data, error } = await supabaseAny.rpc('create_project_with_skills', {
      p_title: payload.title,
      p_description: payload.description,
      p_category_id: payload.categoryId,
      p_department_id: payload.departmentId,
      p_faculty_id: payload.facultyId,
      p_required_skill_ids: payload.requiredSkillIds,
      p_optional_skill_ids: payload.optionalSkillIds,
      p_max_team_size: payload.teamSizeLimit,
      p_deadline: payload.deadline,
      p_visibility: payload.visibility,
      p_tags: payload.tags,
    });

    throwIfSupabaseError(error);
    return this.getProjectById(requireData(data, 'Project was not created'));
  },
  async updateProject(projectId: string, payload: Partial<Project>) {
    const { error } = await supabaseAny
      .from('projects')
      .update({
        title: payload.title,
        description: payload.description,
        category_id: payload.categoryId,
        department_id: payload.departmentId,
        faculty_id: payload.facultyId,
        max_team_size: payload.teamSizeLimit,
        deadline: payload.deadline,
        status: payload.status,
        visibility: payload.visibility,
        tags: payload.tags,
      })
      .eq('id', projectId);

    throwIfSupabaseError(error);
    return this.getProjectById(projectId);
  },
  async deleteProject(projectId: string) {
    const { error } = await supabaseAny.from('projects').delete().eq('id', projectId);
    throwIfSupabaseError(error);

    cache.replaceProjects(db.projects.filter((item) => item.id !== projectId));
    return { message: 'Project deleted' };
  },
  async changeProjectStatus(projectId: string, status: ProjectStatus) {
    const { error } = await supabaseAny.from('projects').update({ status }).eq('id', projectId);
    throwIfSupabaseError(error);

    return this.getProjectById(projectId);
  },
  async toggleBookmark(projectId: string, userId: string) {
    const { data: existing, error: readError } = await supabase
      .from('project_bookmarks')
      .select('project_id')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .maybeSingle();

    throwIfSupabaseError(readError);

    if (existing) {
      const { error } = await supabaseAny
        .from('project_bookmarks')
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', userId);
      throwIfSupabaseError(error);
    } else {
      const { error } = await supabaseAny
        .from('project_bookmarks')
        .insert({ project_id: projectId, user_id: userId });
      throwIfSupabaseError(error);
    }

    return this.getProjectById(projectId);
  },
  async getMyProjects(userId: string) {
    const { data, error } = await supabase
      .from('projects')
      .select(projectSelect)
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    throwIfSupabaseError(error);

    const items = mapProjectList(data ?? [], userId);
    cache.syncProjects(items);
    return items;
  },
  async getSavedProjects(userId: string) {
    const { data: bookmarks, error: bookmarkError } = await supabase
      .from('project_bookmarks')
      .select('project_id')
      .eq('user_id', userId);

    throwIfSupabaseError(bookmarkError);

    const projectIds = ((bookmarks ?? []) as { project_id: string }[]).map(
      (bookmark) => bookmark.project_id
    );
    if (!projectIds.length) {
      return [];
    }

    const { data, error } = await supabase
      .from('projects')
      .select(projectSelect)
      .in('id', projectIds)
      .order('created_at', { ascending: false });

    throwIfSupabaseError(error);

    const items = mapProjectList(data ?? [], userId);
    cache.syncProjects(items);
    return items;
  },
};
