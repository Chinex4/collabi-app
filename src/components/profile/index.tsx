import React from 'react';
import { Pressable, View } from 'react-native';

import { AppText, Avatar, Badge, Chip } from '@/components/common';
import { db } from '@/data/mockDb';
import { StudentProfile, User } from '@/types';

export const SkillChipList = ({ skillIds }: { skillIds: string[] }) => (
  <View className="flex-row flex-wrap">
    {skillIds.map((skillId) => (
      <Chip
        key={skillId}
        label={db.skills.find((skill) => skill.id === skillId)?.name ?? skillId}
      />
    ))}
  </View>
);

export const InterestChipList = ({ interestIds }: { interestIds: string[] }) => (
  <View className="flex-row flex-wrap">
    {interestIds.map((interestId) => (
      <Chip
        key={interestId}
        label={db.interests.find((interest) => interest.id === interestId)?.name ?? interestId}
      />
    ))}
  </View>
);

export const ProfileCard = ({
  user,
  profile,
  onPress,
}: {
  user: User;
  profile?: StudentProfile;
  onPress?: () => void;
}) => (
  <Pressable onPress={onPress} className="mb-4 rounded-3xl bg-white p-5">
    <View className="flex-row items-center">
      <Avatar name={user.fullName} uri={user.avatar} size={54} />
      <View className="ml-4 flex-1">
        <AppText className="text-lg font-semibold text-slate-900">{user.fullName}</AppText>
        <AppText className="text-sm text-slate-500">
          {db.departments.find((item) => item.id === user.departmentId)?.name} • Level {user.level}
        </AppText>
      </View>
      <Badge label={profile?.availability?.replace('_', ' ') ?? 'available'} tone="primary" />
    </View>
    <AppText className="mt-4 text-sm leading-6 text-slate-600">
      {profile?.bio ?? 'No bio yet.'}
    </AppText>
    <View className="mt-4">
      <SkillChipList skillIds={profile?.skills ?? []} />
    </View>
  </Pressable>
);
