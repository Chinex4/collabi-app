import React, { useMemo } from 'react';
import { ScrollView } from 'react-native';

import { AppButton, AppHeader, AppScreen, EmptyState, LoadingState } from '@/components/common';
import { TaskColumn } from '@/components/task';
import { db } from '@/data/mockDb';
import { useProjectTasks } from '@/hooks/useQueries';

export const ProjectTaskBoardScreen = ({ navigation, route }: any) => {
  const projectId = route.params.projectId as string;
  const tasksQuery = useProjectTasks(projectId);
  const project = db.projects.find((item) => item.id === projectId);
  const grouped = useMemo(() => {
    const tasks = tasksQuery.data ?? [];
    return {
      todo: tasks.filter((task) => task.status === 'todo'),
      in_progress: tasks.filter((task) => task.status === 'in_progress'),
      done: tasks.filter((task) => task.status === 'done'),
    };
  }, [tasksQuery.data]);

  return (
    <AppScreen>
      <AppHeader
        title="Project Task Board"
        subtitle={project?.title ?? 'Project'}
        right={
          <AppButton
            label="New Task"
            onPress={() => navigation.navigate('TaskForm', { projectId })}
          />
        }
      />
      {tasksQuery.isLoading ? <LoadingState label="Loading task board..." /> : null}
      {tasksQuery.data?.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TaskColumn
            title="Todo"
            tasks={grouped.todo}
            onSelect={(task) => navigation.navigate('TaskDetail', { taskId: task.id })}
          />
          <TaskColumn
            title="In Progress"
            tasks={grouped.in_progress}
            onSelect={(task) => navigation.navigate('TaskDetail', { taskId: task.id })}
          />
          <TaskColumn
            title="Done"
            tasks={grouped.done}
            onSelect={(task) => navigation.navigate('TaskDetail', { taskId: task.id })}
          />
        </ScrollView>
      ) : (
        <EmptyState
          title="No tasks yet"
          message="Create the first task so the team can track execution visibly."
          action={
            <AppButton
              label="Create Task"
              onPress={() => navigation.navigate('TaskForm', { projectId })}
            />
          }
        />
      )}
    </AppScreen>
  );
};
