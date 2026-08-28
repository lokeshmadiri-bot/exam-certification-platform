import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Bell, Menu } from 'lucide-react';
import NotificationsPanel from '../../modules/admin/components/NotificationsPanel';
import { candidateService } from '../../modules/candidate/services/api';

export default function Topbar({ user, title, searchQuery, setSearchQuery, hideSearch, onMenuToggle }) {
  const location = useLocation();
  const notifBtnRef = useRef(null);
  const notifPanelRef = useRef(null);
  const notifContainerRef = useRef(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [candidateNotifications, setCandidateNotifications] = useState([]);
  const [btnRect, setBtnRect] = useState(null);
  const pathname = location.pathname;

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

  // Close notification panel on page navigation (pathname change only)
  useEffect(() => {
    setShowNotifications(false);
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(event) {
      const clickedInsidePanel = notifPanelRef.current && notifPanelRef.current.contains(event.target);
      const clickedInsideBtn = notifBtnRef.current && notifBtnRef.current.contains(event.target);
      if (!clickedInsidePanel && !clickedInsideBtn) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    try {
      const date = new Date(timeStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };


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
          <div ref={notifContainerRef} style={{ position: 'relative', display: 'inline-block' }}>
            {/* Bell Button — exactly like admin */}
            <button
              ref={notifBtnRef}
              onClick={(e) => {
                e.stopPropagation();
                if (!showNotifications && notifBtnRef.current) {
                  setBtnRect(notifBtnRef.current.getBoundingClientRect());
                }
                setShowNotifications(prev => !prev);
              }}
              aria-label="Notifications"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#F4F7FC',
                border: '1px solid #E4EAF2',
                cursor: 'pointer',
                color: '#5C6B82',
                transition: 'all 0.2s',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#EEF2F8';
                e.currentTarget.style.color = '#0E1B2E';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#F4F7FC';
                e.currentTarget.style.color = '#5C6B82';
              }}
            >
              <Bell style={{ width: '18px', height: '18px' }} />
              {candidateNotifications.length > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  width: '8px',
                  height: '8px',
                  background: '#F2A93B',
                  borderRadius: '50%',
                  border: '2px solid #fff'
                }} />
              )}
            </button>

            {/* Notifications Panel — fixed so not clipped by sticky header stacking context */}
            {showNotifications && btnRect && (
              <aside
                ref={notifPanelRef}
                style={{
                  position: 'fixed',
                  top: btnRect.bottom + 8,
                  right: window.innerWidth - btnRect.right,
                  width: '420px',
                  maxHeight: `${window.innerHeight - btnRect.bottom - 24}px`,
                  background: '#fff',
                  border: '1px solid #E4EAF2',
                  borderRadius: '16px',
                  boxShadow: '0 12px 36px rgba(11,31,56,0.12)',
                  zIndex: 9999,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden'
                }}
              >
                {/* Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  borderBottom: '1px solid #EEF2F8',
                  backgroundColor: '#FFF'
                }}>
                  <h2 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0E1B2E' }}>Notifications</h2>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowNotifications(false); }}
                      style={{ fontSize: '12.5px', color: '#8A99AE', fontWeight: '600', cursor: 'pointer', background: 'none', border: 'none' }}
                    >
                      Close
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {candidateNotifications.length === 0 ? (
                    <div style={{ padding: '32px', textAlign: 'center', color: '#8A99AE', fontSize: '13px' }}>
                      You're all caught up.
                    </div>
                  ) : (
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' }}>
                      {candidateNotifications.map((notif) => (
                        <li
                          key={notif.id}
                          style={{
                            display: 'flex',
                            gap: '12px',
                            padding: '14px 18px',
                            borderBottom: '1px solid #EEF2F8',
                            backgroundColor: '#F4F7FC',
                            transition: 'background-color 0.15s',
                            cursor: 'default'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#EEF2F8'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#F4F7FC'; }}
                        >
                          <span style={{
                            marginTop: '6px',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: '#2F6BFF',
                            flexShrink: 0,
                            display: 'block'
                          }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '13.5px', color: '#0E1B2E', fontWeight: '600', lineHeight: '1.4' }}>
                              {notif.title}
                              {notif.desc && (
                                <div style={{ fontSize: '12px', color: '#8A99AE', fontWeight: 'normal', marginTop: '2px' }}>
                                  {notif.desc}
                                </div>
                              )}
                            </div>
                            {notif.time && (
                              <div style={{ fontSize: '11px', color: '#8A99AE', marginTop: '4px' }}>
                                {new Date(notif.time).toLocaleString()}
                              </div>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </aside>
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
