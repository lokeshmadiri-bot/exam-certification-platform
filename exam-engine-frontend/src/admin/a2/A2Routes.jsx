// A2 — route wiring
// Mount inside the existing admin shell (Day 1). Example:
//
//   import A2Routes, { A2ShellExtras } from "./admin/a2/A2Routes";
//
//   <AdminShell headerRight={<A2ShellExtras />}>   // bell + palette live shell-wide
//     <Routes>
//       {A2Routes()}
//       ...existing admin routes
//     </Routes>
//   </AdminShell>

import React from "react";
import { Route, Navigate } from "react-router-dom";
import AdminDashboard from "./AdminDashboard";
import AttemptsPage from "./AttemptsPage";
import AttemptReviewPage from "./AttemptReviewPage";
import CommandPalette from "./CommandPalette";
import NotificationsPanel from "./NotificationsPanel";

export default function A2Routes() {
  return (
    <>
      <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/admin/attempts" element={<AttemptsPage />} />
      <Route path="/admin/attempts/:attemptId/review" element={<AttemptReviewPage />} />
    </>
  );
}

// Cross-screen extras (Task 6) — render once in the admin shell header
export function A2ShellExtras() {
  return (
    <>
      <NotificationsPanel />
      <CommandPalette />
    </>
  );
}
