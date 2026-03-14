import { db } from '@/data/mockDb';
import { ApplicationStatus, InvitationStatus } from '@/types';
import { generateId } from '@/utils/helpers';

import {
  addNotification,
  ensureProjectConversation,
  getDisplayName,
  recalcProjectMembers,
  requireProject,
  requireStudent,
  simulate,
} from './base';

const activateMember = (projectId: string, studentId: string, roleName = 'Contributor') => {
  const existing = db.memberships.find(
    (membership) => membership.projectId === projectId && membership.studentId === studentId
  );

  if (existing) {
    existing.status = 'active';
    existing.roleName = roleName;
  } else {
    db.memberships.unshift({
      id: generateId('membership'),
      projectId,
      studentId,
      roleName,
      status: 'active',
      joinedAt: new Date().toISOString(),
    });
  }

  const project = requireProject(projectId);
  recalcProjectMembers(project);
  const conversation = ensureProjectConversation(projectId);
  if (!conversation.participantIds.includes(studentId)) {
    conversation.participantIds.push(studentId);
    conversation.unreadBy[studentId] = 0;
    conversation.presence[studentId] = 'online';
  }
};

export const collaborationService = {
  async applyToProject(projectId: string, studentId: string, message: string) {
    return simulate(() => {
      requireProject(projectId);
      requireStudent(studentId);

      const existing = db.applications.find(
        (application) =>
          application.projectId === projectId &&
          application.studentId === studentId &&
          application.status === 'pending'
      );
      if (existing) {
        throw new Error('You already have a pending application for this project');
      }

      const application = {
        id: generateId('application'),
        projectId,
        studentId,
        message,
        status: 'pending' as ApplicationStatus,
        createdAt: new Date().toISOString(),
      };

      db.applications.unshift(application);
      const project = requireProject(projectId);
      addNotification({
        userId: project.ownerId,
        type: 'application',
        title: 'New project application',
        body: `${getDisplayName(requireStudent(studentId))} applied to ${project.title}.`,
        entityType: 'application',
        entityId: application.id,
        isRead: false,
      });
      return application;
    }, 700);
  },
  async withdrawApplication(applicationId: string) {
    return simulate(() => {
      const application = db.applications.find((item) => item.id === applicationId);
      if (!application) {
        throw new Error('Application not found');
      }

      application.status = 'withdrawn';
      return application;
    });
  },
  async getMyApplications(studentId: string) {
    return simulate(() =>
      db.applications.filter((application) => application.studentId === studentId)
    );
  },
  async getProjectApplications(projectId: string) {
    return simulate(() =>
      db.applications.filter((application) => application.projectId === projectId)
    );
  },
  async updateApplicationStatus(
    applicationId: string,
    status: Extract<ApplicationStatus, 'accepted' | 'rejected'>
  ) {
    return simulate(() => {
      const application = db.applications.find((item) => item.id === applicationId);
      if (!application) {
        throw new Error('Application not found');
      }

      application.status = status;
      const project = requireProject(application.projectId);
      if (status === 'accepted') {
        activateMember(application.projectId, application.studentId);
      }

      addNotification({
        userId: application.studentId,
        type: 'application',
        title: `Application ${status}`,
        body: `Your application to ${project.title} was ${status}.`,
        entityType: 'application',
        entityId: application.id,
        isRead: false,
      });
      return application;
    }, 750);
  },
  async inviteStudent(projectId: string, senderId: string, studentId: string, message: string) {
    return simulate(() => {
      const project = requireProject(projectId);
      const invitee = requireStudent(studentId);
      const invitation = {
        id: generateId('invitation'),
        projectId,
        studentId,
        senderId,
        message,
        status: 'pending' as InvitationStatus,
        createdAt: new Date().toISOString(),
      };

      db.invitations.unshift(invitation);
      addNotification({
        userId: invitee.id,
        type: 'invitation',
        title: 'Team invitation received',
        body: `${getDisplayName(requireStudent(senderId))} invited you to join ${project.title}.`,
        entityType: 'invitation',
        entityId: invitation.id,
        isRead: false,
      });
      return invitation;
    });
  },
  async getReceivedInvitations(studentId: string) {
    return simulate(() =>
      db.invitations.filter((invitation) => invitation.studentId === studentId)
    );
  },
  async getSentInvitations(senderId: string) {
    return simulate(() => db.invitations.filter((invitation) => invitation.senderId === senderId));
  },
  async updateInvitationStatus(
    invitationId: string,
    status: Extract<InvitationStatus, 'accepted' | 'declined' | 'cancelled'>
  ) {
    return simulate(() => {
      const invitation = db.invitations.find((item) => item.id === invitationId);
      if (!invitation) {
        throw new Error('Invitation not found');
      }

      invitation.status = status;
      const project = requireProject(invitation.projectId);
      if (status === 'accepted') {
        activateMember(invitation.projectId, invitation.studentId);
      }

      addNotification({
        userId: invitation.senderId,
        type: 'team',
        title: `Invitation ${status}`,
        body: `${getDisplayName(requireStudent(invitation.studentId))} ${status} the invite to ${project.title}.`,
        entityType: 'invitation',
        entityId: invitation.id,
        isRead: false,
      });
      return invitation;
    }, 700);
  },
  async getTeamMembers(projectId: string) {
    return simulate(() =>
      db.memberships.filter(
        (membership) => membership.projectId === projectId && membership.status === 'active'
      )
    );
  },
  async updateMemberRole(membershipId: string, roleName: string) {
    return simulate(() => {
      const membership = db.memberships.find((item) => item.id === membershipId);
      if (!membership) {
        throw new Error('Member not found');
      }
      membership.roleName = roleName;
      return membership;
    });
  },
  async removeMember(membershipId: string) {
    return simulate(() => {
      const membership = db.memberships.find((item) => item.id === membershipId);
      if (!membership) {
        throw new Error('Member not found');
      }
      membership.status = 'removed';
      const project = requireProject(membership.projectId);
      recalcProjectMembers(project);
      return membership;
    });
  },
  async leaveTeam(projectId: string, studentId: string) {
    return simulate(() => {
      const membership = db.memberships.find(
        (item) =>
          item.projectId === projectId && item.studentId === studentId && item.status === 'active'
      );
      if (!membership) {
        throw new Error('Membership not found');
      }
      membership.status = 'left';
      const project = requireProject(projectId);
      recalcProjectMembers(project);
      return membership;
    });
  },
};
