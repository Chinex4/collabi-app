import { cache } from '@/data/cache';
import { db } from '@/data/mockDb';

import { apiRequest } from '../http';
import { mapApplication, mapInvitation, mapMembership, mapProject, mapUser } from '../mappers';

const syncRelatedEntity = (raw: any) => {
  if (raw.project && typeof raw.project === 'object') {
    cache.syncProjects([mapProject(raw.project)]);
  }
  if (raw.applicant && typeof raw.applicant === 'object') {
    cache.syncUsers([mapUser(raw.applicant)]);
  }
  if (raw.invitedUser && typeof raw.invitedUser === 'object') {
    cache.syncUsers([mapUser(raw.invitedUser)]);
  }
  if (raw.invitedBy && typeof raw.invitedBy === 'object') {
    cache.syncUsers([mapUser(raw.invitedBy)]);
  }
  if (raw.user && typeof raw.user === 'object') {
    cache.syncUsers([mapUser(raw.user)]);
  }
};

export const collaborationService = {
  async applyToProject(projectId: string, _studentId: string, message: string) {
    const response = await apiRequest<any>(`/projects/${projectId}/applications`, {
      method: 'POST',
      auth: true,
      json: { message },
    });

    syncRelatedEntity(response.data);
    const application = mapApplication(response.data);
    cache.syncApplications([application]);
    return application;
  },
  async withdrawApplication(applicationId: string) {
    const application = db.applications.find((item) => item.id === applicationId);
    if (!application) {
      throw new Error('Application not found');
    }

    const response = await apiRequest<any>(
      `/projects/${application.projectId}/applications/${applicationId}/withdraw`,
      {
        method: 'DELETE',
        auth: true,
      }
    );

    const updated = { ...application, status: 'withdrawn' as const };
    cache.syncApplications([updated]);
    return mapApplication(response.data ?? updated);
  },
  async getMyApplications(_studentId: string) {
    const response = await apiRequest<any[]>('/projects/applications/me', {
      auth: true,
    });

    const items = response.data.map((item) => {
      syncRelatedEntity(item);
      return mapApplication(item);
    });
    cache.replaceApplications(items);
    return items;
  },
  async getProjectApplications(projectId: string) {
    const response = await apiRequest<any[]>(`/projects/${projectId}/applications`, {
      auth: true,
    });

    const items = response.data.map((item) => {
      syncRelatedEntity(item);
      return mapApplication(item);
    });
    cache.replaceApplications(items);
    return items;
  },
  async updateApplicationStatus(
    applicationId: string,
    status: 'accepted' | 'rejected'
  ) {
    const application = db.applications.find((item) => item.id === applicationId);
    if (!application) {
      throw new Error('Application not found');
    }

    const response = await apiRequest<any>(
      `/projects/${application.projectId}/applications/${applicationId}/${status === 'accepted' ? 'accept' : 'reject'}`,
      {
        method: 'PATCH',
        auth: true,
      }
    );

    syncRelatedEntity(response.data);
    const updated = mapApplication(response.data);
    cache.syncApplications([updated]);
    return updated;
  },
  async inviteStudent(projectId: string, _senderId: string, studentId: string, message: string) {
    const response = await apiRequest<any>(`/projects/${projectId}/invitations`, {
      method: 'POST',
      auth: true,
      json: { invitedUser: studentId, message },
    });

    syncRelatedEntity(response.data);
    const invitation = mapInvitation(response.data);
    cache.syncInvitations([invitation]);
    return invitation;
  },
  async getReceivedInvitations(_studentId: string) {
    const response = await apiRequest<any[]>('/projects/invitations/received', {
      auth: true,
    });

    const items = response.data.map((item) => {
      syncRelatedEntity(item);
      return mapInvitation(item);
    });
    cache.replaceInvitations(items);
    return items;
  },
  async getSentInvitations(senderId: string) {
    const projects = await apiRequest<any[]>('/projects/mine', {
      auth: true,
    });

    const sent = await Promise.all(
      projects.data
        .map((project) => extractProjectId(project))
        .filter(Boolean)
        .map((projectId) =>
          apiRequest<any[]>(`/projects/${projectId}/invitations`, {
            auth: true,
          })
        )
    );

    const items = sent
      .flatMap((result) => result.data)
      .map((item) => {
        syncRelatedEntity(item);
        const invitation = mapInvitation(item);
        return {
          ...invitation,
          senderId,
        };
      });

    cache.replaceInvitations(items);
    return items;
  },
  async updateInvitationStatus(
    invitationId: string,
    status: 'accepted' | 'declined' | 'cancelled'
  ) {
    const invitation = db.invitations.find((item) => item.id === invitationId);
    if (!invitation) {
      throw new Error('Invitation not found');
    }

    const path =
      status === 'accepted'
        ? `/projects/invitations/${invitationId}/accept`
        : status === 'declined'
          ? `/projects/invitations/${invitationId}/decline`
          : `/projects/${invitation.projectId}/invitations/${invitationId}/cancel`;

    const response = await apiRequest<any>(path, {
      method: status === 'cancelled' ? 'DELETE' : 'PATCH',
      auth: true,
    });

    syncRelatedEntity(response.data);
    const updated = mapInvitation(response.data ?? { ...invitation, status });
    cache.syncInvitations([updated]);
    return updated;
  },
  async getTeamMembers(projectId: string) {
    const response = await apiRequest<any[]>(`/projects/${projectId}/members`, {
      auth: true,
    });

    const items = response.data.map((item) => {
      syncRelatedEntity(item);
      return mapMembership(item);
    });
    cache.replaceMemberships(items);

    const project = db.projects.find((item) => item.id === projectId);
    if (project) {
      cache.syncProjects([
        {
          ...project,
          teamMemberIds: items.map((item) => item.studentId),
          currentTeamSize: items.length,
        },
      ]);
    }

    return items;
  },
  async updateMemberRole(membershipId: string, roleName: string) {
    const membership = db.memberships.find((item) => item.id === membershipId);
    if (!membership) {
      throw new Error('Member not found');
    }

    const response = await apiRequest<any>(`/projects/${membership.projectId}/members/assign-role`, {
      method: 'PATCH',
      auth: true,
      json: {
        memberUserId: membership.studentId,
        roleName,
      },
    });

    syncRelatedEntity(response.data);
    const updated = mapMembership(response.data);
    cache.syncMemberships([updated]);
    return updated;
  },
  async removeMember(membershipId: string) {
    const membership = db.memberships.find((item) => item.id === membershipId);
    if (!membership) {
      throw new Error('Member not found');
    }

    const response = await apiRequest<any>(`/projects/${membership.projectId}/members/remove`, {
      method: 'DELETE',
      auth: true,
      json: {
        memberUserId: membership.studentId,
      },
    });

    const updated = mapMembership(response.data ?? { ...membership, status: 'removed' });
    cache.syncMemberships([updated]);
    return updated;
  },
  async leaveTeam(projectId: string, _studentId: string) {
    const response = await apiRequest<any>(`/projects/${projectId}/members/leave`, {
      method: 'DELETE',
      auth: true,
    });

    const updated = mapMembership(response.data);
    cache.syncMemberships([updated]);
    return updated;
  },
};

const extractProjectId = (project: any) =>
  typeof project === 'string' ? project : project?._id ?? project?.id ?? '';
