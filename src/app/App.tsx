import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./layouts/AppLayout";
import { KioskLayout } from "./layouts/KioskLayout";
import { AuthProvider } from "../lib/firebase/AuthProvider";
import { PlaceholderPage } from "../components/PlaceholderPage";
import { SettingsPage } from "../features/settings/SettingsPage";

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/dashboard"
              element={<PlaceholderPage title="Dashboard" description="Configurable KPI widgets will render here." />}
            />
            <Route path="/today" element={<PlaceholderPage title="Today" description="Dynamic quick entry will render here." />} />
            <Route path="/logs" element={<PlaceholderPage title="Logs" description="Metric entries and filters will render here." />} />
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
            <Route path="/kiosk" element={<PlaceholderPage title="Kiosk" description="Full-screen KPI display mode." />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
