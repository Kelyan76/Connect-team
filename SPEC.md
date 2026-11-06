# SPEC — Application de pilotage et de management d'équipe

Tu es un développeur full-stack senior et un designer UI spécialisé dans les outils B2B. Crée une application web de pilotage et de management d'équipe, destinée à un manager d'une PME industrielle et à ses collaborateurs. Le niveau attendu est celui d'un SaaS professionnel haut de gamme (référence : Linear, Stripe Dashboard, Vercel, Attio, Lattice). L'application ne doit en aucun cas avoir l'air d'un prototype généré par IA.

---

## 1. Contraintes techniques

- Stack : React + Vite + TypeScript + Tailwind CSS
- Backend : Supabase (authentification, base PostgreSQL, stockage de fichiers)
- Sécurité des données par Row Level Security (RLS) : chaque règle d'accès est appliquée côté base, pas seulement dans l'interface
- Composants UI : shadcn/ui comme base, entièrement restylés selon les design tokens
- Graphiques : Recharts
- Icônes : Lucide React
- Application responsive (desktop prioritaire, utilisable sur tablette)
- Mode clair et mode sombre
- Interface entièrement en français
- Script SQL complet fourni : création des tables, politiques RLS, jeu de données de démonstration (1 manager, 6 à 8 collaborateurs, objectifs, tâches, entretiens, feedbacks)
- Fichier .env.example pour les clés Supabase
- Export des données en JSON et CSV pour la sauvegarde

---

## 2. Design : exigences anti "vibe coding"

### Interdits explicites
- Dégradés violets ou bleu-violet, texte en dégradé, glassmorphism, halos lumineux
- Emojis dans l'interface
- Icônes systématiquement posées dans des cercles ou carrés colorés
- Cartes géantes très arrondies (rayon max 8px), ombres prononcées
- Tout centré, sections "hero" marketing, textes d'accroche génériques ("Boostez votre productivité")
- Lorem ipsum, noms fictifs type "John Doe", chiffres ronds artificiels
- Composants shadcn/ui laissés avec leur style par défaut sans adaptation
- Animations décoratives gratuites

### Système de design (à mettre en place avant tout écran)
- Design tokens centralisés (couleurs, espacements, rayons, ombres, typographie) dans la config Tailwind, aucune valeur en dur dans les composants
- Palette : neutres gris ardoise sur 10 nuances, une seule couleur d'accent (bleu profond, utilisée avec parcimonie), couleurs sémantiques désaturées pour les statuts (vert, orange, rouge)
- Typographie : Inter, échelle stricte (12 / 13 / 14 / 16 / 20 / 24 px), corps de texte en 13-14 px, chiffres en tabular-nums
- Grille d'espacement en multiples de 4 px
- Densité d'information élevée, comme un vrai outil métier : tableaux compacts, en-têtes de colonnes triables, nombres alignés à droite
- Bordures fines (1px) plutôt qu'ombres pour séparer les zones
- Hiérarchie par la taille, la graisse et le gris, pas par la couleur

### Structure de l'interface
- Barre latérale de navigation fixe, repliable
- En-tête avec recherche globale, sélecteur de période et menu du profil connecté
- Fil d'Ariane, titres de page cohérents, actions principales toujours au même endroit
- Page de connexion sobre et soignée, aux couleurs de l'application

### Détails qui font la différence
- États de chargement en skeleton, jamais de spinner plein écran
- États vides utiles (explication et action principale), états d'erreur clairs
- Raccourcis clavier : Cmd/Ctrl+K pour la palette de commandes, N pour nouvel élément, Échap pour fermer
- Confirmations pour les actions destructrices, notifications toast discrètes
- Formats français : dates "4 nov. 2026", nombres "12 450 €", semaines ISO
- Données de démonstration crédibles : prénoms et noms français variés, postes réalistes d'une PME industrielle (technicien SAV, chargé d'affaires, assistante ADV, responsable atelier, technicien de mise en service...), valeurs irrégulières
- Accessibilité : contrastes WCAG AA, navigation au clavier, focus visible, labels sur tous les champs

---

## 3. Qualité du code

- TypeScript strict, aucun "any"
- Routing : React Router, routes protégées selon le rôle
- Données serveur : TanStack Query (cache, invalidation, mises à jour optimistes)
- Formulaires : React Hook Form + Zod, validation cohérente avec les contraintes de la base
- Types de la base générés depuis Supabase (supabase gen types)
- Gestion d'erreurs systématique sur chaque appel, messages compréhensibles par un utilisateur non technique
- Architecture par fonctionnalité (features/entretiens, features/objectifs...), pas de dossier "components" fourre-tout
- Pas de fichier de plus de 300 lignes, pas de logique métier dans les composants d'affichage
- Tests : Vitest pour la logique métier (calcul des statuts, alertes, droits), Playwright pour les parcours clés (connexion manager, connexion collaborateur, préparation et validation d'un entretien)
- Test spécifique des politiques RLS : un collaborateur ne doit jamais pouvoir lire les données d'un autre ni les notes privées du manager
- ESLint et Prettier configurés, aucun avertissement
- Un commit Git par étape terminée, avec un message clair

---

## 4. Rôles et accès

### Authentification
- Connexion par e-mail et mot de passe
- Mot de passe oublié avec réinitialisation par e-mail
- Le manager crée les comptes collaborateurs : le collaborateur reçoit une invitation par e-mail et définit lui-même son mot de passe
- Règles de mot de passe : 10 caractères minimum, avec majuscule, chiffre et caractère spécial
- Déconnexion automatique après 30 minutes d'inactivité
- Journal des connexions consultable par l'administrateur

### Rôle Administrateur (manager)
- Accès à tous les modules et à toutes les fiches de son équipe
- Création, modification et désactivation des comptes collaborateurs
- Notes privées sur chaque collaborateur, jamais visibles par celui-ci
- Paramétrage des trames d'entretien, des compétences et des seuils d'alerte

### Rôle Collaborateur
- Espace personnel uniquement : ses objectifs, ses tâches, son plan de charge, ses entretiens, ses feedbacks partagés
- Saisie de sa météo hebdomadaire
- Préparation de ses propres entretiens
- Demande de congés et demande de one-to-one
- Aucun accès aux données des autres collaborateurs ni aux notes privées du manager

L'interface s'adapte au rôle : navigation, tableau de bord et actions disponibles différents selon le profil connecté.

---

## 5. Modules

### 5.1 Tableau de bord
Vue manager :
- KPI : taux d'atteinte des objectifs, charge moyenne de l'équipe, tâches en retard, entretiens à planifier ou à préparer
- Graphique d'évolution sur 6 mois, météo d'équipe moyenne
- Bloc "Alertes" généré automatiquement (voir 5.11)
- Prochains entretiens avec leur statut de préparation

Vue collaborateur :
- Ses objectifs et leur avancement, ses tâches de la semaine, son prochain entretien et son statut de préparation, les actions qui lui sont assignées

### 5.2 Équipe et fiches collaborateurs (manager)
- Liste en tableau ou en cartes, filtres par poste et par statut
- Fiche détaillée : identité, poste, date d'arrivée, objectifs, compétences, historique des entretiens, feedbacks, notes privées du manager

### 5.3 Objectifs (OKR)
- Objectifs d'équipe et individuels, résultats clés mesurables, pourcentage d'avancement
- Le collaborateur met à jour l'avancement de ses résultats clés, le manager valide
- Statut automatique (en avance, dans les temps, à risque, en retard) selon l'échéance et l'avancement

### 5.4 Matrice de compétences
- Tableau collaborateurs x compétences, niveau de 1 à 4 avec code couleur
- Auto-évaluation par le collaborateur, validation par le manager
- Mise en évidence des compétences détenues par une seule personne (risque)
- Suggestions de formation

### 5.5 Entretiens (one-to-one, annuel, professionnel)

Trames
- Trois trames par défaut, modifiables par le manager :
  - One-to-one : réussites depuis le dernier échange, difficultés et blocages, charge ressentie, besoins de soutien, sujets libres
  - Entretien annuel : bilan de l'année, atteinte des objectifs, compétences mobilisées, points forts, axes de progrès, objectifs de l'année suivante, souhaits d'évolution
  - Entretien professionnel : parcours, formations suivies, projet professionnel, besoins en formation, mobilité souhaitée
- Types de questions : texte libre, échelle de 1 à 5, choix multiple, oui/non

Planification
- Le manager planifie les entretiens, le collaborateur peut demander un one-to-one
- Rappel des entretiens annuels et professionnels selon leur échéance réglementaire

Préparation en deux temps
- Le collaborateur remplit sa partie avant l'entretien (auto-évaluation)
- Le manager remplit sa propre préparation de son côté, sans voir celle du collaborateur tant que celui-ci n'a pas validé la sienne
- Statut visible : à préparer, préparé par le collaborateur, préparé par le manager, prêt
- Rappel automatique 3 jours avant l'entretien si la préparation n'est pas faite

Aide à la préparation côté manager
- Synthèse automatique pré-remplie : objectifs en cours et leur avancement, évolution de la météo, charge des dernières semaines, feedbacks reçus, actions du dernier entretien et leur statut
- Suggestions de sujets à aborder à partir des alertes (objectif à risque, baisse de la météo, surcharge)

Pendant et après l'entretien
- Vue côte à côte des réponses manager et collaborateur, avec mise en évidence des écarts d'appréciation
- Prise de notes en direct
- Plan d'action : action, responsable, échéance ; suivi repris automatiquement au prochain one-to-one
- Validation du compte-rendu par les deux parties (signature électronique simple avec horodatage)
- Export PDF du compte-rendu signé
- Historique complet consultable par le manager et par le collaborateur concerné

### 5.6 Plan de charge
- Vue hebdomadaire par collaborateur en pourcentage de capacité
- Indicateur visuel de surcharge (> 100 %) et de sous-charge (< 60 %)

### 5.7 Tâches et projets
- Kanban (À faire, En cours, En validation, Terminé) avec glisser-déposer
- Vue liste alternative, filtres par personne, projet, priorité et échéance
- Assignation, priorité, échéance, projet de rattachement
- Le collaborateur voit et fait avancer ses propres tâches

### 5.8 Absences et congés
- Demande de congés par le collaborateur, validation ou refus par le manager
- Calendrier mensuel de l'équipe, détection des périodes où trop de personnes sont absentes

### 5.9 Météo d'équipe
- Saisie hebdomadaire par chaque collaborateur de son humeur (1 à 5) et de sa charge ressentie, avec commentaire facultatif
- Vue manager : moyenne d'équipe, évolution individuelle

### 5.10 Feedback continu et reconnaissance
- Feedbacks horodatés : points forts, axes de progrès, reconnaissance
- Le manager choisit si un feedback est partagé avec le collaborateur ou reste privé
- Les feedbacks alimentent automatiquement la préparation des entretiens

### 5.11 Alertes intelligentes (manager)
- Objectif à risque ou en retard
- Collaborateur sans one-to-one depuis plus de 30 jours
- Surcharge sur deux semaines consécutives
- Baisse de la météo individuelle sur trois semaines
- Entretien annuel ou professionnel à moins de 30 jours
- Entretien prévu sous 3 jours et non préparé
- Seuils paramétrables

### 5.12 Réunions et décisions
- Compte-rendu de réunion, registre des décisions, plan d'action avec responsable et échéance

### 5.13 Matrice de délégation
- Pour chaque collaborateur et chaque type de tâche : décide seul, propose puis valide, exécute
- Visible par le collaborateur concerné

### 5.14 Rapports
- Rapport mensuel d'équipe et fiche collaborateur exportables en PDF, mise en page propre

---

## 6. Méthode de travail : mode autonome

Tu travailles en autonomie complète, du début à la fin, sans attendre de validation entre les étapes. Tu ne t'arrêtes que pour un blocage réel que tu ne peux pas résoudre seul (outil manquant sur la machine, accès impossible). Dans ce cas, tu notes le blocage dans PROGRESS.md, tu contournes si possible et tu continues sur le reste.

### Environnement
- Développe contre une instance Supabase locale (Supabase CLI, `supabase start`, nécessite Docker) : aucune clé ni compte externe n'est nécessaire pendant le développement
- Les e-mails d'invitation et de réinitialisation passent par la boîte mail locale de Supabase (Inbucket/Mailpit) pour être testables
- Si Docker ou la Supabase CLI ne sont pas disponibles, signale-le une seule fois au début, puis continue avec ce qui est possible

### Fichiers de pilotage (à créer dès le départ et tenir à jour)
- CLAUDE.md : stack, conventions, commandes, règles de design
- PLAN.md : architecture des dossiers, modèle de données, politiques RLS, liste des écrans. Rédigé avant tout code, puis suivi.
- DECISIONS.md : chaque choix structurant, avec la raison en une ou deux lignes. Quand plusieurs options sont raisonnables, choisis la plus simple et la plus robuste, note-la et avance.
- PROGRESS.md : avancement phase par phase, ce qui est fait, ce qui reste, blocages éventuels

### Phases (enchaînées sans pause)
1. Socle : projet, design system, layout, composants de base, page de démonstration des composants
2. Authentification, rôles, RLS, invitations
3. Tableau de bord et fiches collaborateurs
4. Entretiens (module complet)
5. Objectifs, compétences, feedback, météo
6. Plan de charge, tâches, absences, réunions, délégation
7. Alertes et rapports PDF
8. Revue finale : cohérence visuelle de tous les écrans, tests, accessibilité, performance

### Boucle de contrôle obligatoire à la fin de chaque phase
Une phase n'est terminée que lorsque tous ces points sont vérifiés :
- `npm run build`, `npm run lint` et `npm run test` passent sans erreur ni avertissement
- Les tests Playwright des parcours concernés passent
- Les tests RLS passent (un collaborateur ne voit jamais les données d'un autre ni les notes privées)
- Revue visuelle : capture d'écran Playwright de chaque nouvel écran, en mode clair et sombre, en desktop et en tablette. Examine chaque capture et compare-la à la section 2 (interdits, système de design, détails). Corrige tout écart et refais les captures jusqu'à conformité.
- Tester chaque écran connecté en manager puis en collaborateur
- Commit Git avec un message clair, mise à jour de PROGRESS.md

### Revue finale (phase 8)
- Repasse sur tous les écrans comme un designer exigeant qui chercherait ce qui trahit une interface générée par IA, et corrige
- Vérifie la cohérence : mêmes espacements, mêmes composants, mêmes libellés d'un module à l'autre
- Vérifie que le jeu de données de démonstration rend chaque écran crédible

### Livrable final
- Application complète et fonctionnelle en local
- README : installation, lancement avec Supabase local, comptes de démonstration (manager et collaborateur), puis procédure de mise en production sur un projet Supabase hébergé (création du projet, exécution des migrations, configuration du .env, déploiement)
- Résumé final dans PROGRESS.md : ce qui a été construit, décisions notables, limites connues, pistes d'amélioration
