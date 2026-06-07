import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../lib/firebase/useAuth";

const navItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/today", label: "Today" },
  { to: "/logs", label: "Logs" },
  { to: "/metrics", label: "Metrics" },
  { to: "/goals", label: "Goals" },
  { to: "/dashboards", label: "Dashboards" },
  { to: "/settings", label: "Settings" },
  { to: "/kiosk", label: "Kiosk" }
] as const;

export function AppLayout() {
  const { status, userId } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">KPI</span>
          <span>Personal Dashboard</span>
        </div>
        <nav className="nav-list" aria-label="Primary">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="auth-state">
          <span>{status === "loading" ? "Authenticating" : "User scope"}</span>
          <strong>{userId ?? "Pending"}</strong>
        </div>
      </aside>
      <main className="page-surface">
        <Outlet />
      </main>
    </div>
  );
}
