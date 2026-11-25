-- 1. Enums
create type membership_status as enum ('pending', 'approved', 'rejected');

-- 2. Societies
create table public.societies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null,
  area text not null,
  pincode text not null,
  created_at timestamptz not null default now()
);

-- 3. Society memberships (society admin lives here, never on profiles)
create table public.society_memberships (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references public.societies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  wing text not null,
  flat_number text not null,
  status membership_status not null default 'pending',
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (society_id, user_id),
  unique (society_id, wing, flat_number)
);

create trigger society_memberships_updated_at
  before update on public.society_memberships
  for each row execute function public.handle_updated_at();

-- Helper: check if current user is an approved admin of a society
create or replace function public.is_society_admin(target_society_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.society_memberships
    where society_id = target_society_id
      and user_id = auth.uid()
      and status = 'approved'
      and is_admin = true
  );
$$;

-- 4. Vendors (1-to-1 with vendor profile)
create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  business_name text not null,
  description text,
  city text not null,
  is_verified boolean not null default false,
  created_at timestamptz not null default now()
);

-- 5. Services (money stored as integer rupees)
create table public.services (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  title text not null,
  category text not null,
  description text,
  individual_price integer not null check (individual_price > 0),
  duration_minutes integer not null default 60 check (duration_minutes > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 6. Vendor pricing-tier templates (copied into campaigns at creation)
create table public.service_tier_templates (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  min_participants integer not null check (min_participants >= 1),
  max_participants integer check (max_participants is null or max_participants >= min_participants),
  price_per_person integer not null check (price_per_person > 0),
  unique (service_id, min_participants)
);

-- RLS
alter table public.societies enable row level security;
alter table public.society_memberships enable row level security;
alter table public.vendors enable row level security;
alter table public.services enable row level security;
alter table public.service_tier_templates enable row level security;

-- Societies: anyone signed in can view; system_admin can insert/update
create policy "societies_select_auth" on public.societies
  for select to authenticated using (true);

create policy "societies_manage_sysadmin" on public.societies
  for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'system_admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'system_admin'));

-- Memberships: users see own; society admins see all in their society
create policy "memberships_select" on public.society_memberships
  for select to authenticated
  using (user_id = auth.uid() or public.is_society_admin(society_id));

-- Residents can request to join (forced pending, is_admin = false)
create policy "memberships_insert_own" on public.society_memberships
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and status = 'pending'
    and is_admin = false
  );

-- Society admins can approve/reject members in their society
create policy "memberships_update_admin" on public.society_memberships
  for update to authenticated
  using (public.is_society_admin(society_id))
  with check (public.is_society_admin(society_id));

-- Vendors: readable by all authenticated; owner can insert/update own
create policy "vendors_select_auth" on public.vendors
  for select to authenticated using (true);

create policy "vendors_insert_own" on public.vendors
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and is_verified = false
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'vendor')
  );

create policy "vendors_update_own" on public.vendors
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Services: readable by all authenticated; owning vendor manages
create policy "services_select_auth" on public.services
  for select to authenticated using (true);

create policy "services_manage_owner" on public.services
  for all to authenticated
  using (exists (select 1 from public.vendors v where v.id = vendor_id and v.user_id = auth.uid()))
  with check (exists (select 1 from public.vendors v where v.id = vendor_id and v.user_id = auth.uid()));

-- Tier templates: readable by all authenticated; owning vendor manages
create policy "tiers_select_auth" on public.service_tier_templates
  for select to authenticated using (true);

create policy "tiers_manage_owner" on public.service_tier_templates
  for all to authenticated
  using (
    exists (
      select 1 from public.services s
      join public.vendors v on v.id = s.vendor_id
      where s.id = service_id and v.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.services s
      join public.vendors v on v.id = s.vendor_id
      where s.id = service_id and v.user_id = auth.uid()
    )
  );