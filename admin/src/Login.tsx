import React, { useState } from 'react';

// Props (add back TS types in your project):
// interface LoginProps { onLoginSuccess: (token: string, user: any) => void; apiBase: string; }
//
// Uses only classes/vars already defined in your global admin stylesheet:
// --primary, --accent, --sidebar-bg, --bg-card, --bg-main, --border-color, --card-shadow,
// --text-main, --text-secondary, --danger, --success, --font-sans,
// .form-group, .form-label, .form-input, .btn. No new CSS files needed.

export default function Login({ onLoginSuccess = () => {}, apiBase = '' }) {
  const effectiveApiBase =
    typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'https://cbt.filloptech.com/api/v1'
      : apiBase;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${effectiveApiBase}/admin/auth.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', username, password }),
      });
      const data = await res.json();
      if (data.success && data.token) {
        onLoginSuccess(data.token, data.user);
      } else {
        setError(data.message || 'Login failed. Check your credentials and try again.');
      }
    } catch (err) {
      setError('Could not reach the server. Try again in a moment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flp-login-wrap">
      <style>{`
        .flp-login-wrap {
          min-height: 100vh;
          display: flex;
          background-color: var(--bg-main);
          font-family: var(--font-sans);
        }

        .flp-login-shell {
          margin: auto;
          width: 100%;
          max-width: 880px;
          display: flex;
          border-radius: 20px;
          overflow: hidden;
          background-color: var(--bg-card);
          box-shadow: var(--card-shadow);
        }

        /* ---- brand side, reuses sidebar color ---- */
        .flp-brand {
          position: relative;
          width: 40%;
          min-width: 280px;
          background: var(--sidebar-bg);
          color: var(--sidebar-text);
          padding: 2.75rem 2.25rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
        }
        .flp-brand::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(255,255,255,0.07) 1.4px, transparent 1.4px);
          background-size: 22px 22px;
          pointer-events: none;
        }

        .flp-mark {
          position: relative;
          z-index: 1;
          display: inline-flex;
          align-items: center;
          gap: 0.7rem;
        }
        .flp-mark-badge {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: linear-gradient(135deg, var(--accent) 0%, var(--primary) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .flp-mark-word {
          font-size: 1.05rem;
          font-weight: 700;
          letter-spacing: -0.2px;
        }

        .flp-brand-copy {
          position: relative;
          z-index: 1;
          max-width: 26ch;
        }
        .flp-brand-copy h1 {
          font-size: 1.65rem;
          font-weight: 650;
          line-height: 1.2;
          letter-spacing: -0.4px;
          margin: 0 0 0.7rem;
        }
        .flp-brand-copy p {
          font-size: 0.9rem;
          line-height: 1.55;
          color: rgba(255,255,255,0.72);
          margin: 0;
        }

        .flp-brand-foot {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.78rem;
          color: rgba(255,255,255,0.6);
        }
        .flp-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: var(--success);
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.25);
          flex-shrink: 0;
        }

        /* ---- form side ---- */
        .flp-formside {
          flex: 1;
          padding: 2.75rem 2.5rem;
          display: flex;
          align-items: center;
        }
        .flp-forminner { width: 100%; }
        .flp-forminner h2 {
          font-size: 1.35rem;
          font-weight: 650;
          color: var(--text-main);
          letter-spacing: -0.3px;
          margin: 0 0 0.3rem;
        }
        .flp-forminner > p {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin: 0 0 1.5rem;
        }

        .flp-error {
          background-color: rgba(239, 68, 68, 0.1);
          border: 1px solid var(--danger);
          color: var(--danger);
          border-radius: 12px;
          padding: 0.75rem 1rem;
          font-size: 0.85rem;
          font-weight: 500;
          margin-bottom: 1.25rem;
        }

        .flp-submit {
          width: 100%;
          justify-content: center;
          margin-top: 0.4rem;
          height: 44px;
          font-size: 0.92rem;
        }

        @media (max-width: 780px) {
          .flp-login-shell { flex-direction: column; max-width: 420px; border-radius: 16px; }
          .flp-brand { width: 100%; padding: 1.5rem 1.75rem; flex-direction: row; align-items: center; justify-content: space-between; }
          .flp-brand-copy, .flp-brand-foot { display: none; }
          .flp-formside { padding: 2rem 1.75rem; }
        }
      `}</style>

      <div className="flp-login-shell">
        <aside className="flp-brand">
          <div className="flp-mark">
            <span className="flp-mark-badge">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
                <path d="M5 12.5L9.5 17L19 7" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="flp-mark-word">Fillop CBT Guru</span>
          </div>

          <div className="flp-brand-copy">
            <h1>Control center</h1>
            <p>Manage the question bank, exam sessions, and candidate records from one place.</p>
          </div>

          <div className="flp-brand-foot">
            <span className="flp-status-dot" />
            filloptech.com &nbsp;·&nbsp; admin access only
          </div>
        </aside>

        <div className="flp-formside">
          <div className="flp-forminner">
            <h2>Admin sign in</h2>
            <p>Enter your credentials to open the control center.</p>

            {error && <div className="flp-error">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Username or email</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn flp-submit" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}