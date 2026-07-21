import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';

// Auth Pages
import Login from './pages/Login';

// Candidate Pages
import CandidateDashboard from './pages/candidate/Dashboard';
import CandidateCatalog from './pages/candidate/Catalog';
import CandidateResults from './pages/candidate/Results';
import CandidateHelp from './pages/candidate/Help';
import CandidateInstructions from './pages/candidate/Instructions';
import CandidateSystemCheck from './pages/candidate/SystemCheck';
import ExamRunner from './pages/ExamRunner';
import CandidateResultView from './pages/candidate/ResultView';
import CandidateTerminatedView from './pages/candidate/TerminatedView';

// Admin Pages
import AdminDashboard from './admin/a2/AdminDashboard';
import AdminAttempts from './admin/a2/AttemptsPage';
import AdminReview from './admin/a2/AttemptReviewPage';
import CandidatesPage from './admin/a2/a1/CandidatesPage';
import ExamsLibraryPage from './admin/a2/a1/ExamsLibraryPage';
import AuthoringPage from './admin/a2/a1/Authoringpage';
import QuestionBankPage from './admin/a2/a1/QuestionBankPage';
import GovernanceSettingsPage from './admin/a2/a1/Goveranancesettingspage';

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
