import React, { useState } from 'react';
import { Lock, Shield, ArrowRight } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (token: string, user: any) => void;
  apiBase: string;
}

export default function Login({ onLoginSuccess, apiBase }: LoginProps) {
  const effectiveApiBase = typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:8000/api/v1'
    : apiBase;
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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
        setError(data.message || 'Login failed. Please check credentials.');
      }
    } catch (err) {
      setError('Unable to reach server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-main)',
      padding: '1.5rem'
    }}>
      <div className="admin-card" style={{ maxWidth: '420px', width: '100%', padding: '2.5rem 2rem', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            backgroundColor: 'var(--primary-light)',
            color: 'var(--primary)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem'
          }}>
            <Shield size={32} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
            Fillop Admin Portal
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Sign in to access CBT Question &amp; System Control Center
          </p>
        </div>

        {error && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: 'var(--danger)',
            padding: '0.8rem 1rem',
            borderRadius: '10px',
            fontSize: '0.85rem',
            fontWeight: 600,
            marginBottom: '1.5rem',
            border: '1px solid rgba(239, 68, 68, 0.2)'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '1.2rem' }}>
            <label className="form-label">Username or Email</label>
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

          <div className="form-group" style={{ marginBottom: '1.8rem' }}>
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

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              width: '100%',
              height: '46px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '0.95rem',
              fontWeight: 700
            }}
          >
            {loading ? 'Authenticating...' : <>Sign In to Admin Panel <ArrowRight size={18} /></>}
          </button>
        </form>
      </div>
    </div>
  );
}
