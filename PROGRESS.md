# PROGRESS

## Blocages et contournements

- **Docker absent** (4 nov. 2026) : `supabase start` et `supabase gen types --local` impossibles sur cette machine. Contournement retenu : la base PostgreSQL de démonstration tourne dans le navigateur (PGlite) derrière une émulation des API Supabase (`src/backend/local`). Mêmes migrations, même RLS, même seed. Types générés par `tools/gen-types.ts`.
- **Projet Supabase hébergé** (5 nov. 2026) : projet `zwfxctoycuxhqukdopbk` configuré. Schéma et jeu de démonstration installés (27 tables, RLS active partout, aucun droit anonyme), inscriptions libres désactivées, mots de passe de 10 caractères avec majuscule, chiffre et symbole, URL de redirection locales, Edge Functions `invite-member` et `manage-member` déployées (vérification JWT faite dans le code). Vérifié par script : connexions manager et collaborateur, RLS, refus des fonctions pour un collaborateur, refus des mots de passe faibles et des inscriptions. Site déployé sur Vercel : https://cadence-rouge-seven.vercel.app (variables VITE_SUPABASE_* configurées dans le projet Vercel « cadence »). Restent : URL du site et URL de redirection Vercel à déclarer dans Supabase (Authentication › URL Configuration), SMTP pour l'envoi réel des invitations.
- **Artefact claude.ai** : publié, mais non vérifié de bout en bout depuis cette session (le navigateur intégré n'est pas connecté à claude.ai). Le même build fonctionne en local (`vite preview`, vérifié).

## Phases

| Phase | État | Contrôles |
| --- | --- | --- |
| 1. Socle et design system | fait | build, lint, page `/dev/composants` |
| 2. Auth, rôles, RLS, invitations | fait | 27 tests RLS, 12 tests d'intégration, parcours Playwright |
| 3. Tableau de bord, fiches | fait | captures manager et collaborateur |
| 4. Entretiens | fait | parcours Playwright complet (préparation, côte à côte, clôture, double signature) |
| 5. Objectifs, compétences, feedback, météo | fait | tests des statuts, captures |
| 6. Charge, tâches, absences, réunions, délégation | fait | glisser-déposer vérifié, captures |
| 7. Alertes et rapports PDF | fait | 8 tests d'alertes, rapports PDF |
| 8. Revue finale | faite | 105 captures examinées (clair/sombre × desktop/tablette), correctifs appliqués |

État des contrôles au dernier passage : `tsc` sans erreur (application et outillage), ESLint sans avertissement, Vitest 73/73, Playwright 4/4 + captures.

## Résumé final

### Ce qui a été construit

- **Design system** : tokens Tailwind remplaçant ceux par défaut (palette ardoise sur 10 nuances, un accent bleu profond, statuts désaturés, échelle 12–24 px, grille de 4 px, rayons ≤ 8 px), composants shadcn/ui restylés, mode clair et sombre, page de référence `/dev/composants`.
- **Coquille** : barre latérale repliable adaptée au rôle, en-tête avec recherche globale (Ctrl/Cmd+K), sélecteur de période, alertes ou rappels, menu du profil et thème ; fil d'Ariane et actions principales en haut à droite sur chaque page.
- **Authentification** : connexion, mot de passe oublié, invitation par le manager avec définition du mot de passe, règles de mot de passe, déconnexion après 30 minutes d'inactivité, journal des connexions.
- **Base de données** : 27 tables, RLS sur toutes, fonctions `security definer` pour les écritures partielles (avancement des objectifs, auto-évaluation, préparation et signature des entretiens), garde de colonnes, compte-rendu figé après double signature.
- **Modules** : tous ceux du SPEC, côté manager et côté collaborateur.
- **Exports** : PDF (compte-rendu signé, fiche collaborateur, rapport mensuel), sauvegarde JSON et CSV.
- **Démonstration embarquée** : utilisable sans serveur ni compte, publiable en site statique.

### Décisions notables

Voir DECISIONS.md, en particulier n° 1 (backend embarqué), n° 14 (hachage de démonstration) et n° 15 (routeur en mémoire).

### Limites connues

- Dans la démonstration, les données vivent dans le navigateur de chaque visiteur : deux personnes ne voient pas les modifications l'une de l'autre.
- Dans un artefact claude.ai, le téléchargement de fichiers (PDF, CSV, JSON) est bloqué par le cadre d'affichage ; il fonctionne en local et une fois déployé.
- Les rappels « 3 jours avant l'entretien » sont affichés dans l'application (cloche, tableau de bord), pas envoyés par e-mail.
- Pas de stockage de fichiers (pièces jointes) : le SPEC n'en décrit pas l'usage ; le bucket est à ajouter si besoin.
- Captures de revue limitées au desktop et à la tablette ; l'usage téléphone est fonctionnel mais non optimisé.

### Pistes d'amélioration

- Envoi des rappels par e-mail (fonction planifiée `pg_cron` + Edge Function).
- Pièces jointes aux entretiens dans Supabase Storage.
- Historique des modifications (audit) sur les objectifs et les comptes-rendus.
- Mode multi-équipes (plusieurs managers, organigramme).
