import React from "react";
import { Route } from "react-router-dom";
import CandidateDashboard from "../pages/Dashboard";
import CandidateCatalog from "../pages/Catalog";
import CandidateResults from "../pages/Results";
import CandidateHelp from "../pages/Help";
import CandidateInstructions from "../pages/Instructions";
import CandidateSystemCheck from "../pages/SystemCheck";
import CandidateResultView from "../pages/ResultView";
import CandidateTerminatedView from "../pages/TerminatedView";
import ExamRunner from "../pages/ExamRunner";

export default function CandidateRoutes() {
  return (
    <>
      <Route index element={<CandidateDashboard />} />
      <Route path="catalog" element={<CandidateCatalog />} />
      <Route path="results" element={<CandidateResults />} />
      <Route path="help" element={<CandidateHelp />} />
      <Route path="instructions/:examId" element={<CandidateInstructions />} />
      <Route path="check/:examId" element={<CandidateSystemCheck />} />
      <Route path="result-view/:attemptId" element={<CandidateResultView />} />
      <Route path="terminated" element={<CandidateTerminatedView />} />
    </>
  );
}

export { ExamRunner };
