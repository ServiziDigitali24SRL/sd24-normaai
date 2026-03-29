-- User's personal address book of trusted professionals
create table if not exists user_professionals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  categoria text not null check (categoria in ('avvocato','commercialista','lavoro','tecnico','finanziario')),
  nome text not null,
  cognome text not null,
  telefono text,
  email text,
  pec text,
  note text,
  created_at timestamptz default now()
);

alter table user_professionals enable row level security;

create policy "Users see own professionals"
  on user_professionals for select using (auth.uid() = user_id);

create policy "Users insert own professionals"
  on user_professionals for insert with check (auth.uid() = user_id);

create policy "Users update own professionals"
  on user_professionals for update using (auth.uid() = user_id);

create policy "Users delete own professionals"
  on user_professionals for delete using (auth.uid() = user_id);

create index on user_professionals (user_id, categoria);
