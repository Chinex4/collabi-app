import React from 'react';
import { Pressable, View } from 'react-native';

import { AvatarStack, Badge, Chip, FilterPill, SectionHeader } from '@/components/common';
import { db } from '@/data/mockDb';
import { Project } from '@/types';
import { formatDate, getProjectStatusTone, getVisibilityLabel } from '@/utils/helpers';

export const ProjectStatusBadge = ({ status }: { status: Project['status'] }) => (
  <Badge label={status.replace('_', ' ')} tone={getProjectStatusTone(status)} />
);

export const MemberAvatarStack = ({ memberIds }: { memberIds: string[] }) => (
  <AvatarStack
    items={memberIds
      .map((memberId) => db.users.find((user) => user.id === memberId))
      .filter(Boolean)
      .map((user) => ({
        id: user!.id,
        name: user!.fullName,
        avatar: user!.avatar,
      }))}
  />
);

export const ProjectCard = ({ project, onPress }: { project: Project; onPress: () => void }) => {
  const category = db.categories.find((item) => item.id === project.categoryId)?.name ?? 'Category';
  const skillNames = project.requiredSkillIds
    .map((skillId) => db.skills.find((skill) => skill.id === skillId)?.name)
    .filter(Boolean) as string[];

  return (
    <Pressable onPress={onPress} className="mb-4 rounded-3xl bg-white p-5 shadow-sm">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <ProjectStatusBadge status={project.status} />
          <SectionHeader title={project.title} />
          <Chip label={category} />
        </View>
        <MemberAvatarStack memberIds={project.teamMemberIds} />
      </View>
      <Badge label={getVisibilityLabel(project.visibility)} tone="muted" />
      <View className="mt-3">
        <SectionHeader title="Overview" />
        <View>
          <Badge label={`Deadline ${formatDate(project.deadline)}`} tone="info" />
        </View>
      </View>
      <View className="mt-3 flex-row flex-wrap">
        {skillNames.slice(0, 4).map((skill) => (
          <Chip key={skill} label={skill} />
        ))}
      </View>
    </Pressable>
  );
};

export const ProjectDetailHeader = ({ project }: { project: Project }) => {
  const owner = db.users.find((user) => user.id === project.ownerId);

  return (
    <View className="rounded-[32px] bg-white p-5">
      <ProjectStatusBadge status={project.status} />
      <SectionHeader title={project.title} />
      <View className="flex-row flex-wrap gap-2">
        <Badge label={getVisibilityLabel(project.visibility)} tone="muted" />
        <Badge label={`Deadline ${formatDate(project.deadline)}`} tone="info" />
      </View>
      <View className="mt-4">
        <SectionHeader title="Description" />
        <View>
          <Badge label={`Owner ${owner?.fullName ?? 'Unknown'}`} tone="primary" />
        </View>
      </View>
    </View>
  );
};

export const ProjectFilters = ({
  active,
  onChange,
}: {
  active: string;
  onChange: (value: string) => void;
}) => (
  <View className="mb-4 flex-row">
    {['latest', 'deadline', 'team_size'].map((option) => (
      <FilterPill
        key={option}
        label={option === 'team_size' ? 'Team Size' : option[0].toUpperCase() + option.slice(1)}
        active={active === option}
        onPress={() => onChange(option)}
      />
    ))}
  </View>
);
