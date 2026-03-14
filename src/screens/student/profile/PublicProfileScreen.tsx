import { useMutation } from '@tanstack/react-query';
import React from 'react';
import { View } from 'react-native';

import { chatService } from '@/api/services/chatService';
import {
  AppButton,
  AppHeader,
  AppScreen,
  Chip,
  LoadingState,
  SectionHeader,
} from '@/components/common';
import { InterestChipList, ProfileCard, SkillChipList } from '@/components/profile';
import { useProfile } from '@/hooks/useQueries';
import { useSession } from '@/hooks/useSession';

export const PublicProfileScreen = ({ navigation, route }: any) => {
  const userId = route.params.userId as string;
  const profileQuery = useProfile(userId);
  const { currentUser } = useSession();

  const chatMutation = useMutation({
    mutationFn: () => chatService.getPrivateConversation(currentUser!.id, userId),
    onSuccess: (conversation) =>
      navigation.navigate('PrivateChat', { conversationId: conversation.id, userId }),
  });

  if (profileQuery.isLoading || !profileQuery.data) {
    return <LoadingState label="Loading profile..." />;
  }

  const { user, profile } = profileQuery.data;

  return (
    <AppScreen>
      <AppHeader
        title="Public Profile"
        subtitle="Review profile fit before inviting this student into a project team."
      />
      <ProfileCard user={user} profile={profile} />
      <View className="rounded-[32px] bg-white p-5">
        <SectionHeader title="Skills" />
        <SkillChipList skillIds={profile?.skills ?? []} />
        <SectionHeader title="Interests" />
        <InterestChipList interestIds={profile?.interests ?? []} />
        <SectionHeader title="Preferred Roles" />
        <View className="flex-row flex-wrap">
          {profile?.preferredRoles.map((role) => (
            <Chip key={role} label={role} />
          ))}
        </View>
      </View>
      <View className="mt-4 flex-row flex-wrap gap-3">
        <AppButton
          label="Message"
          onPress={() => chatMutation.mutate()}
          loading={chatMutation.isPending}
        />
        <AppButton
          label="Invite to Project"
          onPress={() => navigation.navigate('InviteStudent', { studentId: userId })}
          variant="secondary"
        />
        <AppButton
          label="Report User"
          onPress={() =>
            navigation.navigate('ReportTarget', { targetType: 'user', targetId: userId })
          }
          variant="ghost"
        />
      </View>
    </AppScreen>
  );
};
