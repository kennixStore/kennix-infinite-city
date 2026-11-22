-- KENNIX: INFINITE CITY — secure account, cloud-save and KX ledger foundation.
-- Apply this migration in the Supabase SQL Editor before enabling online features.

create table if not exists public.player_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Driver',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint display_name_length check (char_length(display_name) between 2 and 24)
);

create table if not exists public.player_saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  progress jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint progress_object check (jsonb_typeof(progress) = 'object')
);

create table if not exists public.kx_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance bigint not null default 5000 check (balance >= 0 and balance <= 9000000000000000),
  updated_at timestamptz not null default now()
);

create table if not exists public.kx_transactions (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  sender_user_id uuid references auth.users(id) on delete set null,
  recipient_user_id uuid references auth.users(id) on delete set null,
  amount bigint not null check (amount > 0 and amount <= 100000),
  transaction_type text not null check (transaction_type in ('welcome_bonus','player_transfer')),
  created_at timestamptz not null default now()
);

create index if not exists kx_transactions_sender_idx on public.kx_transactions(sender_user_id, created_at desc);
create index if not exists kx_transactions_recipient_idx on public.kx_transactions(recipient_user_id, created_at desc);

alter table public.player_profiles enable row level security;
alter table public.player_saves enable row level security;
alter table public.kx_wallets enable row level security;
alter table public.kx_transactions enable row level security;

drop policy if exists "Players read their own profile" on public.player_profiles;
create policy "Players read their own profile" on public.player_profiles
for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Players update their own profile" on public.player_profiles;
create policy "Players update their own profile" on public.player_profiles
for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Players manage their own save" on public.player_saves;
create policy "Players manage their own save" on public.player_saves
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on public.player_saves to authenticated;
grant select, update on public.player_profiles to authenticated;

drop policy if exists "Players read their own wallet" on public.kx_wallets;
create policy "Players read their own wallet" on public.kx_wallets
for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Players read transactions involving them" on public.kx_transactions;
create policy "Players read transactions involving them" on public.kx_transactions
for select to authenticated using (auth.uid() = sender_user_id or auth.uid() = recipient_user_id);

revoke all on public.kx_wallets from anon, authenticated;
grant select on public.kx_wallets to authenticated;
revoke all on public.kx_transactions from anon, authenticated;
grant select on public.kx_transactions to authenticated;

create or replace function public.handle_new_player()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  chosen_name text;
begin
  chosen_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), 'Driver');
  if char_length(chosen_name) < 2 then chosen_name := 'Driver'; end if;
  insert into public.player_profiles(user_id, display_name)
  values (new.id, left(chosen_name, 24))
  on conflict (user_id) do nothing;
  insert into public.player_saves(user_id) values (new.id)
  on conflict (user_id) do nothing;
  insert into public.kx_wallets(user_id, balance) values (new.id, 5000)
  on conflict (user_id) do nothing;
  insert into public.kx_transactions(idempotency_key, recipient_user_id, amount, transaction_type)
  values ('welcome:' || new.id::text, new.id, 5000, 'welcome_bonus')
  on conflict (idempotency_key) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_player_created on auth.users;
create trigger on_auth_player_created
after insert on auth.users
for each row execute procedure public.handle_new_player();

create or replace function public.get_my_kx_balance()
returns bigint
language sql
security definer
set search_path = ''
as $$
  select balance from public.kx_wallets where user_id = auth.uid();
$$;

revoke all on function public.get_my_kx_balance() from public;
grant execute on function public.get_my_kx_balance() to authenticated;

create or replace function public.transfer_kx(
  p_recipient uuid,
  p_amount bigint,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  sender uuid := auth.uid();
  sender_balance bigint;
  recipient_balance bigint;
  existing public.kx_transactions%rowtype;
begin
  if sender is null then raise exception 'Authentication required'; end if;
  if p_recipient is null or p_recipient = sender then raise exception 'Invalid recipient'; end if;
  if p_amount is null or p_amount < 1 or p_amount > 100000 then raise exception 'Transfer amount out of range'; end if;
  if p_idempotency_key is null or length(p_idempotency_key) < 8 or length(p_idempotency_key) > 80 then
    raise exception 'Invalid transfer reference';
  end if;

  select * into existing from public.kx_transactions
  where idempotency_key = p_idempotency_key;
  if found then
    if existing.sender_user_id <> sender then raise exception 'Transfer reference already used'; end if;
    return jsonb_build_object('transaction_id', existing.id, 'status', 'already_processed');
  end if;

  perform 1 from public.kx_wallets where user_id in (sender, p_recipient) order by user_id for update;
  select balance into sender_balance from public.kx_wallets where user_id = sender;
  select balance into recipient_balance from public.kx_wallets where user_id = p_recipient;
  if sender_balance is null or recipient_balance is null then raise exception 'Wallet not found'; end if;
  if sender_balance < p_amount then raise exception 'Insufficient KX balance'; end if;

  update public.kx_wallets set balance = balance - p_amount, updated_at = now() where user_id = sender;
  update public.kx_wallets set balance = balance + p_amount, updated_at = now() where user_id = p_recipient;
  insert into public.kx_transactions(idempotency_key, sender_user_id, recipient_user_id, amount, transaction_type)
  values (p_idempotency_key, sender, p_recipient, p_amount, 'player_transfer')
  returning * into existing;

  return jsonb_build_object('transaction_id', existing.id, 'status', 'completed',
    'sender_balance', sender_balance - p_amount, 'recipient_balance', recipient_balance + p_amount);
end;
$$;

revoke all on function public.transfer_kx(uuid, bigint, text) from public;
grant execute on function public.transfer_kx(uuid, bigint, text) to authenticated;
