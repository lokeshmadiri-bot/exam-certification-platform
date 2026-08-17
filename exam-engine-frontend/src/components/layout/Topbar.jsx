import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Menu } from 'lucide-react';
import NotificationsPanel from '../../modules/admin/components/NotificationsPanel';
import { candidateService } from '../../modules/candidate/services/api';

export default function Topbar({ user, title, searchQuery, setSearchQuery, hideSearch, onMenuToggle }) {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [candidateNotifications, setCandidateNotifications] = useState([]);

  useEffect(() => {
    if (user && user.role !== 'ROLE_ADMIN') {
      async function loadNotifications() {
        try {
          const res = await candidateService.getNotifications();
          setCandidateNotifications(res.data || []);
        } catch (err) {
          console.error("Failed to load candidate notifications", err);
        }
      }
      loadNotifications();
      const interval = setInterval(loadNotifications, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    try {
      const date = new Date(timeStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  const unreadCount = candidateNotifications.filter(n => n.unread || !n.read).length;

  return (
    <header className="topbar sticky top-0 z-30 flex items-center justify-between gap-[18px] px-[30px] py-3.5 bg-white/85 backdrop-blur-[10px] border-b border-[#E4EAF2] w-full">
      <div className="flex items-center gap-[18px] flex-1">
        {/* Mobile Menu Button */}
        <button className="menu-btn lg:hidden flex items-center justify-center w-9 h-9 rounded-lg hover:bg-slate-100 text-[#5C6B82]" onClick={onMenuToggle}>
          <Menu className="w-5 h-5" />
        </button>

        {/* Breadcrumbs */}
        {title && (
          <div className="crumb text-[13px] text-[#5C6B82] font-medium hidden sm:block shrink-0">
            <b className="text-[#0E1B2E] font-semibold">{title}</b>
          </div>
        )}

        {/* Search Bar */}
        {!hideSearch && (
          <div className="search flex-1 max-w-[380px] flex items-center gap-2.5 bg-[#F4F7FC] border border-[#E4EAF2] rounded-xl px-3.5 py-2 text-[#8A99AE]">
            <Search className="w-4 h-4" />
            <input
              type="text"
              placeholder="Search exams, candidates or logs..."
              value={searchQuery || ''}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-[13px] text-[#0E1B2E] w-full"
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-[18px] shrink-0">
        {/* Notification Icon */}
        {user?.role === 'ROLE_ADMIN' ? (
          <NotificationsPanel />
        ) : (
          <div className="relative flex items-center">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="icon-btn w-[38px] h-[38px] rounded-xl flex items-center justify-center text-[#5C6B82] hover:bg-[#F4F7FC] hover:text-[#0E1B2E] relative"
            >
              <Bell className="w-[18px] h-[18px]" />
              {unreadCount > 0 && (
                <span className="dot absolute top-2 right-2.5 w-1.5 h-1.5 bg-[#F2A93B] rounded-full border border-white"></span>
              )}
            </button>

            {/* Notifications Panel */}
            {showNotifications && (
              <>
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 99, background: 'transparent' }}
                  onClick={() => setShowNotifications(false)}
                />
                <div className="notif absolute right-0 top-[52px] w-[330px] bg-white border border-[#E4EAF2] rounded-xl shadow-2xl z-[100] overflow-hidden animate-[fade_0.2s_ease]">
                  <div className="nh flex items-center justify-between px-4 py-3 border-b border-[#EEF2F8]">
                    <b className="font-display text-[14px] text-[#0E1B2E]">Notifications</b>
                    <button onClick={() => setShowNotifications(false)} className="text-[12px] text-[#2F6BFF] font-semibold hover:underline">
                      Close
                    </button>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {candidateNotifications.length > 0 ? (
                      candidateNotifications.map((notif) => (
                        <div key={notif.id} className="ni flex gap-3 px-4 py-3 border-b border-[#EEF2F8] hover:bg-[#F4F7FC]">
                          {notif.unread && <span className="d w-2 h-2 rounded-full bg-[#2F6BFF] mt-1.5 shrink-0" />}
                          <div className="text-left">
                            <b className="text-[13px] font-semibold text-[#0E1B2E] block">{notif.title}</b>
                            <span className="text-[12px] text-[#5C6B82] block leading-tight mt-0.5">{notif.desc}</span>
                          </div>
                          <span className="text-[11px] text-[#8A99AE] font-mono ml-auto shrink-0">{formatTime(notif.time)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="py-8 text-center text-[#8A99AE] text-xs font-semibold">
                        No notifications
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* User Profile Info on top right */}
        {user && (
          <div className={`flex items-center gap-3 ${user.role === 'ROLE_ADMIN' ? 'border-l border-[#E4EAF2] pl-[18px]' : 'ml-2'}`}>
            <div className="w-8 h-8 rounded-lg bg-[#2F6BFF]/10 text-[#2F6BFF] font-semibold text-[12px] flex items-center justify-center uppercase shrink-0 font-display">
              {user.fullName?.split(' ').map(n => n[0]).join('') || 'U'}
            </div>
            <div className="hidden md:block overflow-hidden max-w-[120px] text-left">
              <b className="text-[#0E1B2E] text-[13.5px] font-semibold block truncate leading-tight">{user.fullName || 'User'}</b>
              {user.role === 'ROLE_ADMIN' && (
                <span className="text-[#5C6B82] text-[10.5px] block truncate uppercase tracking-wider font-semibold font-mono mt-0.5">
                  Admin
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
