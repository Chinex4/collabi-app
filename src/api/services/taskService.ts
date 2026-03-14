import { db } from '@/data/mockDb';
import { Task } from '@/types';
import { generateId } from '@/utils/helpers';

import { addNotification, requireProject, simulate } from './base';

export const taskService = {
  async getProjectTasks(projectId: string) {
    return simulate(() => db.tasks.filter((task) => task.projectId === projectId));
  },
  async getMyTasks(userId: string) {
    return simulate(() => db.tasks.filter((task) => task.assignedMemberIds.includes(userId)));
  },
  async getTask(taskId: string) {
    return simulate(() => {
      const task = db.tasks.find((item) => item.id === taskId);
      if (!task) {
        throw new Error('Task not found');
      }
      return task;
    });
  },
  async createTask(
    projectId: string,
    payload: Omit<Task, 'id' | 'projectId' | 'attachments' | 'comments'>
  ) {
    return simulate(() => {
      requireProject(projectId);
      const task: Task = {
        id: generateId('task'),
        projectId,
        attachments: [],
        comments: [],
        ...payload,
      };
      db.tasks.unshift(task);
      payload.assignedMemberIds.forEach((memberId) =>
        addNotification({
          userId: memberId,
          type: 'task',
          title: 'Task assigned',
          body: `You were assigned "${payload.title}".`,
          entityType: 'task',
          entityId: task.id,
          isRead: false,
        })
      );
      return task;
    }, 750);
  },
  async updateTask(taskId: string, payload: Partial<Task>) {
    return simulate(() => {
      const task = db.tasks.find((item) => item.id === taskId);
      if (!task) {
        throw new Error('Task not found');
      }
      Object.assign(task, payload);
      return task;
    }, 700);
  },
  async deleteTask(taskId: string) {
    return simulate(() => {
      const index = db.tasks.findIndex((item) => item.id === taskId);
      if (index === -1) {
        throw new Error('Task not found');
      }
      db.tasks.splice(index, 1);
      return { message: 'Task removed' };
    });
  },
  async addComment(taskId: string, authorId: string, body: string) {
    return simulate(() => {
      const task = db.tasks.find((item) => item.id === taskId);
      if (!task) {
        throw new Error('Task not found');
      }
      const comment = {
        id: generateId('task_comment'),
        taskId,
        authorId,
        body,
        createdAt: new Date().toISOString(),
      };
      task.comments.push(comment);
      return comment;
    }, 500);
  },
  async updateComment(taskId: string, commentId: string, body: string) {
    return simulate(() => {
      const task = db.tasks.find((item) => item.id === taskId);
      const comment = task?.comments.find((item) => item.id === commentId);
      if (!comment) {
        throw new Error('Comment not found');
      }
      comment.body = body;
      comment.updatedAt = new Date().toISOString();
      return comment;
    });
  },
  async deleteComment(taskId: string, commentId: string) {
    return simulate(() => {
      const task = db.tasks.find((item) => item.id === taskId);
      if (!task) {
        throw new Error('Task not found');
      }
      task.comments = task.comments.filter((comment) => comment.id !== commentId);
      return { success: true };
    });
  },
};
