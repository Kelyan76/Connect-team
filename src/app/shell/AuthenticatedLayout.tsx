import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { NotificationsMenu } from '@/features/alerts/components/NotificationsMenu';
import { useAuth, useCurrentUser } from '@/features/auth/AuthProvider';
import { DemoBanner } from '@/features/auth/components/DemoBanner';
import { useIdle } from '@/shared/hooks/use-idle';
import { AppShell } from './AppShell';
import { PageSkeleton } from './PageSkeleton';
import { useSearchEntries } from './use-search-entries';

const IDLE_LIMIT = 30 * 60 * 1000;

export function AuthenticatedLayout() {
  const { signOut } = useAuth();
  const { profile, team, isManager } = useCurrentUser();
  const entries = useSearchEntries(isManager);
  const { pathname } = useLocation();

  // Déconnexion automatique après 30 minutes d'inactivité.
  useIdle(IDLE_LIMIT, () => void signOut('Vous avez été déconnecté après 30 minutes d’inactivité.'));

  return (
    <AppShell
      role={profile.role}
      user={{ ...profile, roleLabel: isManager ? 'Manager' : 'Collaborateur' }}
      teamName={team.company}
      onSignOut={() => void signOut()}
      searchEntries={entries}
      notifications={<NotificationsMenu />}
      banner={<DemoBanner viewerName={`${profile.first_name} ${profile.last_name}`} />}
    >
      <Suspense fallback={<PageSkeleton />}>
        {/* Chaque page entre en fondu léger vers le haut. */}
        <div key={pathname} className="animate-page-in">
          <Outlet />
        </div>
      </Suspense>
    </AppShell>
  );
}
