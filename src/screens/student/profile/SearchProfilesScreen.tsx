import React, { useState } from 'react';
import { View } from 'react-native';

import {
  AppHeader,
  AppScreen,
  Chip,
  EmptyState,
  LoadingState,
  SearchBar,
  SectionHeader,
} from '@/components/common';
import { ProfileCard } from '@/components/profile';
import { db } from '@/data/mockDb';
import { useProfiles } from '@/hooks/useQueries';

export const SearchProfilesScreen = ({ navigation }: any) => {
  const [search, setSearch] = useState('');
  const [skillFilter, setSkillFilter] = useState<string[]>([]);
  const profilesQuery = useProfiles({ search, skillIds: skillFilter });

  return (
    <AppScreen>
      <AppHeader
        title="Search Profiles"
        subtitle="Find skilled students by interest, department, and collaboration availability."
      />
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search students or bio" />
      <View className="mt-4 flex-row flex-wrap">
        {db.skills.slice(0, 6).map((skill) => {
          const active = skillFilter.includes(skill.id);
          return (
            <Chip
              key={skill.id}
              label={skill.name}
              selected={active}
              onPress={() =>
                setSkillFilter((current) =>
                  active ? current.filter((item) => item !== skill.id) : [...current, skill.id]
                )
              }
            />
          );
        })}
      </View>
      <SectionHeader title="Teammate Discovery" />
      {profilesQuery.isLoading ? <LoadingState label="Finding profiles..." /> : null}
      {profilesQuery.data?.length ? (
        profilesQuery.data.map(({ user, profile }) => (
          <ProfileCard
            key={user.id}
            user={user}
            profile={profile}
            onPress={() => navigation.navigate('PublicProfile', { userId: user.id })}
          />
        ))
      ) : (
        <EmptyState
          title="No teammates matched"
          message="Try broader skills or remove some filters."
        />
      )}
    </AppScreen>
  );
};
