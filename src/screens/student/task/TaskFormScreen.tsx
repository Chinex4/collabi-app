import { useMutation, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { View } from 'react-native';

import { taskService } from '@/api/services/taskService';
import { AppButton, AppHeader, AppScreen } from '@/components/common';
import {
  FormDatePicker,
  FormMultiSelect,
  FormSelect,
  FormTextArea,
  FormTextInput,
  useAppForm,
} from '@/components/forms';
import { QUERY_KEYS, TASK_PRIORITY_OPTIONS, TASK_STATUS_OPTIONS } from '@/constants';
import { db } from '@/data/mockDb';
import { useSession } from '@/hooks/useSession';
import { useAppDispatch } from '@/hooks/useAppStore';
import { showToast } from '@/store/uiSlice';
import { Task } from '@/types';
import { taskSchema } from '@/utils/validation';

type TaskFormValues = {
  title: string;
  description: string;
  assignedMemberIds: string[];
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in_progress' | 'done';
  dueDate: string;
  progress: number;
};

export const TaskFormScreen = ({ navigation, route }: any) => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { currentUser } = useSession();
  const projectId = route.params.projectId as string;
  const taskId = route.params?.taskId as string | undefined;
  const task = taskId ? db.tasks.find((item) => item.id === taskId) : undefined;
  const members = db.memberships
    .filter((membership) => membership.projectId === projectId && membership.status === 'active')
    .map((membership) => db.users.find((user) => user.id === membership.studentId))
    .filter(Boolean);

  const form = useAppForm<TaskFormValues>({
    defaultValues: {
      title: task?.title ?? '',
      description: task?.description ?? '',
      assignedMemberIds: task?.assignedMemberIds ?? [],
      priority: task?.priority ?? 'medium',
      status: task?.status ?? 'todo',
      dueDate: task?.dueDate ?? '',
      progress: task?.progress ?? 0,
    },
    schema: taskSchema,
  });

  const mutation = useMutation({
    mutationFn: (values: TaskFormValues) => {
      const payload = {
        ...values,
        progress: Number(values.progress),
        createdBy: task?.createdBy ?? currentUser!.id,
      };
      if (taskId) {
        return taskService.updateTask(taskId, payload as Partial<Task>);
      }
      return taskService.createTask(
        projectId,
        payload as Omit<Task, 'id' | 'projectId' | 'attachments' | 'comments'>
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks });
      dispatch(showToast({ type: 'success', message: taskId ? 'Task updated' : 'Task created' }));
      navigation.goBack();
    },
  });

  return (
    <AppScreen>
      <AppHeader
        title={taskId ? 'Edit Task' : 'Create Task'}
        subtitle="Break the project into visible, assigned pieces of work."
      />
      <View className="rounded-[32px] bg-white p-5">
        <FormTextInput
          control={form.control}
          name="title"
          label="Task Title"
          placeholder="Design dashboard flow"
        />
        <FormTextArea
          control={form.control}
          name="description"
          label="Description"
          placeholder="Describe the task deliverable."
        />
        <FormMultiSelect
          control={form.control}
          name="assignedMemberIds"
          label="Assignees"
          options={members.map((member) => ({ label: member!.fullName, value: member!.id }))}
        />
        <FormSelect
          control={form.control}
          name="priority"
          label="Priority"
          options={TASK_PRIORITY_OPTIONS}
        />
        <FormSelect
          control={form.control}
          name="status"
          label="Status"
          options={TASK_STATUS_OPTIONS}
        />
        <FormDatePicker control={form.control} name="dueDate" label="Due Date" />
        <FormTextInput
          control={form.control}
          name="progress"
          label="Progress"
          placeholder="0"
          keyboardType="numeric"
        />
        <AppButton
          label={taskId ? 'Save Task' : 'Create Task'}
          onPress={form.handleSubmit((values) => mutation.mutate(values))}
          loading={mutation.isPending}
        />
      </View>
    </AppScreen>
  );
};
