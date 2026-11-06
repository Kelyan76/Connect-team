-- Supalite : reproduit ce qu'une instance Supabase fournit avant toute migration.
-- (schéma auth, auth.uid(), rôles PostgREST, droits par défaut). Jamais exécuté sur Supabase.


do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin noinherit bypassrls; end if;
end $$;

create schema if not exists auth;
create schema if not exists extensions;
-- Hachage des mots de passe de démonstration. Supabase utilise pgcrypto (bcrypt) ; la démonstration
-- embarquée fournit des fonctions de même signature (SHA-256 salé), sans extension à télécharger.
create or replace function extensions.gen_salt(kind text) returns text
language sql volatile as $fn$
  select 'demo$' || substr(md5(random()::text || clock_timestamp()::text), 1, 17)
$fn$;
-- Le sel occupe les 22 premiers caractères du hash : crypt(mdp, hash) redonne le hash si le mot de passe est bon.
create or replace function extensions.crypt(password text, salt text) returns text
language sql immutable as $fn$
  select substr(salt, 1, 22) || encode(sha256(convert_to(substr(salt, 1, 22) || password, 'UTF8')), 'hex')
$fn$;
grant usage on schema extensions to anon, authenticated, service_role;
grant execute on function extensions.gen_salt(text), extensions.crypt(text, text) to anon, authenticated, service_role;
set search_path = public, extensions;
create schema if not exists supalite;

create table if not exists auth.users (
  instance_id uuid,
  id uuid primary key default gen_random_uuid(),
  aud varchar(255) default 'authenticated',
  role varchar(255) default 'authenticated',
  email varchar(255) unique,
  encrypted_password varchar(255),
  email_confirmed_at timestamptz,
  invited_at timestamptz,
  confirmation_token varchar(255) default '',
  recovery_token varchar(255) default '',
  email_change_token_new varchar(255) default '',
  email_change varchar(255) default '',
  last_sign_in_at timestamptz,
  raw_app_meta_data jsonb default '{}'::jsonb,
  raw_user_meta_data jsonb default '{}'::jsonb,
  banned_until timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists auth.identities (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  identity_data jsonb not null,
  provider text not null,
  last_sign_in_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function auth.uid() returns uuid
language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;

create or replace function auth.role() returns text
language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;

create or replace function auth.jwt() returns jsonb
language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
grant usage on schema extensions to anon, authenticated, service_role;
grant all on all tables in schema auth to service_role;

alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

create table if not exists supalite.migrations (
  name text primary key,
  applied_at timestamptz not null default now()
);
