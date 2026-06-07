import { Outlet } from "react-router-dom";

export function KioskLayout() {
  return (
    <main className="kiosk-shell">
      <Outlet />
    </main>
  );
}
