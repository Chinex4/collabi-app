import { useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { View } from 'react-native';

import { taskService } from '@/api/services/taskService';
import {
  AppButton,
  AppHeader,
  AppInput,
  AppScreen,
  AppText,
  EmptyState,
  SectionHeader,
} from '@/components/common';
import { ProgressBar, TaskCommentItem } from '@/components/task';
import { QUERY_KEYS } from '@/constants';
import { db } from '@/data/mockDb';
import { useSession } from '@/hooks/useSession';
import { useAppDispatch } from '@/hooks/useAppStore';
import { showToast } from '@/store/uiSlice';
import { formatDate } from '@/utils/helpers';

export const TaskDetailScreen = ({ navigation, route }: any) => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { currentUser } = useSession();
  const taskId = route.params.taskId as string;
  const task = db.tasks.find((item) => item.id === taskId);
  const [comment, setComment] = useState('');

  const commentMutation = useMutation({
    mutationFn: () => taskService.addComment(taskId, currentUser!.id, comment),
    onSuccess: () => {
      setComment('');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks });
      dispatch(showToast({ type: 'success', message: 'Comment added' }));
    },
  });

  const progressMutation = useMutation({
    mutationFn: (progress: number) => taskService.updateTask(taskId, { progress }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks }),
  });

  if (!task) {
    return (
      <AppScreen>
        <EmptyState title="Task not found" message="The selected task may have been removed." />
      </AppScreen>
    );
  }

  const assignees = task.assignedMemberIds
    .map((memberId) => db.users.find((user) => user.id === memberId)?.fullName)
    .filter(Boolean)
    .join(', ');

  return (
    <AppScreen>
      <AppHeader
        title="Task Detail"
        subtitle={task.title}
        right={
          <AppButton
            label="Edit"
            onPress={() => navigation.navigate('TaskForm', { projectId: task.projectId, taskId })}
            variant="secondary"
          />
        }
      />
      <View className="rounded-[32px] bg-white p-5">
        <AppText className="text-sm leading-7 text-slate-600">{task.description}</AppText>
        <SectionHeader title="Assignees" />
        <AppText className="text-sm text-slate-500">{assignees}</AppText>
        <SectionHeader title="Progress" />
        <ProgressBar value={task.progress} />
        <AppText className="mt-2 text-sm text-slate-500">
          {task.progress}% complete • Due {formatDate(task.dueDate)}
        </AppText>
        <View className="mt-4 flex-row flex-wrap gap-3">
          {[25, 50, 75, 100].map((value) => (
            <AppButton
              key={value}
              label={`${value}%`}
              onPress={() => progressMutation.mutate(value)}
              variant="secondary"
            />
          ))}
        </View>
      </View>
      <View className="mt-4 rounded-[32px] bg-white p-5">
        <SectionHeader title="Comments" />
        {task.comments.length ? (
          task.comments.map((item) => (
            <TaskCommentItem
              key={item.id}
              authorName={db.users.find((user) => user.id === item.authorId)?.fullName ?? 'User'}
              body={item.body}
              timestamp={item.updatedAt ?? item.createdAt}
            />
          ))
        ) : (
          <EmptyState
            title="No comments yet"
            message="Use comments to keep execution details in one place."
          />
        )}
        <View className="mt-3">
          <AppInput
            value={comment}
            onChangeText={setComment}
            placeholder="Add a task comment"
            multiline
          />
          <AppButton
            label="Post Comment"
            onPress={() => commentMutation.mutate()}
            className="mt-3"
            disabled={!comment.trim()}
          />
        </View>
      </View>
    </AppScreen>
  );
};
