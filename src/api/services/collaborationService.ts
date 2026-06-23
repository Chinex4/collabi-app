import { cache } from '@/data/cache';
import { db } from '@/data/mockDb';

import { requireData, throwIfSupabaseError } from '../errors';
import { mapApplication, mapInvitation, mapMembership, mapProject, mapUser } from '../mappers';
import { supabase } from '../supabase';

const supabaseAny = supabase as any;

const applicationSelect = '*, project:projects(*), student:users(*)';
const invitationSelect = '*, project:projects(*), student:users(*), sender:users(*)';
const membershipSelect = '*, project:projects(*), student:users(*)';

const syncRelatedEntity = (raw: any) => {
  if (raw.project && typeof raw.project === 'object') {
    cache.syncProjects([mapProject(raw.project)]);
  }
  const user =
    raw.student ?? raw.sender ?? raw.user ?? raw.applicant ?? raw.invitedUser ?? raw.invitedBy;
  if (user && typeof user === 'object') {
    cache.syncUsers([mapUser(user)]);
  }
};

const getApplication = async (applicationId: string) => {
  const { data, error } = await supabaseAny
    .from('applications')
    .select(applicationSelect)
    .eq('id', applicationId)
    .single();

  throwIfSupabaseError(error);
  syncRelatedEntity(data);
  return mapApplication(requireData(data, 'Application not found'));
};

const getInvitation = async (invitationId: string) => {
  const { data, error } = await supabaseAny
    .from('invitations')
    .select(invitationSelect)
    .eq('id', invitationId)
    .single();

  throwIfSupabaseError(error);
  syncRelatedEntity(data);
  return mapInvitation(requireData(data, 'Invitation not found'));
};

export const collaborationService = {
  async applyToProject(projectId: string, studentId: string, message: string) {
    const { data, error } = await supabaseAny
      .from('applications')
      .insert({ project_id: projectId, student_id: studentId, message })
      .select(applicationSelect)
      .single();

    throwIfSupabaseError(error);
    syncRelatedEntity(data);

    const application = mapApplication(data);
    cache.syncApplications([application]);
    return application;
  },
  async withdrawApplication(applicationId: string) {
    const { data, error } = await supabaseAny
      .from('applications')
      .update({ status: 'withdrawn' })
      .eq('id', applicationId)
      .select(applicationSelect)
      .single();

    throwIfSupabaseError(error);
    const application = mapApplication(data);
    cache.syncApplications([application]);
    return application;
  },
  async getMyApplications(studentId: string) {
    const { data, error } = await supabaseAny
      .from('applications')
      .select(applicationSelect)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    throwIfSupabaseError(error);

    const items = (data ?? []).map((item: any) => {
      syncRelatedEntity(item);
      return mapApplication(item);
    });
    cache.replaceApplications(items);
    return items;
  },
  async getProjectApplications(projectId: string) {
    const { data, error } = await supabaseAny
      .from('applications')
      .select(applicationSelect)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    throwIfSupabaseError(error);

    const items = (data ?? []).map((item: any) => {
      syncRelatedEntity(item);
      return mapApplication(item);
    });
    cache.replaceApplications(items);
    return items;
  },
  async updateApplicationStatus(applicationId: string, status: 'accepted' | 'rejected') {
    if (status === 'accepted') {
      const { error } = await supabaseAny.rpc('accept_application', {
        p_application_id: applicationId,
      });
      throwIfSupabaseError(error);

      const application = await getApplication(applicationId);
      cache.syncApplications([application]);
      return application;
    }

    const { data, error } = await supabaseAny
      .from('applications')
      .update({ status })
      .eq('id', applicationId)
      .select(applicationSelect)
      .single();

    throwIfSupabaseError(error);
    const application = mapApplication(data);
    cache.syncApplications([application]);
    return application;
  },
  async inviteStudent(projectId: string, senderId: string, studentId: string, message: string) {
    const { data, error } = await supabaseAny
      .from('invitations')
      .insert({ project_id: projectId, sender_id: senderId, student_id: studentId, message })
      .select(invitationSelect)
      .single();

    throwIfSupabaseError(error);
    syncRelatedEntity(data);

    const invitation = mapInvitation(data);
    cache.syncInvitations([invitation]);
    return invitation;
  },
  async getReceivedInvitations(studentId: string) {
    const { data, error } = await supabaseAny
      .from('invitations')
      .select(invitationSelect)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    throwIfSupabaseError(error);

    const items = (data ?? []).map((item: any) => {
      syncRelatedEntity(item);
      return mapInvitation(item);
    });
    cache.replaceInvitations(items);
    return items;
  },
  async getSentInvitations(senderId: string) {
    const { data, error } = await supabaseAny
      .from('invitations')
      .select(invitationSelect)
      .eq('sender_id', senderId)
      .order('created_at', { ascending: false });

    throwIfSupabaseError(error);

    const items = (data ?? []).map((item: any) => {
      syncRelatedEntity(item);
      return mapInvitation(item);
    });
    cache.replaceInvitations(items);
    return items;
  },
  async updateInvitationStatus(
    invitationId: string,
    status: 'accepted' | 'declined' | 'cancelled'
  ) {
    if (status === 'accepted') {
      const { data: membership, error: membershipError } = await supabaseAny.rpc(
        'accept_invitation',
        { p_invitation_id: invitationId }
      );

      throwIfSupabaseError(membershipError);
      cache.syncMemberships([mapMembership(membership)]);

      const updated = await getInvitation(invitationId);
      cache.syncInvitations([updated]);
      return updated;
    }

    const { data, error } = await supabaseAny
      .from('invitations')
      .update({ status })
      .eq('id', invitationId)
      .select(invitationSelect)
      .single();

    throwIfSupabaseError(error);
    const updated = mapInvitation(data);
    cache.syncInvitations([updated]);
    return updated;
  },
  async getTeamMembers(projectId: string) {
    const { data, error } = await supabaseAny
      .from('memberships')
      .select(membershipSelect)
      .eq('project_id', projectId)
      .eq('status', 'active')
      .order('joined_at', { ascending: true });

    throwIfSupabaseError(error);

    const items = (data ?? []).map((item: any) => {
      syncRelatedEntity(item);
      return mapMembership(item);
    }) as ReturnType<typeof mapMembership>[];
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
    const { data, error } = await supabaseAny
      .from('memberships')
      .update({ role_name: roleName })
      .eq('id', membershipId)
      .select(membershipSelect)
      .single();

    throwIfSupabaseError(error);
    const membership = mapMembership(data);
    cache.syncMemberships([membership]);
    return membership;
  },
  async removeMember(membershipId: string) {
    const { data, error } = await supabaseAny
      .from('memberships')
      .update({ status: 'removed' })
      .eq('id', membershipId)
      .select(membershipSelect)
      .single();

    throwIfSupabaseError(error);
    const membership = mapMembership(data);
    cache.syncMemberships([membership]);
    return membership;
  },
  async leaveTeam(projectId: string, studentId: string) {
    const { data, error } = await supabaseAny
      .from('memberships')
      .update({ status: 'left' })
      .eq('project_id', projectId)
      .eq('student_id', studentId)
      .select(membershipSelect)
      .single();

    throwIfSupabaseError(error);
    const membership = mapMembership(data);
    cache.syncMemberships([membership]);
    return membership;
  },
};
