-- Gmail OAuth tokens storage
create table if not exists user_gmail_tokens (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  gmail_email  text,
  access_token text not null,
  refresh_token text,
  token_expiry  timestamptz,
  scope        text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  constraint user_gmail_tokens_user_id_key unique (user_id)
);

alter table user_gmail_tokens enable row level security;

create policy "Users see own gmail tokens"
  on user_gmail_tokens for select using (auth.uid() = user_id);
create policy "Users insert own gmail tokens"
  on user_gmail_tokens for insert with check (auth.uid() = user_id);
create policy "Users update own gmail tokens"
  on user_gmail_tokens for update using (auth.uid() = user_id);
create policy "Users delete own gmail tokens"
  on user_gmail_tokens for delete using (auth.uid() = user_id);

-- Short-lived OAuth state (CSRF protection)
create table if not exists gmail_oauth_states (
  state      text primary key,
  user_id    uuid not null,
  created_at timestamptz default now()
);

-- Service role only — no RLS needed (backend use)
-- Cleanup: states older than 10 minutes are considered expired
