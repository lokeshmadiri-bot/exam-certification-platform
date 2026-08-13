import React from "react";
import { Route, Navigate } from "react-router-dom";
import AdminDashboard from "../pages/AdminDashboard";
import AttemptsPage from "../pages/AttemptsPage";
import AttemptReviewPage from "../pages/AttemptReviewPage";
import ExamsLibraryPage from "../pages/ExamsLibraryPage";
import AuthoringPage from "../pages/Authoringpage";
import QuestionBankPage from "../pages/QuestionBankPage";
import CandidatesPage from "../pages/CandidatesPage";
import GovernanceSettingsPage from "../pages/Goveranancesettingspage";
import CommandPalette from "../components/CommandPalette";
import NotificationsPanel from "../components/NotificationsPanel";

export default function AdminRoutes() {
  return (
    <>
      <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/admin/attempts" element={<AttemptsPage />} />
      <Route path="/admin/attempts/:attemptId/review" element={<AttemptReviewPage />} />
      <Route path="/admin/exams" element={<ExamsLibraryPage />} />
      <Route path="/admin/authoring" element={<AuthoringPage />} />
      <Route path="/admin/questions" element={<QuestionBankPage />} />
      <Route path="/admin/candidates" element={<CandidatesPage />} />
      <Route path="/admin/governance" element={<GovernanceSettingsPage />} />
    </>
  );
}

export function AdminShellExtras() {
  return (
    <>
      <NotificationsPanel />
      <CommandPalette />
    </>
  );
}
