// A1 — route wiring for Authoring, Catalogue & Governance
//
// Login lives outside the guarded shell; everything else mounts inside
// <RequireAdmin><AdminShell>...</AdminShell></RequireAdmin>. A1 and A2
// share the same shell/guard/tokens (Task 1 is joint Day-1 setup), so both
// route sets are typically combined inside one <Routes> tree. Example:
//
//   import { AuthProvider, RequireAdmin } from "./a1/AuthContext";
//   import AdminShell from "./a1/AdminShell";
//   import LoginPage from "./a1/LoginPage";
//   import A1Routes from "./a1/A1Routes";
//   import A2Routes, { A2ShellExtras } from "./a2/A2Routes"; // if A2 is mounted too
//
//   <AuthProvider>
//     <Routes>
//       <Route path="/admin/login" element={<LoginPage />} />
//       <Route
//         path="/admin/*"
//         element={
//           <RequireAdmin>
//             <AdminShell headerRight={<A2ShellExtras />}>
//               <Routes>
//                 {A1Routes()}
//                 {A2Routes()}
//               </Routes>
//             </AdminShell>
//           </RequireAdmin>
//         }
//       />
//     </Routes>
//   </AuthProvider>

import React from "react";
import { Route, Navigate } from "react-router-dom";
import ExamsLibraryPage from "./ExamsLibraryPage";
import AuthoringPage from "./Authoringpage";
import QuestionBankPage from "./QuestionBankPage";
import CandidatesPage from "./CandidatesPage";
import GovernanceSettingsPage from "./Goveranancsettingspage";

export default function A1Routes() {
    return (
        <>
            <Route path="/admin" element={<Navigate to="/admin/exams" replace />} />
            <Route path="/admin/exams" element={<ExamsLibraryPage />} />
            <Route path="/admin/authoring" element={<AuthoringPage />} />
            <Route path="/admin/questions" element={<QuestionBankPage />} />
            <Route path="/admin/candidates" element={<CandidatesPage />} />
            <Route path="/admin/governance" element={<GovernanceSettingsPage />} />
        </>
    );
}