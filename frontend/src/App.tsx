import { useAuth } from "./context/AuthContext";
import AuthPage from "./pages/AuthPage";
import PlannerPage from "./pages/PlannerPage";
import styles from "./App.module.css";

export default function App() {
  const { user, logout } = useAuth();

  if (!user) return <AuthPage />;

  return (
    <div>
      <header className={styles.header}>
        <span className={styles.logo}></span>
        <div className={styles.headerRight}>
          <span className={styles.username}>👤 {user.username}</span>
          <button className={styles.logoutBtn} onClick={logout}>Log out</button>
        </div>
      </header>
      <main>
        <PlannerPage />
      </main>
    </div>
  );
}
