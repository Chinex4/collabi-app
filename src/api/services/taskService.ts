import { cache } from '@/data/cache';
import { db } from '@/data/mockDb';
import { Task } from '@/types';

import { apiRequest } from '../http';
import { mapTask, mapTaskComment, mapUser } from '../mappers';

const syncTaskUsers = (task: any) => {
  task.assignedTo?.forEach((user: any) => {
    if (user && typeof user === 'object') {
      cache.syncUsers([mapUser(user)]);
    }
  });
  if (task.createdBy && typeof task.createdBy === 'object') {
    cache.syncUsers([mapUser(task.createdBy)]);
  }
};

export const taskService = {
  async getProjectTasks(projectId: string) {
    const response = await apiRequest<any[]>(`/tasks/project/${projectId}`, {
      auth: true,
    });

    const items = response.data.map((item) => {
      syncTaskUsers(item);
      return mapTask(item);
    });
    cache.replaceTasks(items);
    return items;
  },
  async getMyTasks(_userId: string) {
    const response = await apiRequest<any[]>('/tasks/my-assigned', {
      auth: true,
    });

    const items = response.data.map((item) => {
      syncTaskUsers(item);
      return mapTask(item);
    });
    cache.replaceTasks(items);
    return items;
  },
  async getTask(taskId: string) {
    const task = db.tasks.find((item) => item.id === taskId);
    if (!task) {
      throw new Error('Task not found');
    }
    return task;
  },
  async createTask(
    projectId: string,
    payload: Omit<Task, 'id' | 'projectId' | 'attachments' | 'comments'>
  ) {
    const response = await apiRequest<any>('/tasks', {
      method: 'POST',
      auth: true,
      json: {
        title: payload.title,
        project: projectId,
        description: payload.description,
        assignedTo: payload.assignedMemberIds,
        priority: payload.priority,
        status: payload.status,
        dueDate: payload.dueDate,
      },
    });

    syncTaskUsers(response.data);
    const task = mapTask(response.data);
    cache.syncTasks([task]);
    return task;
  },
  async updateTask(taskId: string, payload: Partial<Task>) {
    const response = await apiRequest<any>(`/tasks/${taskId}`, {
      method: 'PATCH',
      auth: true,
      json: {
        title: payload.title,
        description: payload.description,
        assignedTo: payload.assignedMemberIds,
        priority: payload.priority,
        status: payload.status,
        progress: payload.progress,
        dueDate: payload.dueDate,
        attachments: payload.attachments?.map((item) => item.id),
      },
    });

    syncTaskUsers(response.data);
    const task = mapTask(response.data);
    cache.syncTasks([task]);
    return task;
  },
  async deleteTask(taskId: string) {
    const response = await apiRequest(`/tasks/${taskId}`, {
      method: 'DELETE',
      auth: true,
    });

    cache.replaceTasks(db.tasks.filter((item) => item.id !== taskId));
    return { message: response.message };
  },
  async addComment(taskId: string, _authorId: string, body: string) {
    const response = await apiRequest<any>(`/tasks/${taskId}/comments`, {
      method: 'POST',
      auth: true,
      json: { content: body },
    });

    const comment = mapTaskComment(response.data);
    const task = db.tasks.find((item) => item.id === taskId);
    if (task) {
      cache.syncTasks([{ ...task, comments: [...task.comments, comment] }]);
    }
    return comment;
  },
  async updateComment(taskId: string, commentId: string, body: string) {
    const response = await apiRequest<any>(`/tasks/comments/${commentId}`, {
      method: 'PATCH',
      auth: true,
      json: { content: body },
    });

    const comment = mapTaskComment(response.data);
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
    await apiRequest(`/tasks/comments/${commentId}`, {
      method: 'DELETE',
      auth: true,
    });

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
