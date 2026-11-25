import { supabase } from '../lib/supabase';
import type {
    CampaignPricing,
    CampaignTier,
    CampaignWithDetails
} from '../types/database';

export async function getCampaignPricing(campaignId: string): Promise<CampaignPricing> {
  const { data, error } = await supabase
    .rpc('get_campaign_pricing', { p_campaign_id: campaignId })
    .single();

  if (error) throw error;
  return data as CampaignPricing;
}

export async function listSocietyCampaigns(
  societyId: string,
  userId?: string
): Promise<CampaignWithDetails[]> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*, services(*, vendors(id, business_name, city)), campaign_tiers(*)')
    .eq('society_id', societyId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const campaigns = ((data ?? []) as CampaignWithDetails[]).map((c) => ({
    ...c,
    campaign_tiers: [...(c.campaign_tiers ?? [])].sort(
      (a, b) => a.min_participants - b.min_participants
    ),
  }));

  let joinedSet = new Set<string>();
  if (userId && campaigns.length > 0) {
    const { data: participations, error: pErr } = await supabase
      .from('campaign_participants')
      .select('campaign_id')
      .eq('user_id', userId)
      .eq('status', 'joined')
      .in(
        'campaign_id',
        campaigns.map((c) => c.id)
      );

    if (pErr) throw pErr;
    joinedSet = new Set((participations ?? []).map((p) => p.campaign_id));
  }

  const enriched = await Promise.all(
    campaigns.map(async (c) => {
      try {
        const pricing = await getCampaignPricing(c.id);
        return { ...c, pricing, isJoined: joinedSet.has(c.id) };
      } catch {
        return { ...c, isJoined: joinedSet.has(c.id) };
      }
    })
  );

  return enriched;
}

export async function getCampaignDetail(
  campaignId: string,
  userId?: string
): Promise<{
  campaign: CampaignWithDetails;
  tiers: CampaignTier[];
  pricing: CampaignPricing;
  isJoined: boolean;
}> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*, services(*, vendors(id, business_name, city)), campaign_tiers(*)')
    .eq('id', campaignId)
    .single();

  if (error) throw error;

  const campaign = data as CampaignWithDetails;
  const tiers = [...(campaign.campaign_tiers ?? [])].sort(
    (a, b) => a.min_participants - b.min_participants
  );

  const pricing = await getCampaignPricing(campaignId);

  let isJoined = false;
  if (userId) {
    const { data: part, error: pErr } = await supabase
      .from('campaign_participants')
      .select('status')
      .eq('campaign_id', campaignId)
      .eq('user_id', userId)
      .maybeSingle();

    if (pErr) throw pErr;
    isJoined = part?.status === 'joined';
  }

  return { campaign, tiers, pricing, isJoined };
}

export async function listActiveServicesForCampaign(): Promise<
  Array<{
    id: string;
    title: string;
    category: string;
    individual_price: number;
    vendor_name: string;
  }>
> {
  const { data, error } = await supabase
    .from('services')
    .select('id, title, category, individual_price, vendors(business_name)')
    .eq('is_active', true)
    .order('title', { ascending: true });

  if (error) throw error;

  type RawServiceRow = {
    id: string;
    title: string;
    category: string;
    individual_price: number;
    vendors: { business_name: string } | { business_name: string }[] | null;
  };

  return ((data ?? []) as RawServiceRow[]).map((row) => {
    const vendorName = Array.isArray(row.vendors)
      ? row.vendors[0]?.business_name
      : row.vendors?.business_name;

    return {
      id: row.id,
      title: row.title,
      category: row.category,
      individual_price: row.individual_price,
      vendor_name: vendorName ?? 'Vendor',
    };
  });
}

export async function createCampaignWithTiers(params: {
  societyId: string;
  serviceId: string;
  title: string;
  description?: string;
  minParticipants: number;
  maxParticipants: number;
  joinDeadlineIso: string;
  paymentDeadlineIso: string;
  serviceDate: string;
  publish: boolean;
}): Promise<string> {
  const { data, error } = await supabase.rpc('create_campaign_with_tiers', {
    p_society_id: params.societyId,
    p_service_id: params.serviceId,
    p_title: params.title,
    p_description: params.description ?? null,
    p_min_participants: params.minParticipants,
    p_max_participants: params.maxParticipants,
    p_join_deadline: params.joinDeadlineIso,
    p_payment_deadline: params.paymentDeadlineIso,
    p_service_date: params.serviceDate,
    p_publish: params.publish,
  });

  if (error) throw error;
  return data as string;
}

export async function joinCampaign(campaignId: string): Promise<void> {
  const { error } = await supabase.rpc('join_campaign', { p_campaign_id: campaignId });
  if (error) throw error;
}

export async function leaveCampaign(campaignId: string): Promise<void> {
  const { error } = await supabase.rpc('leave_campaign', { p_campaign_id: campaignId });
  if (error) throw error;
}

export async function confirmCampaign(campaignId: string): Promise<number> {
  const { data, error } = await supabase.rpc('confirm_campaign', { p_campaign_id: campaignId });
  if (error) throw error;
  return Number(data);
}