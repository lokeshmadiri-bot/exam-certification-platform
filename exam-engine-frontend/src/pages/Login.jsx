import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Award, ShieldCheck, ChevronRight, Info } from 'lucide-react';
import { authService } from '../services/api';
import Toast from '../components/common/Toast';

export default function Login() {
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState('');
  const [toastShow, setToastShow] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const handleQuickLogin = async (role) => {
    try {
      setErrorMsg('');
      const username = role === 'cand' ? 'aarav' : 'ravi';
      const password = 'password123';
      const response = await authService.login(username, password);

      if (response.success) {
        setToastMsg(`Signed in as ${response.data.fullName}`);
        setToastShow(true);
        setTimeout(() => {
          if (response.data.role === 'ROLE_ADMIN') {
            navigate('/admin');
          } else {
            navigate('/candidate');
          }
        }, 1000);
      } else {
        setErrorMsg(response.message || 'Login failed.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Invalid login credentials or backend server offline.');
    }
  };

  return (
    <div className="auth fixed inset-0 z-50 grid grid-cols-1 md:grid-cols-[1.05fr_0.95fr] bg-[#0B1F38]">
      {/* Background Graphic Left Column */}
      <div className="auth-art relative overflow-hidden hidden md:flex flex-col justify-between p-16">
        <span className="ring absolute border border-white/5 rounded-full w-[520px] h-[520px] -left-[120px] -top-[120px]"></span>
        <span className="ring absolute border border-white/5 rounded-full w-[360px] h-[360px] -right-[80px] bottom-[60px]"></span>
        
        {/* Brand Header */}
        <div className="brandmark flex items-center gap-3 relative z-10">
          <div className="glyph w-[42px] h-[42px] rounded-xl bg-gradient-to-br from-[#2F6BFF] to-[#5b8cff] flex items-center justify-center shadow-[0_8px_22px_rgba(47,107,255,0.33)]">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div>
            <b className="font-display font-bold text-white text-lg tracking-wider">OryFolks Certify</b>
            <span className="text-[#9fb6d6] text-xs block font-medium mt-0.5">Certification &amp; Remote Proctoring</span>
          </div>
        </div>

        {/* Hero Copy */}
        <div className="relative z-10 my-auto pt-10">
          <h1 className="font-display font-extrabold text-white text-[38px] leading-[1.12] tracking-tight mb-3.5">
            Prove your skills.<br />Earn your level.
          </h1>
          <p className="text-[#b9c9e2] text-sm leading-relaxed max-w-[430px]">
            Timed, fairly proctored technical certifications — aligned to your stack, graded L1 to L5, with your privacy and your result handled with care.
          </p>
          
          <div className="auth-feats flex gap-2.5 flex-wrap mt-[30px]">
            <span className="inline-flex items-center gap-1.5 text-xs text-[#c5d6ef] bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5" /> Live proctoring
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-[#c5d6ef] bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
              <Award className="w-3.5 h-3.5" /> Timed &amp; fair
            </span>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-[11px] text-[#7e93b4] relative z-10">
          &copy; 2026 OryFolks. All rights reserved.
        </div>
      </div>

      {/* Login Interaction Right Column */}
      <div className="auth-form flex flex-col justify-center p-10 md:p-16 bg-white">
        <span className="eyebrow font-mono text-xs font-semibold text-[#2F6BFF] uppercase tracking-[1.5px]">
          Sign in with OryFolks SSO
        </span>
        <h2 className="font-display text-[27px] font-bold text-[#0E1B2E] mt-2.5 mb-1.5">
          Welcome back
        </h2>
        <p className="text-[#5C6B82] text-sm mb-7 leading-relaxed">
          Choose how you'd like to enter this preview. In production, your role is set automatically by single sign-on.
        </p>

        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-[#bb2e2e] text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <div className="role-pick flex flex-col gap-3.5 max-w-[380px]">
          <button className="role-card cand" onClick={() => handleQuickLogin('cand')}>
            <span className="ic shrink-0 w-12 h-12 rounded-xl bg-[#eaf1ff] text-[#2F6BFF] flex items-center justify-center">
              <Award className="w-6 h-6" />
            </span>
            <span className="text-left">
              <h3 className="font-display font-semibold text-base text-[#0E1B2E]">Continue as Candidate</h3>
              <p className="text-xs text-[#5C6B82] mt-0.5">Take a proctored certification exam</p>
            </span>
            <span className="go ml-auto text-[#8A99AE]">
              <ChevronRight className="w-5 h-5" />
            </span>
          </button>

          <button className="role-card admin" onClick={() => handleQuickLogin('admin')}>
            <span className="ic shrink-0 w-12 h-12 rounded-xl bg-[#fff3df] text-[#c9831a] flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </span>
            <span className="text-left">
              <h3 className="font-display font-semibold text-base text-[#0E1B2E]">Continue as Administrator</h3>
              <p className="text-xs text-[#5C6B82] mt-0.5">Oversee attempts, integrity &amp; results</p>
            </span>
            <span className="go ml-auto text-[#8A99AE]">
              <ChevronRight className="w-5 h-5" />
            </span>
          </button>
        </div>

        <div className="auth-note mt-[26px] text-xs text-[#8A99AE] flex gap-2 max-w-[380px] leading-relaxed">
          <Info className="w-3.5 h-3.5 text-[#2F6BFF] shrink-0 mt-0.5" />
          <span>
            You'll be asked for camera &amp; microphone consent before any exam begins. Recordings are used only for assessment and are visible to administrators only.
          </span>
        </div>
      </div>

      <Toast message={toastMsg} show={toastShow} onClose={() => setToastShow(false)} />
    </div>
  );
}
