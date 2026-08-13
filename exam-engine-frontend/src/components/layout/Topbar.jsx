import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Menu, Command } from 'lucide-react';
import NotificationsPanel from '../../modules/admin/components/NotificationsPanel';

export default function Topbar({ user, title, onMenuToggle, onOpenCmdPalette }) {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);

  const notifications = [
    { id: 1, title: 'Exam submitted', desc: 'Selenium Certification completed by Aarav Mehta', time: '14:22', unread: true },
    { id: 2, title: 'Integrity alert', desc: 'Tab switch strike on attempt #A-90412', time: '11:05', unread: true },
    { id: 3, title: 'System override approved', desc: 'Aarav Mehta override requested', time: '09:40', unread: false }
  ];

  return (
    <header className="topbar sticky top-0 z-30 flex items-center gap-[18px] px-[30px] py-3.5 bg-white/85 backdrop-blur-[10px] border-b border-[#E4EAF2]">
      {/* Mobile Menu Button */}
      <button className="menu-btn lg:hidden flex items-center justify-center w-9 h-9 rounded-lg hover:bg-slate-100 text-[#5C6B82]" onClick={onMenuToggle}>
        <Menu className="w-5 h-5" />
      </button>

      {/* Breadcrumbs */}
      <div className="crumb text-[13px] text-[#5C6B82] font-medium hidden sm:block">
        OryFolks Certify &gt; <b className="text-[#0E1B2E] font-semibold">{title}</b>
      </div>

      {/* Search Bar */}
      <div className="search flex-1 max-w-[380px] flex items-center gap-2.5 bg-[#F4F7FC] border border-[#E4EAF2] rounded-xl px-3.5 py-2 text-[#8A99AE]">
        <Search className="w-4 h-4" />
        <input type="text" placeholder="Search exams, candidates or logs..." className="bg-transparent border-none outline-none text-[13px] text-[#0E1B2E] w-full" />
      </div>

      <div className="ml-auto flex items-center gap-[18px]">


        {/* Notification Icon */}
        {user?.role === 'ROLE_ADMIN' ? (
          <NotificationsPanel />
        ) : (
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="icon-btn w-[38px] h-[38px] rounded-xl flex items-center justify-center text-[#5C6B82] hover:bg-[#F4F7FC] hover:text-[#0E1B2E] relative"
            >
              <Bell className="w-[18px] h-[18px]" />
              <span className="dot absolute top-2 right-2.5 w-1.5 h-1.5 bg-[#F2A93B] rounded-full border border-white"></span>
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
                    {notifications.map((notif) => (
                      <div key={notif.id} className="ni flex gap-3 px-4 py-3 border-b border-[#EEF2F8] hover:bg-[#F4F7FC]">
                        {notif.unread && <span className="d w-2 h-2 rounded-full bg-[#2F6BFF] mt-1.5 shrink-0" />}
                        <div>
                          <b className="text-[13px] font-semibold text-[#0E1B2E]">{notif.title}</b>
                          <span className="text-[12px] text-[#5C6B82] block leading-tight mt-0.5">{notif.desc}</span>
                        </div>
                        <span className="text-[11px] text-[#8A99AE] font-mono ml-auto">{notif.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
