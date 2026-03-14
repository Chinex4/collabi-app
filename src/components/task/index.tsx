import React from 'react';
import { Pressable, View } from 'react-native';

import { AppText, AvatarStack, Badge } from '@/components/common';
import { db } from '@/data/mockDb';
import { Task } from '@/types';
import { formatDate, getTaskPriorityTone, getTaskStatusLabel } from '@/utils/helpers';

export const ProgressBar = ({ value }: { value: number }) => (
  <View className="mt-2 h-2 rounded-full bg-violet-100">
    <View className="h-2 rounded-full bg-[#7921BF]" style={{ width: `${Math.min(value, 100)}%` }} />
  </View>
);

export const TaskCard = ({ task, onPress }: { task: Task; onPress?: () => void }) => (
  <Pressable onPress={onPress} className="mb-3 rounded-3xl bg-white p-4">
    <View className="flex-row items-start justify-between">
      <View className="flex-1 pr-2">
        <AppText className="text-base font-semibold text-slate-900">{task.title}</AppText>
        <AppText className="mt-1 text-sm text-slate-500">{task.description}</AppText>
      </View>
      <Badge label={task.priority} tone={getTaskPriorityTone(task.priority)} />
    </View>
    <View className="mt-3 flex-row items-center justify-between">
      <Badge label={getTaskStatusLabel(task.status)} tone="info" />
      <AppText className="text-xs text-slate-500">Due {formatDate(task.dueDate)}</AppText>
    </View>
    <ProgressBar value={task.progress} />
    <View className="mt-3">
      <AvatarStack
        items={task.assignedMemberIds
          .map((memberId) => db.users.find((user) => user.id === memberId))
          .filter(Boolean)
          .map((user) => ({ id: user!.id, name: user!.fullName, avatar: user!.avatar }))}
      />
    </View>
  </Pressable>
);

export const TaskColumn = ({
  title,
  tasks,
  onSelect,
}: {
  title: string;
  tasks: Task[];
  onSelect: (task: Task) => void;
}) => (
  <View className="mr-4 w-[290px] rounded-[28px] bg-violet-50 p-4">
    <AppText className="mb-3 text-base font-semibold text-slate-900">{title}</AppText>
    {tasks.map((task) => (
      <TaskCard key={task.id} task={task} onPress={() => onSelect(task)} />
    ))}
  </View>
);

export const TaskCommentItem = ({
  authorName,
  body,
  timestamp,
}: {
  authorName: string;
  body: string;
  timestamp: string;
}) => (
  <View className="mb-3 rounded-2xl bg-violet-50 p-3">
    <AppText className="text-sm font-semibold text-slate-900">{authorName}</AppText>
    <AppText className="mt-1 text-sm text-slate-600">{body}</AppText>
    <AppText className="mt-2 text-xs text-slate-400">
      {formatDate(timestamp, 'DD MMM, HH:mm')}
    </AppText>
  </View>
);
