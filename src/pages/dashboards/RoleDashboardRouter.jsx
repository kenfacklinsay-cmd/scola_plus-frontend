import AccountingDashboard from './AccountingDashboard';
import ParentDashboard from './ParentDashboard';
import SecretariatDashboard from './SecretariatDashboard';
import TeacherDashboard from './TeacherDashboard';

export default function RoleDashboardRouter({ user }) {
  switch (user.role) {
    case 'ENSEIGNANT':
      return <TeacherDashboard user={user} />;
    case 'SECRETARIAT':
      return <SecretariatDashboard user={user} />;
    case 'COMPTABILITE':
      return <AccountingDashboard user={user} />;
    case 'PARENT':
      return <ParentDashboard user={user} />;
    default:
      return (
        <section className="director-role-placeholder">
          <h1>Rôle non reconnu</h1>
          <p>Le rôle « {user.role} » n’est pas associé à un espace utilisateur.</p>
        </section>
      );
  }
}
