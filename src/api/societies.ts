import { supabase } from '../lib/supabase';
import type {
    MembershipStatus,
    Society,
    SocietyMembership,
    SocietyMembershipWithProfile,
    SocietyMembershipWithSociety,
} from '../types/database';

export async function listSocieties(): Promise<Society[]> {
  const { data, error } = await supabase
    .from('societies')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getMyMemberships(userId: string): Promise<SocietyMembershipWithSociety[]> {
  const { data, error } = await supabase
    .from('society_memberships')
    .select('*, societies(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as SocietyMembershipWithSociety[];
}

export async function requestMembership(params: {
  societyId: string;
  userId: string;
  wing: string;
  flatNumber: string;
}): Promise<SocietyMembership> {
  const { data, error } = await supabase
    .from('society_memberships')
    .insert({
      society_id: params.societyId,
      user_id: params.userId,
      wing: params.wing.trim(),
      flat_number: params.flatNumber.trim(),
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function listSocietyMembers(societyId: string): Promise<SocietyMembershipWithProfile[]> {
  const { data, error } = await supabase
    .from('society_memberships')
    .select('*, profiles(id, full_name, phone)')
    .eq('society_id', societyId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as SocietyMembershipWithProfile[];
}

export async function updateMembershipStatus(
  membershipId: string,
  status: Extract<MembershipStatus, 'approved' | 'rejected'>
): Promise<SocietyMembership> {
  const { data, error } = await supabase
    .from('society_memberships')
    .update({ status })
    .eq('id', membershipId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}