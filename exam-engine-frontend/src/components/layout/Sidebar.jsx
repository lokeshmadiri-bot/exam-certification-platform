import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldAlert,
  LayoutDashboard,
  BookOpen,
  Award,
  HelpCircle,
  Users,
  Settings,
  ClipboardList,
  AlertTriangle,
  BookMarked,
  LogOut
} from 'lucide-react';
import { authService } from '../../modules/candidate/services/api';

export default function Sidebar({ user, onNavClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const role = user?.role || 'ROLE_CANDIDATE';

  const isActive = (path) => {
    return location.pathname === path;
  };

  const handleNav = (path) => {
    navigate(path);
    if (onNavClose) onNavClose();
  };

  const handleSignout = () => {
    authService.logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar flex flex-col h-screen sticky top-0 bg-gradient-to-b from-[#0B1F38] to-[#0a1a30] text-[#cdd9ea] p-5 w-[248px] shrink-0 z-40">
      {/* Brand */}
      <div className="sb-brand flex items-center gap-[11px] pb-[18px] px-2">
        <div className="glyph w-9 h-9 rounded-lg bg-gradient-to-br from-[#2F6BFF] to-[#5b8cff] flex items-center justify-center shadow-[0_6px_16px_rgba(47,107,255,0.27)]">
          <ShieldAlert className="w-5 h-5 text-white" />
        </div>
        <div>
          <b className="font-display text-white text-[15.5px] font-bold">Certify</b>
          <small className="text-[#7e93b4] text-[10.5px] block font-mono tracking-wider font-semibold">ORYFOLKS</small>
        </div>
      </div>

      {/* Navigations */}
      <div className="flex-1 overflow-y-auto mt-4">
        {role === 'ROLE_CANDIDATE' ? (
          <nav className="space-y-1">
            <div className="sb-section text-[#62789b] text-[10.5px] tracking-[1.4px] uppercase font-mono font-semibold mx-2.5 mb-2">Candidate Workspace</div>
            <button
              onClick={() => handleNav('/candidate')}
              className={`nav-item ${isActive('/candidate') ? 'active' : ''}`}
            >
              <LayoutDashboard />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => handleNav('/candidate/catalog')}
              className={`nav-item ${isActive('/candidate/catalog') ? 'active' : ''}`}
            >
              <BookOpen />
              <span>Exam catalogue</span>
            </button>
            <button
              onClick={() => handleNav('/candidate/results')}
              className={`nav-item ${isActive('/candidate/results') ? 'active' : ''}`}
            >
              <Award />
              <span>My results</span>
            </button>
            <button
              onClick={() => handleNav('/candidate/help')}
              className={`nav-item ${isActive('/candidate/help') ? 'active' : ''}`}
            >
              <HelpCircle />
              <span>Rules &amp; help</span>
            </button>
          </nav>
        ) : (
          <nav className="space-y-1">
            <div className="sb-section text-[#62789b] text-[10.5px] tracking-[1.4px] uppercase font-mono font-semibold mx-2.5 mb-2">Oversight</div>
            <button
              onClick={() => handleNav('/admin/dashboard')}
              className={`nav-item ${isActive('/admin/dashboard') || isActive('/admin') ? 'active' : ''}`}
            >
              <LayoutDashboard />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => handleNav('/admin/attempts')}
              className={`nav-item ${isActive('/admin/attempts') ? 'active' : ''}`}
            >
              <ClipboardList />
              <span>Attempts</span>
            </button>
            <button
              onClick={() => handleNav('/admin/review')}
              className={`nav-item ${isActive('/admin/review') ? 'active' : ''}`}
            >
              <AlertTriangle />
              <span>Review &amp; flags</span>
            </button>
            <div className="sb-section text-[#62789b] text-[10.5px] tracking-[1.4px] uppercase font-mono font-semibold mx-2.5 mt-5 mb-2">Configure</div>
            <button
              onClick={() => handleNav('/admin/candidates')}
              className={`nav-item ${isActive('/admin/candidates') ? 'active' : ''}`}
            >
              <Users />
              <span>Candidates</span>
            </button>
            <button
              onClick={() => handleNav('/admin/exams')}
              className={`nav-item ${isActive('/admin/exams') ? 'active' : ''}`}
            >
              <BookMarked />
              <span>Exams library</span>
            </button>
            <button
              onClick={() => handleNav('/admin/authoring')}
              className={`nav-item ${isActive('/admin/authoring') ? 'active' : ''}`}
            >
              <ClipboardList />
              <span>Exam authoring</span>
            </button>
            <button
              onClick={() => handleNav('/admin/questions')}
              className={`nav-item ${isActive('/admin/questions') ? 'active' : ''}`}
            >
              <BookOpen />
              <span>Question Bank</span>
            </button>
            <button
              onClick={() => handleNav('/admin/governance')}
              className={`nav-item ${isActive('/admin/governance') || isActive('/admin/settings') ? 'active' : ''}`}
            >
              <Settings />
              <span>Governance &amp; Settings</span>
            </button>
          </nav>
        )}
      </div>

      {/* Footer / Sign out */}
      <div className="sb-foot border-t border-[#ffffff14] pt-3 mt-auto">
        <button
          onClick={handleSignout}
          className="signout mt-1 text-[#8fa3c4] hover:text-white text-[12px] flex items-center gap-2 py-1.5 px-1.5 rounded-lg w-full transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
