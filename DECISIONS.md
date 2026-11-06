# DECISIONS

Chaque choix structurant, avec sa raison. Quand plusieurs options étaient raisonnables, la plus simple et la plus robuste a été retenue.

| # | Décision | Raison |
| --- | --- | --- |
| 1 | Docker absent : backend local « Supalite » (émulateur Auth/REST/Functions/Mail sur PGlite) | `supabase start` exige Docker. PGlite est un vrai PostgreSQL 17 : les mêmes migrations, les mêmes politiques RLS et les mêmes tests s'appliquent. Le code de l'application reste du supabase-js standard, compatible avec la CLI et un projet hébergé. |
| 2 | Mêmes ports que la CLI Supabase (API 54321, mail 54324) et même secret JWT de démo | Le `.env.local` fonctionne tel quel avec la CLI le jour où Docker est installé. |
| 3 | Pas d'embedding PostgREST (`select=*,table(*)`) dans l'application ; jointures via vues `security_invoker` | Simplifie l'émulateur et garde la RLS appliquée aux vues. |
| 4 | Tailwind 3.4 avec `tailwind.config.ts` ; palette, tailles de police, espacements et rayons **remplacés** (pas étendus) | Rend impossibles les valeurs hors système (`bg-purple-500`, `text-[15px]`, `p-1.5`, `rounded-2xl`). |
| 5 | Composants shadcn/ui écrits à la main dans `src/shared/ui` (Radix + cva) | La CLI shadcn est interactive et réseau ; le principe shadcn est de copier le code, ce qui permet le restylage complet. |
| 6 | React 18.3 + React Router 6 | Compatibilité éprouvée avec Recharts 2 et Radix. |
| 7 | Statuts et alertes calculés en TypeScript pur, pas stockés | Toujours à jour, testables unitairement, seuils paramétrables sans recalcul en base. |
| 8 | Écritures « partielles » des collaborateurs via RPC `security definer` ou trigger de colonnes | La RLS filtre les lignes, pas les colonnes : un collaborateur ne doit pas pouvoir modifier la cible d'un résultat clé ou le titre d'une tâche. |
| 9 | Journal des connexions applicatif (`login_events`, RPC après connexion) | Portable entre local et hébergé, lisible sous RLS (le journal d'audit `auth` n'est pas exposé). |
| 10 | Export PDF avec `@react-pdf/renderer`, chargé à la demande | Vrai fichier PDF, mise en page maîtrisée, sans dépendre de l'impression du navigateur. |
| 11 | Dates de démonstration relatives à `current_date` dans `seed.sql` | Le jeu de données reste crédible quel que soit le jour du lancement. |
| 12 | Playwright avec le navigateur Edge installé (`channel: 'msedge'`) | Pas de téléchargement de navigateur nécessaire sous Windows. |
| 13 | Police Inter auto-hébergée (`@fontsource-variable/inter`) | Pas de dépendance à un CDN, rendu identique hors ligne. |
| 14 | Démonstration embarquée dans le navigateur (PGlite + émulation Auth/REST/Functions dans `src/backend/local`), au lieu d'un serveur local séparé | Aucune installation ni compte pour présenter l'application ; le même build se diffuse en site statique. supabase-js reste inchangé (seul son `fetch` est redirigé). |
| 15 | Hachage des mots de passe de démonstration par des fonctions `extensions.crypt/gen_salt` en SQL (SHA-256 salé) dans le shim local | Évite de télécharger l'extension pgcrypto dans le navigateur. Supabase garde pgcrypto (bcrypt) : le seed est identique des deux côtés. |
| 16 | Routeur en mémoire pour la version partageable (`VITE_ROUTER=memory`) | Un hébergement de fichiers statiques ne réécrit pas les URL ; la navigation reste complète dans la page. |
| 17 | Rappels d'entretien et de météo affichés dans l'application (cloche, tableau de bord) | Pas de service d'envoi d'e-mails programmés en démonstration ; l'envoi par e-mail est une évolution (`pg_cron`). |
| 18 | Tests d'intégration supabase-js ↔ backend embarqué (`tests/backend`) | Un bug d'écriture (CTE imbriquée) n'était visible qu'à l'usage : ces tests garantissent que la démonstration se comporte comme Supabase. |
