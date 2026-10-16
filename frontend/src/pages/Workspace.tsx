import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { Login } from "../features/auth/Login";
import { AnalyticsPanel } from "../features/analytics/AnalyticsPanel";
import { ManagementPanel } from "../features/management/ManagementPanel";
import { authSlice, contentApi, useLogoutMutation } from "../store/api";
export function Workspace({ mode }: { mode: "analytics" | "management" }) {
  const access = useSelector(
    (state: { auth: { access: string } }) => state.auth.access,
  );
  const [loggedIn, setLoggedIn] = useState(!!access);
  const dispatch = useDispatch();
  const [logout] = useLogoutMutation();
  useEffect(() => {
    document.title = `TerraKlink · ${mode === "analytics" ? "Аналитика" : "Управление"}`;
    document.head
      .querySelector('meta[name="robots"]')
      ?.setAttribute("content", "noindex, nofollow");
    document.head
      .querySelectorAll('link[rel="canonical"], link[hreflang], #site-schema')
      .forEach((e) => e.remove());
  }, [mode]);
  if (!loggedIn) return <Login onSuccess={() => setLoggedIn(true)} />;
  return (
    <div className="workspace container">
      <nav className="workspace-nav">
        <Link to="/">TerraKlink</Link>
        <Link to="/admin">Редактор</Link>
        <Link to="/analytics">Аналитика</Link>
        <Link to="/management">Управление</Link>
        <button
          className="text-button"
          onClick={async () => {
            try {
              await logout().unwrap();
            } finally {
              dispatch(authSlice.actions.setAccess(""));
              dispatch(contentApi.util.resetApiState());
              setLoggedIn(false);
            }
          }}
        >
          Выйти
        </button>
      </nav>
      {mode === "analytics" ? <AnalyticsPanel /> : <ManagementPanel />}
    </div>
  );
}
