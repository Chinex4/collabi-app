import React, { useState } from 'react';
import { View } from 'react-native';

import {
  AppButton,
  AppHeader,
  AppScreen,
  AppText,
  Badge,
  EmptyState,
  LoadingState,
  SearchBar,
} from '@/components/common';
import { ProjectCard, ProjectFilters } from '@/components/project';
import { db } from '@/data/mockDb';
import { useProjects } from '@/hooks/useQueries';
import { useSession } from '@/hooks/useSession';

export const HomeScreen = ({ navigation }: any) => {
  const { currentUser } = useSession();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'latest' | 'deadline' | 'team_size'>('latest');
  const projects = useProjects({ search, sortBy }, currentUser?.id);
  const latestAnnouncement = db.announcements.find(
    (item) => item.audience === 'students' || item.audience === 'all'
  );

  return (
    <AppScreen>
      <AppHeader
        title="Discover Projects"
        subtitle="Find final year ideas, collaborators, and active teams around your faculty."
        right={
          <AppButton label="New Project" onPress={() => navigation.navigate('CreateProject')} />
        }
      />
      {latestAnnouncement ? (
        <View className="mb-5 rounded-[30px] bg-[#2C0B4E] p-5">
          <Badge label="Campus Announcement" tone="primary" />
          <AppText className="mt-3 text-xl font-bold text-white">
            {latestAnnouncement.title}
          </AppText>
          <AppText className="mt-2 text-sm leading-6 text-violet-100">
            {latestAnnouncement.body}
          </AppText>
        </View>
      ) : null}
      <View className="mb-4">
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search projects, tags, or descriptions"
        />
      </View>
      <ProjectFilters
        active={sortBy}
        onChange={(value) => setSortBy(value as 'latest' | 'deadline' | 'team_size')}
      />
      <View className="mb-5 flex-row flex-wrap gap-3">
        <AppButton
          label="Saved"
          onPress={() => navigation.navigate('SavedProjects')}
          variant="secondary"
        />
        <AppButton
          label="Applications"
          onPress={() => navigation.navigate('Applications')}
          variant="secondary"
        />
        <AppButton
          label="Invitations"
          onPress={() => navigation.navigate('Invitations')}
          variant="secondary"
        />
      </View>
      {projects.isLoading ? <LoadingState label="Loading projects..." /> : null}
      {projects.data?.items.length ? (
        projects.data.items.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onPress={() => navigation.navigate('ProjectDetail', { projectId: project.id })}
          />
        ))
      ) : (
        <EmptyState
          title="No projects found"
          message="Adjust the filters or create a fresh project brief to attract collaborators."
          action={
            <AppButton
              label="Create Project"
              onPress={() => navigation.navigate('CreateProject')}
            />
          }
        />
      )}
    </AppScreen>
  );
};
