-- Connect Team — retrait des avatars : l'application revient aux initiales sur pastille de couleur.
-- La colonne profiles.avatar reste (la copie de l'équipe modèle la mentionne) mais est vidée,
-- et plus personne ne peut la remplir.

update public.profiles set avatar = null where avatar is not null;
drop function if exists public.set_my_avatar(jsonb);
