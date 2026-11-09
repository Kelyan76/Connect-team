import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, createMemoryRouter, Navigate, Outlet, useLocation, type RouteObject } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';
import { isLocalBackend } from '@/shared/lib/supabase';
import { AuthenticatedLayout } from './shell/AuthenticatedLayout';
import { BootScreen } from './shell/BootScreen';
import { PageSkeleton } from './shell/PageSkeleton';

const page = (factory: () => Promise<{ default: React.ComponentType }>) => {
  const Component = lazy(factory);
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Component />
    </Suspense>
  );
};

function RequireAuth() {
  const { state } = useAuth();
  const location = useLocation();
  if (state.status === 'loading') return <BootScreen />;
  if (state.status !== 'signed_in') return <Navigate to="/connexion" replace state={{ from: location.pathname }} />;
  return <AuthenticatedLayout />;
}

/** Routes réservées au manager : un collaborateur est renvoyé vers son tableau de bord. */
function ManagerOnly({ children }: { children?: ReactNode }) {
  const { state } = useAuth();
  if (state.status === 'signed_in' && state.profile.role !== 'manager') return <Navigate to="/" replace />;
  return children ?? <Outlet />;
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { state } = useAuth();
  if (state.status === 'loading') return <BootScreen />;
  return children;
}

const routes: RouteObject[] = [
  { path: '/connexion', element: <PublicOnly>{page(() => import('@/features/auth/pages/LoginPage'))}</PublicOnly> },
  { path: '/inscription', element: <PublicOnly>{page(() => import('@/features/auth/pages/SignupPage'))}</PublicOnly> },
  { path: '/mot-de-passe-oublie', element: page(() => import('@/features/auth/pages/ForgotPasswordPage')) },
  { path: '/nouveau-mot-de-passe', element: <PublicOnly>{page(() => import('@/features/auth/pages/NewPasswordPage'))}</PublicOnly> },
  ...(isLocalBackend
    ? [
        { path: '/lien', element: page(() => import('@/features/auth/pages/EmailLinkPage')) },
        { path: '/boite-mail', element: page(() => import('@/features/auth/pages/MailboxPage')) },
      ]
    : []),
  {
    element: <RequireAuth />,
    children: [
      { path: '/', element: page(() => import('@/features/dashboard/pages/DashboardPage')) },
      { path: '/entretiens', element: page(() => import('@/features/reviews/pages/ReviewsPage')) },
      { path: '/entretiens/:id', element: page(() => import('@/features/reviews/pages/ReviewPage')) },
      { path: '/objectifs', element: page(() => import('@/features/objectives/pages/ObjectivesPage')) },
      { path: '/competences', element: page(() => import('@/features/skills/pages/SkillsPage')) },
      { path: '/feedbacks', element: page(() => import('@/features/feedback/pages/FeedbackPage')) },
      { path: '/pouls', element: page(() => import('@/features/pulse/pages/PulsePage')) },
      // Ancienne page Météo : remplacée par le pouls.
      { path: '/meteo', element: <Navigate to="/pouls" replace /> },
      { path: '/taches', element: page(() => import('@/features/tasks/pages/TasksPage')) },
      { path: '/plan-de-charge', element: page(() => import('@/features/workload/pages/WorkloadPage')) },
      { path: '/absences', element: page(() => import('@/features/absences/pages/AbsencesPage')) },
      { path: '/delegation', element: page(() => import('@/features/delegation/pages/DelegationPage')) },
      { path: '/ethique', element: page(() => import('@/features/ethics/pages/EthicsPage')) },
      { path: '/profil', element: page(() => import('@/features/settings/pages/ProfilePage')) },
      {
        element: <ManagerOnly />,
        children: [
          { path: '/equipe', element: page(() => import('@/features/team/pages/TeamPage')) },
          { path: '/equipe/:id', element: page(() => import('@/features/team/pages/PersonPage')) },
          { path: '/entretiens/trames', element: page(() => import('@/features/reviews/pages/TemplatesPage')) },
          { path: '/leviers', element: page(() => import('@/features/dream/pages/DreamPage')) },
          { path: '/posture', element: page(() => import('@/features/posture/pages/PosturePage')) },
          { path: '/alertes', element: page(() => import('@/features/alerts/pages/AlertsPage')) },
          { path: '/reunions', element: page(() => import('@/features/meetings/pages/MeetingsPage')) },
          { path: '/reunions/:id', element: page(() => import('@/features/meetings/pages/MeetingPage')) },
          { path: '/rapports', element: page(() => import('@/features/reports/pages/ReportsPage')) },
          { path: '/parametres', element: page(() => import('@/features/settings/pages/SettingsPage')) },
          { path: '/dev/composants', element: page(() => import('@/features/design-system/pages/ComponentsPage')) },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
];

// Routeur en mémoire pour une diffusion en fichier statique (pas de réécriture d'URL côté serveur).
export const router =
  import.meta.env.VITE_ROUTER === 'memory' ? createMemoryRouter(routes, { initialEntries: ['/'] }) : createBrowserRouter(routes);
