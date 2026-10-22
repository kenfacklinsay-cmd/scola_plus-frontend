import { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  BookOpen,
  CalendarDays,
  ChartNoAxesColumn,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  UserRoundCog,
  Users,
  Wallet,
} from 'lucide-react';
import api from '../../api/axios';
import '../css/RoleDashboards.css';

const roleNavigation = {
  SECRETARIAT: [
    { id: 'overview', label: 'Vue d’ensemble', to: '/dashboard', icon: LayoutDashboard },
    { id: 'students', label: 'Inscriptions et élèves', to: '/students', icon: Users },
    { id: 'accounts', label: 'Gestion des comptes', to: '/dashboard/accounts', icon: UserRoundCog },
    { id: 'schedule', label: 'Emploi du temps', to: '/dashboard/schedule', icon: CalendarDays },
  ],
  COMPTABILITE: [
    { id: 'overview', label: 'Vue d’ensemble', icon: LayoutDashboard },
    { id: 'payments', label: 'Paiements', icon: Wallet },
    { id: 'fees', label: 'Frais scolaires', icon: ChartNoAxesColumn },
  ],
  PARENT: [
    { id: 'children', label: 'Mes enfants', icon: Users },
    { id: 'finance', label: 'Situation financière', icon: Wallet },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ],
};

export default function RoleDashboardLayout({
  user,
  title,
  description,
  isLoading = false,
  error = '',
  onRetry,
  navigation = [],
  activeNavigation,
  onNavigationChange,
  children,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const fullName = [user.firstname, user.lastname].filter(Boolean).join(' ');
  const roleItems = navigation.length > 0 ? navigation : roleNavigation[user.role] ?? [];

  async function handleLogout() {
    setIsLoggingOut(true);
    setLogoutError('');

    try {
      await api.post('/logout');
      navigate('/login', { replace: true });
    } catch (logoutError) {
      if (logoutError.response?.status === 401) {
        navigate('/login', { replace: true });
        return;
      }
      setLogoutError(logoutError.response?.data?.message || 'La déconnexion a échoué.');
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <main className="role-dashboard">
      <div className="role-dashboard-shell">
        <aside className="role-dashboard-sidebar">
          <Link className="role-dashboard-brand" to="/dashboard">
            <span>S+</span> ScolaPlus
          </Link>
          <p className="role-dashboard-nav-title">ESPACE {user.role}</p>
          <nav aria-label="Navigation de l’espace">
            {roleItems.map((item) => {
              const Icon = item.icon ?? (user.role === 'ENSEIGNANT' ? BookOpen : GraduationCap);
              const active = item.to
                ? (item.to === '/dashboard'
                  ? location.pathname === item.to
                  : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`))
                : activeNavigation === item.id;

              return item.to ? (
                <NavLink
                  className={`role-dashboard-nav-link${active ? ' active' : ''}`}
                  to={item.to}
                  key={item.id}
                  end={item.to === '/dashboard'}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span>{item.label}</span>
                </NavLink>
              ) : (
                <button
                  className={`role-dashboard-nav-link${active ? ' active' : ''}`}
                  type="button"
                  key={item.id}
                  onClick={() => onNavigationChange?.(item.id)}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
          <div className="role-dashboard-sidebar-account">
            <span className="role-dashboard-sidebar-avatar">
              {[user.firstname?.[0], user.lastname?.[0]].filter(Boolean).join('').toUpperCase() || 'S+'}
            </span>
            <span className="role-dashboard-sidebar-name">
              <strong>{fullName}</strong>
              <span>{user.role}</span>
            </span>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              aria-label="Se déconnecter"
            >
              <LogOut size={17} />
            </button>
          </div>
        </aside>
        <div className="role-dashboard-main">
          <header className="role-dashboard-header">
            <div className="role-dashboard-header-context">
              <strong>{title}</strong>
              <span>Espace {user.role}</span>
            </div>
            <div className="role-dashboard-account">
              <span>{fullName}</span>
            </div>
          </header>
          <section className="role-dashboard-content">
            <div className="role-dashboard-heading">
              <div>
                <p className="role-dashboard-eyebrow">ESPACE {user.role}</p>
                <h1>{title}</h1>
                <p>{description}</p>
              </div>
            </div>
            {(error || logoutError) && (
              <div className="role-dashboard-error" role="alert">
                <span>{error || logoutError}</span>
                {error && onRetry && <button type="button" onClick={onRetry}>Réessayer</button>}
              </div>
            )}
            {isLoading ? <p className="role-dashboard-state">Chargement des données…</p> : children}
          </section>
        </div>
      </div>
    </main>
  );
}
