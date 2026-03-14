import React from 'react';

import { AppHeader, AppScreen, EmptyState, LoadingState } from '@/components/common';
import { TaskCard } from '@/components/task';
import { useMyTasks } from '@/hooks/useQueries';
import { useSession } from '@/hooks/useSession';

export const MyTasksScreen = ({ navigation }: any) => {
  const { currentUser } = useSession();
  const tasksQuery = useMyTasks(currentUser?.id);

  return (
    <AppScreen>
      <AppHeader
        title="My Tasks"
        subtitle="Stay on top of deliverables assigned across all your active project teams."
      />
      {tasksQuery.isLoading ? <LoadingState label="Loading your tasks..." /> : null}
      {tasksQuery.data?.length ? (
        tasksQuery.data.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
          />
        ))
      ) : (
        <EmptyState
          title="No assigned tasks"
          message="As project owners start assigning work, your board will fill in here."
        />
      )}
    </AppScreen>
  );
};
