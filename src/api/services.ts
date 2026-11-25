import { supabase } from '../lib/supabase';
import type { Service, ServiceWithTiers, TierTemplateInput, Vendor } from '../types/database';

export async function getMyVendor(userId: string): Promise<Vendor | null> {
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createVendorProfile(params: {
  userId: string;
  businessName: string;
  description?: string;
  city: string;
}): Promise<Vendor> {
  const { data, error } = await supabase
    .from('vendors')
    .insert({
      user_id: params.userId,
      business_name: params.businessName.trim(),
      description: params.description?.trim() || null,
      city: params.city.trim(),
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function listVendorServices(vendorId: string): Promise<ServiceWithTiers[]> {
  const { data, error } = await supabase
    .from('services')
    .select('*, service_tier_templates(*)')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return ((data ?? []) as ServiceWithTiers[]).map((service) => ({
    ...service,
    service_tier_templates: [...(service.service_tier_templates ?? [])].sort(
      (a, b) => a.min_participants - b.min_participants
    ),
  }));
}

export function validateTierTemplates(tiers: TierTemplateInput[]): string | null {
  if (tiers.length === 0) return 'Add at least one pricing tier.';

  const sorted = [...tiers].sort((a, b) => a.min_participants - b.min_participants);
  if (sorted[0].min_participants !== 1) {
    return 'Pricing tiers must start at 1 participant.';
  }

  for (let i = 0; i < sorted.length; i++) {
    const tier = sorted[i];
    if (tier.price_per_person <= 0) return 'Tier price must be greater than 0.';
    if (tier.max_participants !== null && tier.max_participants < tier.min_participants) {
      return 'Tier max participants cannot be less than min participants.';
    }

    if (i < sorted.length - 1) {
      const next = sorted[i + 1];
      if (tier.max_participants === null) {
        return 'Only the final tier can have an open upper bound.';
      }
      if (next.min_participants !== tier.max_participants + 1) {
        return `Tiers must be contiguous (expected next tier to start at ${tier.max_participants + 1}).`;
      }
    }
  }

  return null;
}

export async function createServiceWithTiers(params: {
  vendorId: string;
  title: string;
  category: string;
  description?: string;
  individualPrice: number;
  durationMinutes: number;
  tiers: TierTemplateInput[];
}): Promise<Service> {
  const validationError = validateTierTemplates(params.tiers);
  if (validationError) throw new Error(validationError);

  const { data: service, error: serviceError } = await supabase
    .from('services')
    .insert({
      vendor_id: params.vendorId,
      title: params.title.trim(),
      category: params.category.trim(),
      description: params.description?.trim() || null,
      individual_price: params.individualPrice,
      duration_minutes: params.durationMinutes,
    })
    .select('*')
    .single();

  if (serviceError) throw serviceError;

  const tierRows = params.tiers.map((t) => ({
    service_id: service.id,
    min_participants: t.min_participants,
    max_participants: t.max_participants,
    price_per_person: t.price_per_person,
  }));

  const { error: tierError } = await supabase.from('service_tier_templates').insert(tierRows);
  if (tierError) {
    await supabase.from('services').delete().eq('id', service.id);
    throw tierError;
  }

  return service;
}

export async function replaceServiceTiers(
  serviceId: string,
  tiers: TierTemplateInput[]
): Promise<void> {
  const validationError = validateTierTemplates(tiers);
  if (validationError) throw new Error(validationError);

  const { error: deleteError } = await supabase
    .from('service_tier_templates')
    .delete()
    .eq('service_id', serviceId);

  if (deleteError) throw deleteError;

  const { error: insertError } = await supabase.from('service_tier_templates').insert(
    tiers.map((t) => ({
      service_id: serviceId,
      min_participants: t.min_participants,
      max_participants: t.max_participants,
      price_per_person: t.price_per_person,
    }))
  );

  if (insertError) throw insertError;
}