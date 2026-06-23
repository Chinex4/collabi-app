import { cache } from '@/data/cache';
import { db } from '@/data/mockDb';
import { FileResource, Task } from '@/types';

import { requireData, throwIfSupabaseError } from '../errors';
import { mapTask, mapTaskComment } from '../mappers';
import { supabase } from '../supabase';

const supabaseAny = supabase as any;

const taskSelect = `
  *,
  assignees:task_assignees(*, member:memberships(*)),
  comments:task_comments(*),
  attachments:task_attachments(*)
`;

const syncTask = (row: any) => {
  const task = mapTask(row);
  cache.syncTasks([task]);
  return task;
};

const replaceTaskAttachments = async (taskId: string, attachments: FileResource[]) => {
  const { error: deleteError } = await supabaseAny
    .from('task_attachments')
    .delete()
    .eq('task_id', taskId);
  throwIfSupabaseError(deleteError);

  if (!attachments.length) {
    return;
  }

  const { error } = await supabaseAny.from('task_attachments').insert(
    attachments.map((file) => ({
      id: file.id,
      task_id: taskId,
      bucket_id: 'cloudinary',
      object_path: file.url,
      name: file.name,
      mime_type: file.type,
      size_kb: file.sizeKb,
      uploaded_by: file.uploadedBy,
    }))
  );
  throwIfSupabaseError(error);
};

export const taskService = {
  async getProjectTasks(projectId: string) {
    const { data, error } = await supabaseAny
      .from('tasks')
      .select(taskSelect)
      .eq('project_id', projectId)
      .order('due_date', { ascending: true });

    throwIfSupabaseError(error);

    const items = (data ?? []).map(mapTask);
    cache.replaceTasks(items);
    return items;
  },
  async getMyTasks(userId: string) {
    const { data: memberships, error: membershipError } = await supabaseAny
      .from('memberships')
      .select('id')
      .eq('student_id', userId)
      .eq('status', 'active');

    throwIfSupabaseError(membershipError);

    const memberIds = ((memberships ?? []) as { id: string }[]).map((item) => item.id);
    if (!memberIds.length) {
      cache.replaceTasks([]);
      return [];
    }

    const { data: assignees, error: assigneeError } = await supabaseAny
      .from('task_assignees')
      .select('task_id')
      .in('member_id', memberIds);

    throwIfSupabaseError(assigneeError);

    const taskIds = Array.from(
      new Set(((assignees ?? []) as { task_id: string }[]).map((item) => item.task_id))
    );
    if (!taskIds.length) {
      cache.replaceTasks([]);
      return [];
    }

    const { data, error } = await supabaseAny
      .from('tasks')
      .select(taskSelect)
      .in('id', taskIds)
      .order('due_date', { ascending: true });

    throwIfSupabaseError(error);

    const items = (data ?? []).map(mapTask);
    cache.replaceTasks(items);
    return items;
  },
  async getTask(taskId: string) {
    const { data, error } = await supabaseAny
      .from('tasks')
      .select(taskSelect)
      .eq('id', taskId)
      .single();

    throwIfSupabaseError(error);
    return syncTask(requireData(data, 'Task not found'));
  },
  async createTask(
    projectId: string,
    payload: Omit<Task, 'id' | 'projectId' | 'attachments' | 'comments'>
  ) {
    const { data, error } = await supabaseAny
      .from('tasks')
      .insert({
        project_id: projectId,
        title: payload.title,
        description: payload.description,
        priority: payload.priority,
        status: payload.status,
        due_date: payload.dueDate,
        progress: payload.progress,
        created_by: payload.createdBy,
      })
      .select('*')
      .single();

    throwIfSupabaseError(error);

    if (payload.assignedMemberIds.length) {
      const { error: assigneeError } = await supabaseAny.from('task_assignees').insert(
        payload.assignedMemberIds.map((memberId) => ({
          task_id: data.id,
          member_id: memberId,
        }))
      );
      throwIfSupabaseError(assigneeError);
    }

    return this.getTask(data.id);
  },
  async updateTask(taskId: string, payload: Partial<Task>) {
    const { error } = await supabaseAny
      .from('tasks')
      .update({
        title: payload.title,
        description: payload.description,
        priority: payload.priority,
        status: payload.status,
        progress: payload.progress,
        due_date: payload.dueDate,
      })
      .eq('id', taskId);

    throwIfSupabaseError(error);

    if (payload.assignedMemberIds) {
      const { error: deleteError } = await supabaseAny
        .from('task_assignees')
        .delete()
        .eq('task_id', taskId);
      throwIfSupabaseError(deleteError);

      if (payload.assignedMemberIds.length) {
        const { error: assigneeError } = await supabaseAny.from('task_assignees').insert(
          payload.assignedMemberIds.map((memberId) => ({
            task_id: taskId,
            member_id: memberId,
          }))
        );
        throwIfSupabaseError(assigneeError);
      }
    }

    if (payload.attachments) {
      await replaceTaskAttachments(taskId, payload.attachments);
    }

    return this.getTask(taskId);
  },
  async deleteTask(taskId: string) {
    const { error } = await supabaseAny.from('tasks').delete().eq('id', taskId);
    throwIfSupabaseError(error);

    cache.replaceTasks(db.tasks.filter((item) => item.id !== taskId));
    return { message: 'Task deleted' };
  },
  async addComment(taskId: string, authorId: string, body: string) {
    const { data, error } = await supabaseAny
      .from('task_comments')
      .insert({ task_id: taskId, author_id: authorId, body })
      .select('*')
      .single();

    throwIfSupabaseError(error);

    const comment = mapTaskComment(data);
    const task = db.tasks.find((item) => item.id === taskId);
    if (task) {
      cache.syncTasks([{ ...task, comments: [...task.comments, comment] }]);
    }
    return comment;
  },
  async updateComment(taskId: string, commentId: string, body: string) {
    const { data, error } = await supabaseAny
      .from('task_comments')
      .update({ body })
      .eq('id', commentId)
      .select('*')
      .single();

    throwIfSupabaseError(error);

    const comment = mapTaskComment(data);
    const task = db.tasks.find((item) => item.id === taskId);
    if (task) {
      cache.syncTasks([
        {
          ...task,
          comments: task.comments.map((item) => (item.id === commentId ? comment : item)),
        },
      ]);
    }
    return comment;
  },
  async deleteComment(taskId: string, commentId: string) {
    const { error } = await supabaseAny.from('task_comments').delete().eq('id', commentId);
    throwIfSupabaseError(error);

    const task = db.tasks.find((item) => item.id === taskId);
    if (task) {
      cache.syncTasks([
        {
          ...task,
          comments: task.comments.filter((item) => item.id !== commentId),
        },
      ]);
    }
    return { success: true };
  },
};
