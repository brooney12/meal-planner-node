import { useState } from "react";
import { useAuth } from "./context/AuthContext";
import AuthPage from "./pages/AuthPage";
import PlannerPage from "./pages/PlannerPage";
import AddMealModal from "./components/AddMealModal";
import styles from "./App.module.css";

export default function App() {
  const { user, logout } = useAuth();
  const [addMealOpen, setAddMealOpen] = useState(false);
  const [mealRefreshKey, setMealRefreshKey] = useState(0);

  if (!user) return <AuthPage />;

  return (
    <div>
      <header className={styles.header}>
        <span className={styles.logo}></span>
        <div className={styles.headerRight}>
          <button className={styles.addMealBtn} onClick={() => setAddMealOpen(true)}>+ Add meal</button>
          <span className={styles.username}>👤 {user.username}</span>
          <button className={styles.logoutBtn} onClick={logout}>Log out</button>
        </div>
      </header>
      <main>
        <PlannerPage mealRefreshKey={mealRefreshKey} />
      </main>
      {addMealOpen && (
        <AddMealModal
          onClose={() => setAddMealOpen(false)}
          onCreated={() => setMealRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
}
