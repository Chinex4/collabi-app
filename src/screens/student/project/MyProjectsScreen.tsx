import React from 'react';
import { useQuery } from '@tanstack/react-query';

import { projectService } from '@/api/services/projectService';
import { LoadingState } from '@/components/common';
import { useSession } from '@/hooks/useSession';

import { ProjectListScreen } from './shared';

export const MyProjectsScreen = ({ navigation }: any) => {
  const { currentUser } = useSession();
  const projectsQuery = useQuery({
    queryKey: ['my-projects', currentUser?.id],
    queryFn: () => projectService.getMyProjects(currentUser!.id),
    enabled: Boolean(currentUser?.id),
  });

  if (projectsQuery.isLoading) {
    return <LoadingState label="Loading your projects..." />;
  }

  return (
    <ProjectListScreen
      title="My Projects"
      subtitle="Projects you own or currently contribute to."
      projects={projectsQuery.data ?? []}
      navigation={navigation}
    />
  );
};
