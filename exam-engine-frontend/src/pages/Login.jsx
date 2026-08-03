import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Award, ShieldCheck, Info, Loader } from 'lucide-react';
import { authService } from '../services/api';
import Toast from '../components/common/Toast';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [toastShow, setToastShow] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Please enter both username and password.');
      return;
    }

    try {
      setErrorMsg('');
      setLoading(true);
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
      setErrorMsg('Invalid credentials or backend server offline.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth">
      {/* Background Graphic Left Column */}
      <div className="auth-art">
        <span className="ring" style={{ width: '520px', height: '520px', left: '-120px', top: '-120px' }}></span>
        <span className="ring" style={{ width: '360px', height: '360px', right: '-80px', bottom: '60px' }}></span>
        
        <div className="auth-inner">
          {/* Brand Header */}
          <div className="brandmark">
            <div className="glyph">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <b>OryFolks Certify</b>
              <span>Certification &amp; Remote Proctoring</span>
            </div>
          </div>

          {/* Hero Copy */}
          <div style={{ margin: 'auto 0' }}>
            <h1>Prove your skills.<br />Earn your level.</h1>
            <p>Timed, fairly proctored technical certifications — aligned to your stack, graded L1 to L5, with your privacy and your result handled with care.</p>
            
            <div className="auth-feats">
              <span><ShieldCheck /> Live proctoring</span>
              <span><Award /> Timed &amp; fair</span>
            </div>
          </div>

          {/* Footer info */}
          <div style={{ marginTop: 'auto', fontSize: '11px', color: '#7e93b4', paddingTop: '16px' }}>
            &copy; 2026 OryFolks. All rights reserved.
          </div>
        </div>
      </div>

      {/* Login Interaction Right Column */}
      <div className="auth-form" style={{ overflowY: 'auto' }}>
        <h2>
          Welcome back
        </h2>
        <p>
          Please enter your credentials to access the proctoring dashboard.
        </p>

        {errorMsg && (
          <div style={{ padding: '12px 14px', borderRadius: '10px', backgroundColor: '#FDE8E8', color: '#BB2E2E', border: '1px solid #F8B4B4', fontSize: '13px', marginBottom: '20px', maxWidth: '380px' }}>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLoginSubmit} style={{ maxWidth: '380px', width: '100%' }}>
          <div className="field">
            <label>Username</label>
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="field">
            <label>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn"
            style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}
          >
            {loading ? <Loader className="w-4 h-4 animate-spin" style={{ marginRight: '8px' }} /> : null}
            <span>Sign In</span>
          </button>
        </form>

        {/* Demo Hint */}
        <div className="note brand" style={{ flexDirection: 'column', gap: '8px', marginTop: '24px', maxWidth: '380px' }}>
          <div style={{ fontWeight: '600' }}>Demo Credentials:</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #d7e4ff', paddingBottom: '6px' }}>
            <span>Candidate: <strong style={{ fontFamily: 'monospace' }}>ravi</strong></span>
            <span>Password: <strong style={{ fontFamily: 'monospace' }}>password123</strong></span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Administrator: <strong style={{ fontFamily: 'monospace' }}>aarav</strong></span>
            <span>Password: <strong style={{ fontFamily: 'monospace' }}>password123</strong></span>
          </div>
        </div>

        <div className="auth-note">
          <Info />
          <span>
            You'll be asked for camera &amp; microphone consent before any exam begins. Recordings are used only for assessment and are visible to administrators only.
          </span>
        </div>
      </div>

      <Toast message={toastMsg} show={toastShow} onClose={() => setToastShow(false)} />
    </div>
  );
}
