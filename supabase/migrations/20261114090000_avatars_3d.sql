-- Connect Team — personnages 3D : un avatar peut désormais être {"preset": "<personnage>"}
-- (portraits dans public/avatars), en plus du personnage composé pièce par pièce.

create or replace function public.set_my_avatar(p_avatar jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  k text;
  limits constant jsonb := '{"skin": 6, "hair": 6, "hairColor": 7, "eyes": 4, "mouth": 4, "accessory": 4, "shirt": 6, "bg": 6}';
  presets constant text[] := array['alex', 'theo', 'lea', 'noah', 'jade'];
begin
  if auth.uid() is null or not exists (select 1 from public.profiles where id = auth.uid() and is_active) then
    raise exception 'Connexion requise.' using errcode = '42501';
  end if;
  if p_avatar is not null then
    if jsonb_typeof(p_avatar) <> 'object' then
      raise exception 'Avatar invalide.' using errcode = '22023';
    end if;
    if p_avatar ? 'preset' then
      if (select count(*) from jsonb_object_keys(p_avatar)) <> 1 or not ((p_avatar ->> 'preset') = any (presets)) then
        raise exception 'Avatar invalide.' using errcode = '22023';
      end if;
    else
      if (select count(*) from jsonb_object_keys(p_avatar)) <> 8 then
        raise exception 'Avatar invalide.' using errcode = '22023';
      end if;
      for k in select jsonb_object_keys(limits) loop
        if jsonb_typeof(p_avatar -> k) <> 'number'
           or (p_avatar ->> k)::numeric <> floor((p_avatar ->> k)::numeric)
           or (p_avatar ->> k)::int < 0 or (p_avatar ->> k)::int >= (limits ->> k)::int then
          raise exception 'Avatar invalide.' using errcode = '22023';
        end if;
      end loop;
    end if;
  end if;
  update public.profiles set avatar = p_avatar where id = auth.uid();
end $$;
revoke execute on function public.set_my_avatar(jsonb) from public, anon;
grant execute on function public.set_my_avatar(jsonb) to authenticated, service_role;

-- Équipe modèle : cinq personnes passent en personnage 3D (les autres gardent leur personnage composé).
update public.profiles p set avatar = jsonb_build_object('preset', a.preset)
from (values
  ('11111111-0000-4000-8000-000000000101', 'lea'),
  ('11111111-0000-4000-8000-000000000102', 'alex'),
  ('11111111-0000-4000-8000-000000000105', 'jade'),
  ('11111111-0000-4000-8000-000000000106', 'theo'),
  ('11111111-0000-4000-8000-000000000107', 'noah')
) as a(id, preset)
where p.id = a.id::uuid;

-- Comptes de démonstration déjà copiés : même avatar que leur modèle.
update public.profiles p set avatar = t.avatar
from public.profiles t, public.demo_accounts d
where d.user_id = p.id and t.team_id = '22222222-0000-4000-8000-000000000002' and t.role = 'collaborateur'
  and t.first_name = p.first_name and t.last_name = p.last_name;
