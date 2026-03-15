import React from 'react';
import { View } from 'react-native';

import {
  AppButton,
  AppHeader,
  AppScreen,
  AppText,
  Badge,
  LoadingState,
  SectionHeader,
} from '@/components/common';
import { ProfileCard } from '@/components/profile';
import { useProfile } from '@/hooks/useQueries';
import { useSession } from '@/hooks/useSession';

export const MyProfileScreen = ({ navigation }: any) => {
  const { currentUser } = useSession();
  const profileQuery = useProfile(currentUser ? 'me' : undefined);

  if (profileQuery.isLoading || !profileQuery.data) {
    return <LoadingState label="Loading profile..." />;
  }

  const { user, profile } = profileQuery.data;
  if (!user) {
    return <LoadingState label="Loading profile..." />;
  }
  const safeProfile = profile ?? {
    bio: '',
    skills: [],
    interests: [],
    availability: 'available',
    preferredRoles: [],
    portfolioLinks: [],
    visibility: 'public',
    completedProjectsCount: 0,
    activeProjectsCount: 0,
  };
  const completeness = Math.min(
    100,
    Math.round(
      ((safeProfile.bio ? 1 : 0) +
        (safeProfile.skills.length ? 1 : 0) +
        (safeProfile.interests.length ? 1 : 0) +
        (safeProfile.portfolioLinks.length ? 1 : 0) +
        (safeProfile.preferredRoles.length ? 1 : 0)) *
        20
    )
  );

  return (
    <AppScreen>
      <AppHeader
        title="My Profile"
        subtitle="Keep your profile sharp so strong teams can find you faster."
        right={
          <AppButton
            label="Edit"
            onPress={() => navigation.navigate('EditProfile')}
            variant="secondary"
          />
        }
      />
      <ProfileCard user={user} profile={profile} />
      <View className="rounded-[32px] bg-white p-5">
        <SectionHeader title="Profile completeness" />
        <Badge
          label={`${completeness}% complete`}
          tone={completeness >= 80 ? 'success' : 'warning'}
        />
        <AppText className="mt-3 text-sm text-slate-500">
          Completed projects: {safeProfile.completedProjectsCount} • Active projects:{' '}
          {safeProfile.activeProjectsCount}
        </AppText>
      </View>
      <View className="mt-4 flex-row flex-wrap gap-3">
        <AppButton
          label="Settings"
          onPress={() => navigation.navigate('AccountSettings')}
          variant="secondary"
        />
        <AppButton
          label="Saved Projects"
          onPress={() => navigation.navigate('SavedProjects')}
          variant="secondary"
        />
        <AppButton
          label="My Reports"
          onPress={() => navigation.navigate('MyReports')}
          variant="secondary"
        />
      </View>
    </AppScreen>
  );
};
