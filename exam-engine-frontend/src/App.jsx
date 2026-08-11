import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';

// Auth Pages
import Login from './pages/Login';

// Candidate Pages (Consolidated)
import CandidateDashboard from './modules/candidate/pages/Dashboard';
import CandidateCatalog from './modules/candidate/pages/Catalog';
import CandidateResults from './modules/candidate/pages/Results';
import CandidateHelp from './modules/candidate/pages/Help';
import CandidateInstructions from './modules/candidate/pages/Instructions';
import CandidateSystemCheck from './modules/candidate/pages/SystemCheck';
import ExamRunner from './modules/candidate/pages/ExamRunner';
import CandidateResultView from './modules/candidate/pages/ResultView';
import CandidateTerminatedView from './modules/candidate/pages/TerminatedView';

// Admin Pages (Consolidated)
import AdminDashboard from './modules/admin/pages/AdminDashboard';
import AdminAttempts from './modules/admin/pages/AttemptsPage';
import AdminReview from './modules/admin/pages/AttemptReviewPage';
import CandidatesPage from './modules/admin/pages/CandidatesPage';
import ExamsLibraryPage from './modules/admin/pages/ExamsLibraryPage';
import AuthoringPage from './modules/admin/pages/Authoringpage';
import QuestionBankPage from './modules/admin/pages/QuestionBankPage';
import GovernanceSettingsPage from './modules/admin/pages/Goveranancesettingspage';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Auth Route */}
        <Route path="/login" element={<Login />} />

        {/* Candidate Routes */}
        <Route path="/candidate" element={<Layout title="Dashboard" />}>
          <Route index element={<CandidateDashboard />} />
          <Route path="catalog" element={<CandidateCatalog />} />
          <Route path="results" element={<CandidateResults />} />
          <Route path="help" element={<CandidateHelp />} />
          <Route path="instructions/:examId" element={<CandidateInstructions />} />
          <Route path="check/:examId" element={<CandidateSystemCheck />} />
          <Route path="result-view/:attemptId" element={<CandidateResultView />} />
          <Route path="terminated" element={<CandidateTerminatedView />} />
        </Route>

        {/* Proctored Exam Runner Overlay (No Sidebar/Topbar Shell) */}
        <Route path="/candidate/exam-runner/:attemptId" element={<ExamRunner />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<Layout title="Admin Panel" />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="attempts" element={<AdminAttempts />} />
          <Route path="attempts/:attemptId/review" element={<AdminReview />} />
          <Route path="review" element={<Navigate to="/admin/attempts?result=NEEDS_REVIEW" replace />} />
          <Route path="candidates" element={<CandidatesPage />} />
          <Route path="exams" element={<ExamsLibraryPage />} />
          <Route path="authoring" element={<AuthoringPage />} />
          <Route path="questions" element={<QuestionBankPage />} />
          <Route path="governance" element={<GovernanceSettingsPage />} />
          <Route path="settings" element={<GovernanceSettingsPage />} />
        </Route>

        {/* Redirects */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}
