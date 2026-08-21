import React, { useState, useEffect } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import CmdPalette from '../common/CmdPalette';
import CommandPalette from '../../modules/admin/components/CommandPalette';
import { authService } from '../../modules/candidate/services/api';
import AIQuestionGenerator from '../../modules/admin/components/AIQuestionGenerator';

export default function Layout({ title }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [navOpen, setNavOpen] = useState(false);
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [generatorConfig, setGeneratorConfig] = useState(null);

  const hideTopbar = location.pathname.includes('/instructions/') || location.pathname.includes('/check/');

  useEffect(() => {
    const handleOpenGenerator = (e) => {
      setGeneratorConfig(e.detail);
    };
    window.addEventListener('open-ai-generator', handleOpenGenerator);
    return () => window.removeEventListener('open-ai-generator', handleOpenGenerator);
  }, []);
  const hideSearch = 
    location.pathname.includes('/help') || 
    location.pathname.startsWith('/admin') || 
    hideTopbar;

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      navigate('/login');
    } else {
      setUser(currentUser);
    }
  }, [navigate]);

  useEffect(() => {
    if (user?.role === 'ROLE_ADMIN') return;
    const handleGlobalKeys = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [user]);

  if (!user) return null;

  return (
    <div className={`app min-h-screen grid grid-cols-[248px_1fr] transition-all duration-300 ${navOpen ? 'nav-open' : ''}`}>
      {/* Mobile Drawer Backdrop */}
      {navOpen && (
        <div
          className="scrim fixed inset-0 bg-[#0b1f38]/35 z-35 lg:hidden"
          onClick={() => setNavOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        user={user}
        onNavClose={() => setNavOpen(false)}
        className={`${
          navOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 fixed lg:sticky top-0 left-0 bottom-0 transition-transform duration-300`}
      />

      {/* Main Content Area */}
      <div className="main flex flex-col min-w-0 bg-[#F4F7FC]">
        {!hideTopbar && (
          <Topbar
            user={user}
            title={title}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            hideSearch={hideSearch}
            onMenuToggle={() => setNavOpen(!navOpen)}
            onOpenCmdPalette={() => setCmdPaletteOpen(true)}
          />
        )}
        <main className="content p-[28px_30px_48px] max-w-[1280px] w-full mx-auto">
          <Outlet context={{ user, searchQuery }} />
        </main>
      </div>

      {/* Command Palette */}
      {user?.role === 'ROLE_ADMIN' ? (
        <CommandPalette />
      ) : (
        <CmdPalette
          show={cmdPaletteOpen}
          onClose={() => setCmdPaletteOpen(false)}
          role={user?.role}
        />
      )}

      {/* Global AI Question Generator */}
      {generatorConfig && (
        <AIQuestionGenerator
          examId={generatorConfig.examId}
          exams={generatorConfig.exams}
          onClose={() => setGeneratorConfig(null)}
          onSaved={(count) => {
            setGeneratorConfig(null);
            window.dispatchEvent(new CustomEvent('ai-generator-saved', { detail: { count } }));
          }}
        />
      )}
    </div>
  );
}
