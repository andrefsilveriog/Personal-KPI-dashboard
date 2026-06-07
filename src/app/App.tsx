import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./layouts/AppLayout";
import { KioskLayout } from "./layouts/KioskLayout";
import { AuthProvider } from "../lib/firebase/AuthProvider";
import { PlaceholderPage } from "../components/PlaceholderPage";
import { SettingsPage } from "../features/settings/SettingsPage";
import { QuickEntryPage } from "../features/entries/QuickEntryPage";
import { FullEntryPage } from "../features/entries/FullEntryPage";
import { DashboardPage } from "../features/dashboard/DashboardPage";

const routerBasename = import.meta.env.BASE_URL === "/" ? "/" : import.meta.env.BASE_URL.replace(/\/$/, "");

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={routerBasename}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/today" element={<QuickEntryPage />} />
            <Route path="/logs" element={<FullEntryPage />} />
            <Route
              path="/metrics"
              element={<PlaceholderPage title="Metrics" description="Metric metadata management will render here." />}
            />
            <Route path="/goals" element={<PlaceholderPage title="Goals" description="Versioned goals will render here." />} />
            <Route
              path="/dashboards"
              element={<PlaceholderPage title="Dashboards" description="Dashboard layouts and widgets will render here." />}
            />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route element={<KioskLayout />}>
            <Route path="/kiosk" element={<DashboardPage dashboardType="kiosk" kioskMode />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
