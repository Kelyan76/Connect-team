-- Apparence choisie par chacun : ambiance, taille du texte, densité.
-- Purement visuel : aucune fonctionnalité ne dépend de ces valeurs.
alter table public.profiles
  add column ui_theme text not null default 'classique'
    check (ui_theme in ('classique', 'nuit', 'zen', 'epure', 'energie')),
  add column ui_text_size text not null default 'normal'
    check (ui_text_size in ('normal', 'grand')),
  add column ui_density text not null default 'aeree'
    check (ui_density in ('aeree', 'compacte'));

-- La RLS de profiles ne permet qu'au manager de modifier une fiche : chacun passe par cette
-- fonction pour changer sa propre apparence, et uniquement elle.
create function public.set_my_ui(p_theme text, p_text_size text, p_density text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists (select 1 from public.profiles where id = auth.uid() and is_active) then
    raise exception 'Connexion requise.' using errcode = '42501';
  end if;
  update public.profiles
    set ui_theme = p_theme, ui_text_size = p_text_size, ui_density = p_density
    where id = auth.uid();
end $$;
revoke execute on function public.set_my_ui(text, text, text) from public, anon;
grant execute on function public.set_my_ui(text, text, text) to authenticated, service_role;
