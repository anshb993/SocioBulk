export type UserRole = 'resident' | 'vendor' | 'system_admin';

export type MembershipStatus = 'pending' | 'approved' | 'rejected';

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Society {
  id: string;
  name: string;
  city: string;
  area: string;
  pincode: string;
  created_at: string;
}

export interface SocietyMembership {
  id: string;
  society_id: string;
  user_id: string;
  wing: string;
  flat_number: string;
  status: MembershipStatus;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface SocietyMembershipWithProfile extends SocietyMembership {
  profiles: Pick<Profile, 'id' | 'full_name' | 'phone'> | null;
}

export interface SocietyMembershipWithSociety extends SocietyMembership {
  societies: Society | null;
}

export interface Vendor {
  id: string;
  user_id: string;
  business_name: string;
  description: string | null;
  city: string;
  is_verified: boolean;
  created_at: string;
}

export interface ServiceTierTemplate {
  id: string;
  service_id: string;
  min_participants: number;
  max_participants: number | null;
  price_per_person: number;
}

export interface Service {
  id: string;
  vendor_id: string;
  title: string;
  category: string;
  description: string | null;
  individual_price: number;
  duration_minutes: number;
  is_active: boolean;
  created_at: string;
}

export interface ServiceWithTiers extends Service {
  service_tier_templates: ServiceTierTemplate[];
}

export interface TierTemplateInput {
  min_participants: number;
  max_participants: number | null;
  price_per_person: number;
}