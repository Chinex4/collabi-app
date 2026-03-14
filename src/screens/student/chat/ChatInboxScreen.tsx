import React from 'react';

import { AppHeader, AppScreen, EmptyState, LoadingState } from '@/components/common';
import { ConversationListItem } from '@/components/chat';
import { useInbox } from '@/hooks/useQueries';
import { useSession } from '@/hooks/useSession';

export const ChatInboxScreen = ({ navigation }: any) => {
  const { currentUser } = useSession();
  const inbox = useInbox(currentUser?.id);

  return (
    <AppScreen>
      <AppHeader
        title="Inbox"
        subtitle="Direct chats and project rooms with unread activity surfaced first."
      />
      {inbox.isLoading ? <LoadingState label="Loading conversations..." /> : null}
      {inbox.data?.length ? (
        inbox.data.map((conversation) => (
          <ConversationListItem
            key={conversation.id}
            conversation={conversation}
            currentUserId={currentUser!.id}
            onPress={() =>
              navigation.navigate(conversation.type === 'project' ? 'ProjectChat' : 'PrivateChat', {
                conversationId: conversation.id,
                projectId: conversation.projectId,
              })
            }
          />
        ))
      ) : (
        <EmptyState
          title="No conversations yet"
          message="Chats unlock once you message teammates or join active project rooms."
        />
      )}
    </AppScreen>
  );
};
