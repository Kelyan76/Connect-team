-- Connect Team — avatar personnalisé : chacun compose son personnage (teint, coiffure, yeux,
-- bouche, accessoire, couleurs). Visible par toutes les personnes qui voient déjà sa fiche.

alter table public.profiles
  add column avatar jsonb check (avatar is null or (jsonb_typeof(avatar) = 'object' and pg_column_size(avatar) < 512));

-- La RLS de profiles ne permet qu'au manager de modifier une fiche : chacun passe par cette
-- fonction pour changer son propre avatar, et uniquement lui.
create function public.set_my_avatar(p_avatar jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  k text;
  limits constant jsonb := '{"skin": 6, "hair": 6, "hairColor": 7, "eyes": 4, "mouth": 4, "accessory": 4, "shirt": 6, "bg": 6}';
begin
  if auth.uid() is null or not exists (select 1 from public.profiles where id = auth.uid() and is_active) then
    raise exception 'Connexion requise.' using errcode = '42501';
  end if;
  if p_avatar is not null then
    if jsonb_typeof(p_avatar) <> 'object' or (select count(*) from jsonb_object_keys(p_avatar)) <> 8 then
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
  update public.profiles set avatar = p_avatar where id = auth.uid();
end $$;
revoke execute on function public.set_my_avatar(jsonb) from public, anon;
grant execute on function public.set_my_avatar(jsonb) to authenticated, service_role;

-- Équipe modèle (personnes fictives) : un avatar pour chacun.
update public.profiles p set avatar = a.avatar::jsonb
from (values
  ('11111111-0000-4000-8000-000000000101', '{"skin": 1, "hair": 4, "hairColor": 1, "eyes": 1, "mouth": 0, "accessory": 1, "shirt": 0, "bg": 0}'),
  ('11111111-0000-4000-8000-000000000102', '{"skin": 0, "hair": 2, "hairColor": 3, "eyes": 0, "mouth": 2, "accessory": 2, "shirt": 5, "bg": 4}'),
  ('11111111-0000-4000-8000-000000000103', '{"skin": 2, "hair": 3, "hairColor": 0, "eyes": 1, "mouth": 1, "accessory": 0, "shirt": 3, "bg": 3}'),
  ('11111111-0000-4000-8000-000000000104', '{"skin": 1, "hair": 1, "hairColor": 2, "eyes": 0, "mouth": 0, "accessory": 3, "shirt": 2, "bg": 2}'),
  ('11111111-0000-4000-8000-000000000105', '{"skin": 0, "hair": 3, "hairColor": 4, "eyes": 2, "mouth": 0, "accessory": 1, "shirt": 1, "bg": 1}'),
  ('11111111-0000-4000-8000-000000000106', '{"skin": 4, "hair": 5, "hairColor": 0, "eyes": 3, "mouth": 1, "accessory": 0, "shirt": 4, "bg": 5}'),
  ('11111111-0000-4000-8000-000000000107', '{"skin": 3, "hair": 1, "hairColor": 0, "eyes": 0, "mouth": 0, "accessory": 0, "shirt": 1, "bg": 4}'),
  ('11111111-0000-4000-8000-000000000108', '{"skin": 1, "hair": 4, "hairColor": 0, "eyes": 1, "mouth": 1, "accessory": 0, "shirt": 3, "bg": 2}')
) as a(id, avatar)
where p.id = a.id::uuid;

-- Comptes de démonstration déjà copiés depuis l'équipe modèle : même avatar que leur modèle.
update public.profiles p set avatar = t.avatar
from public.profiles t, public.demo_accounts d
where d.user_id = p.id and p.avatar is null and t.team_id = '22222222-0000-4000-8000-000000000002'
  and t.first_name = p.first_name and t.last_name = p.last_name;

-- Les prochaines équipes copient aussi l'avatar des collaborateurs fictifs.
do $$
declare
  v_def text := pg_get_functiondef('public.provision_manager_team(uuid, text, text, text, text, text, text, jsonb, text)'::regprocedure);
begin
  v_def := replace(v_def, 'job_title, hired_on, is_active)', 'job_title, hired_on, is_active, avatar)');
  v_def := replace(v_def, 'p.hired_on, p.is_active', 'p.hired_on, p.is_active, p.avatar');
  execute v_def;
end $$;

-- « Préparer mon 1 à 1 » : exemple de préparation rapide déjà envoyée (Yanis, équipe modèle).
insert into public.review_answers (review_id, question_key, author, value) values
  ('66666666-0000-4000-8000-000000000143', 'mes_sujets', 'collaborateur', '"Mes projets · Mon évolution"'),
  ('66666666-0000-4000-8000-000000000143', 'ca_va', 'collaborateur', '"La bêta 3.0 est prête et les premiers retours sont bons."'),
  ('66666666-0000-4000-8000-000000000143', 'ca_coince', 'collaborateur', '"J''ai l''impression qu''on me reproche d''aller trop vite en daily."')
on conflict (review_id, question_key, author) do nothing;
