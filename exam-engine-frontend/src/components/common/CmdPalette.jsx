import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight } from 'lucide-react';

export default function CmdPalette({ show, onClose, role }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  const candidateCommands = [
    { path: '/candidate', label: 'Dashboard' },
    { path: '/candidate/catalog', label: 'Exam catalogue' },
    { path: '/candidate/results', label: 'My results' },
    { path: '/candidate/help', label: 'Exam rules & help' }
  ];

  const adminCommands = [
    { path: '/admin', label: 'Dashboard' },
    { path: '/admin/attempts', label: 'Attempts' },
    { path: '/admin/review', label: 'Review & flags' },
    { path: '/admin/candidates', label: 'Candidates' },
    { path: '/admin/exams', label: 'Exams library' },
    { path: '/admin/authoring', label: 'Exam authoring' },
    { path: '/admin/settings', label: 'Governance & retention' }
  ];

  const commands = role === 'ROLE_ADMIN' ? adminCommands : candidateCommands;

  const filteredCommands = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (show) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [show]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!show) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          navigate(filteredCommands[selectedIndex].path);
          onClose();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [show, filteredCommands, selectedIndex, navigate, onClose]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0b1f38]/50 backdrop-blur-[3px] flex items-start justify-center pt-[14vh]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="cmdk-box w-[560px] max-w-[92vw] bg-white rounded-2xl shadow-2xl overflow-hidden animate-[pop_0.2s_ease]">
        <div className="cmdk-in flex items-center gap-3 px-[18px] py-4 border-b border-[#EEF2F8]">
          <Search className="w-[18px] h-[18px] text-[#8A99AE]" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Jump to a screen or action..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="flex-1 border-none outline-none text-[15px] text-[#0E1B2E] placeholder-[#8A99AE]"
          />
          <kbd className="font-mono text-[11px] text-[#8A99AE] border border-[#E4EAF2] rounded-md px-1.5 py-0.5">ESC</kbd>
        </div>

        <div className="cmdk-list max-h-[340px] overflow-y-auto p-2">
          {filteredCommands.length > 0 ? (
            filteredCommands.map((cmd, i) => (
              <div
                key={cmd.path}
                onClick={() => {
                  navigate(cmd.path);
                  onClose();
                }}
                className={`cmdk-item flex items-center gap-3 p-3 rounded-xl cursor-pointer text-[13.5px] transition-all ${
                  i === selectedIndex ? 'bg-[#eef4ff] text-[#2F6BFF]' : 'text-[#0E1B2E] hover:bg-[#F4F7FC]'
                }`}
              >
                <span className="ic w-[30px] h-[30px] rounded-lg bg-[#F4F7FC] flex items-center justify-center text-[#2F6BFF]">
                  <ChevronRight className="w-4 h-4" />
                </span>
                <span className="font-medium">{cmd.label}</span>
                <span className="rl ml-auto font-mono text-[10.5px] text-[#8A99AE] uppercase tracking-wider">
                  {role === 'ROLE_ADMIN' ? 'admin' : 'candidate'}
                </span>
              </div>
            ))
          ) : (
            <div className="p-[18px] text-center text-[#8A99AE] text-[13px]">No matches found</div>
          )}
        </div>
      </div>
    </div>
  );
}
