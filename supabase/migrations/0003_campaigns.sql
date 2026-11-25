-- 1. Enums
create type public.campaign_status as enum (
  'draft',
  'open',
  'confirmed',
  'scheduled',
  'completed',
  'cancelled',
  'expired'
);

create type public.participant_status as enum ('joined', 'left', 'cancelled');

-- 2. Campaigns (do not duplicate vendor_id; derive via service_id)
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references public.societies(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  created_by uuid not null references public.profiles(id) on delete restrict,
  title text not null,
  description text,
  status public.campaign_status not null default 'draft',
  individual_price integer not null check (individual_price > 0),
  locked_price_per_person integer check (locked_price_per_person is null or locked_price_per_person > 0),
  min_participants integer not null default 1 check (min_participants >= 1),
  max_participants integer not null check (max_participants >= min_participants),
  current_participants integer not null default 0 check (current_participants >= 0),
  join_deadline timestamptz not null,
  payment_deadline timestamptz not null,
  service_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (payment_deadline >= join_deadline)
);

create trigger campaigns_updated_at
  before update on public.campaigns
  for each row execute function public.set_updated_at();

-- 3. Campaign tier snapshots (immutable copy of service_tier_templates at creation)
create table public.campaign_tiers (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  min_participants integer not null check (min_participants >= 1),
  max_participants integer check (max_participants is null or max_participants >= min_participants),
  price_per_person integer not null check (price_per_person > 0),
  unique (campaign_id, min_participants)
);

-- 4. Campaign participants (one row per user per campaign)
create table public.campaign_participants (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  membership_id uuid not null references public.society_memberships(id) on delete restrict,
  status public.participant_status not null default 'joined',
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, user_id)
);

create trigger campaign_participants_updated_at
  before update on public.campaign_participants
  for each row execute function public.set_updated_at();

-- Trigger to maintain campaigns.current_participants automatically
create or replace function public.sync_campaign_participant_count()
returns trigger
language plpgsql
security definer
as $$
declare
  target_campaign_id uuid;
begin
  target_campaign_id := coalesce(new.campaign_id, old.campaign_id);

  update public.campaigns
  set current_participants = (
    select count(*)::integer
    from public.campaign_participants
    where campaign_id = target_campaign_id
      and status = 'joined'
  )
  where id = target_campaign_id;

  return coalesce(new, old);
end;
$$;

create trigger trg_sync_campaign_participants
  after insert or update or delete on public.campaign_participants
  for each row execute function public.sync_campaign_participant_count();

-- Helper: check if current user is an approved member of a society
create or replace function public.is_approved_society_member(target_society_id uuid)
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
  );
$$;

-- 5. Single source of truth for campaign pricing
create or replace function public.get_campaign_pricing(p_campaign_id uuid)
returns table (
  current_participants integer,
  individual_price integer,
  current_price integer,
  savings integer,
  next_tier_price integer,
  residents_needed integer
)
language plpgsql
stable
security definer
as $$
declare
  v_campaign public.campaigns%rowtype;
  v_effective_count integer;
  v_curr_price integer;
  v_next_tier public.campaign_tiers%rowtype;
begin
  select * into v_campaign from public.campaigns where id = p_campaign_id;
  if not found then
    raise exception 'Campaign not found';
  end if;

  v_effective_count := greatest(v_campaign.current_participants, 1);

  if v_campaign.locked_price_per_person is not null then
    v_curr_price := v_campaign.locked_price_per_person;
  else
    select ct.price_per_person into v_curr_price
    from public.campaign_tiers ct
    where ct.campaign_id = p_campaign_id
      and ct.min_participants <= v_effective_count
      and (ct.max_participants is null or ct.max_participants >= v_effective_count)
    order by ct.min_participants desc
    limit 1;

    if v_curr_price is null then
      v_curr_price := v_campaign.individual_price;
    end if;
  end if;

  -- Next better tier (only while campaign is open and not locked)
  if v_campaign.status = 'open' and v_campaign.locked_price_per_person is null then
    select * into v_next_tier
    from public.campaign_tiers ct
    where ct.campaign_id = p_campaign_id
      and ct.min_participants > v_campaign.current_participants
      and ct.min_participants <= v_campaign.max_participants
      and ct.price_per_person < v_curr_price
    order by ct.min_participants asc
    limit 1;
  end if;

  return query select
    v_campaign.current_participants,
    v_campaign.individual_price,
    v_curr_price,
    greatest(v_campaign.individual_price - v_curr_price, 0),
    v_next_tier.price_per_person,
    case
      when v_next_tier.id is not null then v_next_tier.min_participants - v_campaign.current_participants
      else null
    end;
end;
$$;

-- 6. Create campaign and snapshot service tiers atomically
create or replace function public.create_campaign_with_tiers(
  p_society_id uuid,
  p_service_id uuid,
  p_title text,
  p_description text,
  p_min_participants integer,
  p_max_participants integer,
  p_join_deadline timestamptz,
  p_payment_deadline timestamptz,
  p_service_date date,
  p_publish boolean default true
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_service public.services%rowtype;
  v_campaign_id uuid;
  v_tier_count integer;
  v_top_min integer;
begin
  if not public.is_society_admin(p_society_id) then
    raise exception 'Only society admins can create campaigns for this society';
  end if;

  select * into v_service from public.services where id = p_service_id and is_active = true;
  if not found then
    raise exception 'Active service not found';
  end if;

  select count(*), max(min_participants)
  into v_tier_count, v_top_min
  from public.service_tier_templates
  where service_id = p_service_id;

  if v_tier_count = 0 then
    raise exception 'Service has no pricing tiers configured';
  end if;

  if v_top_min > p_max_participants then
    raise exception 'Top tier requires % participants, exceeding max_participants (%)', v_top_min, p_max_participants;
  end if;

  insert into public.campaigns (
    society_id,
    service_id,
    created_by,
    title,
    description,
    status,
    individual_price,
    min_participants,
    max_participants,
    join_deadline,
    payment_deadline,
    service_date
  ) values (
    p_society_id,
    p_service_id,
    auth.uid(),
    trim(p_title),
    nullif(trim(coalesce(p_description, '')), ''),
    case when p_publish then 'open'::public.campaign_status else 'draft'::public.campaign_status end,
    v_service.individual_price,
    p_min_participants,
    p_max_participants,
    p_join_deadline,
    p_payment_deadline,
    p_service_date
  )
  returning id into v_campaign_id;

  insert into public.campaign_tiers (campaign_id, min_participants, max_participants, price_per_person)
  select v_campaign_id, min_participants, max_participants, price_per_person
  from public.service_tier_templates
  where service_id = p_service_id
  order by min_participants asc;

  return v_campaign_id;
end;
$$;

-- 7. Atomic join campaign (row locked + defensive expiry check)
create or replace function public.join_campaign(p_campaign_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_campaign public.campaigns%rowtype;
  v_membership_id uuid;
begin
  select * into v_campaign
  from public.campaigns
  where id = p_campaign_id
  for update;

  if not found then
    raise exception 'Campaign not found';
  end if;

  if v_campaign.status = 'open' and v_campaign.join_deadline <= now() then
    update public.campaigns set status = 'expired' where id = p_campaign_id;
    raise exception 'Campaign join deadline has passed';
  end if;

  if v_campaign.status <> 'open' then
    raise exception 'Campaign is not open for joining';
  end if;

  if v_campaign.current_participants >= v_campaign.max_participants then
    raise exception 'Campaign is already full';
  end if;

  select id into v_membership_id
  from public.society_memberships
  where society_id = v_campaign.society_id
    and user_id = auth.uid()
    and status = 'approved';

  if v_membership_id is null then
    raise exception 'You must be an approved resident of this society to join';
  end if;

  insert into public.campaign_participants (campaign_id, user_id, membership_id, status)
  values (p_campaign_id, auth.uid(), v_membership_id, 'joined')
  on conflict (campaign_id, user_id) do update
    set status = 'joined',
        joined_at = now();
end;
$$;

-- 8. Atomic leave campaign
create or replace function public.leave_campaign(p_campaign_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_campaign public.campaigns%rowtype;
begin
  select * into v_campaign
  from public.campaigns
  where id = p_campaign_id
  for update;

  if not found then
    raise exception 'Campaign not found';
  end if;

  if v_campaign.status <> 'open' then
    raise exception 'Cannot leave after campaign is closed or confirmed';
  end if;

  update public.campaign_participants
  set status = 'left'
  where campaign_id = p_campaign_id
    and user_id = auth.uid()
    and status = 'joined';

  if not found then
    raise exception 'You are not currently joined in this campaign';
  end if;
end;
$$;

-- 9. Admin confirms campaign and locks final price
create or replace function public.confirm_campaign(p_campaign_id uuid)
returns integer
language plpgsql
security definer
as $$
declare
  v_campaign public.campaigns%rowtype;
  v_locked_price integer;
begin
  select * into v_campaign
  from public.campaigns
  where id = p_campaign_id
  for update;

  if not found then
    raise exception 'Campaign not found';
  end if;

  if not public.is_society_admin(v_campaign.society_id) then
    raise exception 'Only society admins can confirm campaigns';
  end if;

  if v_campaign.status <> 'open' then
    raise exception 'Only open campaigns can be confirmed';
  end if;

  if v_campaign.current_participants < v_campaign.min_participants then
    raise exception 'Minimum % participants required to confirm (currently %)',
      v_campaign.min_participants, v_campaign.current_participants;
  end if;

  select current_price into v_locked_price
  from public.get_campaign_pricing(p_campaign_id);

  update public.campaigns
  set status = 'confirmed',
      locked_price_per_person = v_locked_price
  where id = p_campaign_id;

  return v_locked_price;
end;
$$;

-- 10. Expiry helper (for pg_cron or scheduled Edge Function)
create or replace function public.expire_due_campaigns()
returns integer
language plpgsql
security definer
as $$
declare
  v_count integer;
begin
  update public.campaigns
  set status = 'expired'
  where status = 'open'
    and join_deadline <= now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- 11. RLS
alter table public.campaigns enable row level security;
alter table public.campaign_tiers enable row level security;
alter table public.campaign_participants enable row level security;

-- Campaigns: approved society members, society admins, and the service's vendor can read
create policy "campaigns_select" on public.campaigns
  for select to authenticated
  using (
    public.is_approved_society_member(society_id)
    or public.is_society_admin(society_id)
    or exists (
      select 1 from public.services s
      join public.vendors v on v.id = s.vendor_id
      where s.id = service_id and v.user_id = auth.uid()
    )
  );

-- Direct client writes to campaigns are blocked; use RPC functions (create_campaign_with_tiers, confirm_campaign)
-- Campaign tiers: readable if campaign is readable
create policy "campaign_tiers_select" on public.campaign_tiers
  for select to authenticated
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_id
        and (
          public.is_approved_society_member(c.society_id)
          or public.is_society_admin(c.society_id)
          or exists (
            select 1 from public.services s
            join public.vendors v on v.id = s.vendor_id
            where s.id = c.service_id and v.user_id = auth.uid()
          )
        )
    )
  );

-- Campaign participants: users see own row; society admins see all in their society
create policy "campaign_participants_select" on public.campaign_participants
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.campaigns c
      where c.id = campaign_id and public.is_society_admin(c.society_id)
    )
  );

-- Enable Realtime on campaigns for live participant count updates
alter publication supabase_realtime add table public.campaigns;