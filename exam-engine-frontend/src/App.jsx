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
import AdminDashboard from './pages/admin/Dashboard';
import AdminAttempts from './pages/admin/Attempts';
import AdminReview from './pages/admin/Review';
import AdminCandidates from './pages/admin/Candidates';
import AdminExams from './pages/admin/Exams';
import AdminAuthoring from './pages/admin/Authoring';
import AdminSettings from './pages/admin/Settings';

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
          <Route index element={<AdminDashboard />} />
          <Route path="attempts" element={<AdminAttempts />} />
          <Route path="review" element={<AdminReview />} />
          <Route path="candidates" element={<AdminCandidates />} />
          <Route path="exams" element={<AdminExams />} />
          <Route path="authoring" element={<AdminAuthoring />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        {/* Redirects */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}
