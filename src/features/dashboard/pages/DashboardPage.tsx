import { useCurrentUser } from '@/features/auth/AuthProvider';
import { CollaboratorDashboard } from '../components/CollaboratorDashboard';
import { ManagerDashboard } from '../components/ManagerDashboard';

/** Le tableau de bord s'adapte au rôle connecté. */
export default function DashboardPage() {
  const { isManager } = useCurrentUser();
  return isManager ? <ManagerDashboard /> : <CollaboratorDashboard />;
}
