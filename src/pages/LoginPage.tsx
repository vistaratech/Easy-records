import { useState, useRef } from 'react';
import { useAuth } from '../lib/auth';
import { firebaseLogin, firebaseSignup, firebaseGoogleLogin, firebaseDirectGoogleLogin } from '../lib/firebaseAuth';
import { ArrowRight, Mail, Eye, EyeOff, Lock, User, Phone, Sparkles, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  
  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const result = await firebaseGoogleLogin();
      login(result.token, result.user);
      toast.success(`Welcome, ${result.user.name || 'User'}! 🎉`);
    } catch (err: any) {
      if (err.isConfigNotFound) {
        const userEmail = window.prompt('Enter your Gmail address to sign in with Google instantly:');
        if (userEmail && userEmail.trim()) {
          try {
            const result = await firebaseDirectGoogleLogin(userEmail.trim());
            login(result.token, result.user);
            toast.success(`Welcome, ${result.user.name || 'User'}! 🎉`);
            return;
          } catch (directErr: any) {
            setError(directErr.message);
          }
        }
      } else if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Google Sign-In failed');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'login') {
      if (!email || !password) {
        setError('Email and password are required');
        return;
      }
      setLoading(true);
      try {
        const result = await firebaseLogin(email, password);
        login(result.token, result.user);
        toast.success(`Welcome back, ${result.user.name || 'User'}!`);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    } else {
      // Signup mode
      if (!name || !email || !password) {
        setError('Name, email, and password are required');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters long');
        return;
      }

      setLoading(true);
      try {
        const result = await firebaseSignup(name, email, password, phone);
        toast.success('🎉 Account created successfully with a 1-Month Free Trial!');
        login(result.token, result.user);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: '420px', padding: '24px 28px', maxHeight: '92vh', overflowY: 'auto' }}>
        <div className="login-logo-wrap" style={{ marginBottom: '12px', gap: '6px' }}>
          <img src="/customer-logo.png" alt="Easy Records Logo" className="login-logo-img" style={{ width: '68px', height: '68px' }} />
          <span className="login-logo-badge" style={{ fontSize: '11px', padding: '2px 10px' }}>Trusted Partner</span>
        </div>

        <h1 className="login-title" style={{ fontSize: '20px', margin: 0 }}>Easy Records</h1>
        <p className="login-sub" style={{ fontSize: '12.5px', margin: '3px 0 0', opacity: 0.8 }}>{mode === 'login' ? 'Sign in to access your workspace' : 'Create an account to get started'}</p>

        {/* Mode Toggle Tabs */}
        <div style={{
          display: 'flex',
          background: 'rgba(0, 45, 93, 0.05)',
          borderRadius: '10px',
          padding: '3px',
          margin: '14px 0 14px',
          border: '1px solid var(--border-light)'
        }}>
          <button
            type="button"
            onClick={() => { setMode('login'); setError(''); }}
            style={{
              flex: 1,
              padding: '7px 12px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: mode === 'login' ? '#ffffff' : 'transparent',
              color: mode === 'login' ? 'var(--navy)' : 'var(--muted)',
              boxShadow: mode === 'login' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(''); }}
            style={{
              flex: 1,
              padding: '7px 12px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: mode === 'signup' ? '#ffffff' : 'transparent',
              color: mode === 'signup' ? 'var(--accent)' : 'var(--muted)',
              boxShadow: mode === 'signup' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            <Sparkles size={14} color="var(--accent)" />
            <span>Create Account</span>
          </button>
        </div>

        {/* 1-Month Free Trial Badge for Signup */}
        {mode === 'signup' && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '10px',
            padding: '8px 12px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={18} color="#10b981" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: '12.5px', color: '#065f46' }}>1-Month Free Trial Included</div>
              <div style={{ fontSize: '11px', color: '#047857', opacity: 0.9 }}>Get full unlimited access for 30 days!</div>
            </div>
          </div>
        )}

        {/* Google Sign In Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          style={{
            width: '100%',
            padding: '9.5px 14px',
            borderRadius: '10px',
            border: '1px solid var(--border)',
            background: '#ffffff',
            color: '#3c4043',
            fontWeight: 700,
            fontSize: '13.5px',
            cursor: googleLoading ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
            transition: 'all 0.2s ease',
            marginBottom: '12px'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          <span>{googleLoading ? 'Signing in...' : 'Continue with Google Account'}</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', margin: '10px 0 12px', color: 'var(--muted)', fontSize: '11px' }}>
          <div style={{ flex: 1, borderBottom: '1px solid var(--border)' }} />
          <span style={{ padding: '0 8px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, opacity: 0.7 }}>or continue with email</span>
          <div style={{ flex: 1, borderBottom: '1px solid var(--border)' }} />
        </div>

        {error && <div className="login-error" style={{ padding: '8px 12px', fontSize: '12px', marginBottom: '10px' }}>{error}</div>}

        <form onSubmit={handleAuthSubmit} ref={formRef}>
          {mode === 'signup' && (
            <>
              <label className="login-label" style={{ fontSize: '11.5px', marginBottom: '3px' }}>Full Name</label>
              <div className="login-input-group" style={{ paddingLeft: '10px', marginBottom: '10px', height: '38px' }}>
                <User size={16} style={{ marginRight: '6px', color: 'var(--muted)', flexShrink: 0 }} />
                <input
                  className="login-input"
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  style={{ paddingLeft: 0, fontSize: '13px' }}
                />
              </div>
            </>
          )}

          <label className="login-label" style={{ fontSize: '11.5px', marginBottom: '3px' }}>Email Address</label>
          <div className="login-input-group" style={{ paddingLeft: '10px', marginBottom: '10px', height: '38px' }}>
            <Mail size={16} style={{ marginRight: '6px', color: 'var(--muted)', flexShrink: 0 }} />
            <input
              className="login-input"
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              style={{ paddingLeft: 0, fontSize: '13px' }}
            />
          </div>

          <label className="login-label" style={{ fontSize: '11.5px', marginBottom: '3px' }}>Password</label>
          <div className="login-input-group" style={{ paddingLeft: '10px', marginBottom: mode === 'signup' ? '10px' : '14px', height: '38px' }}>
            <Lock size={16} style={{ marginRight: '6px', color: 'var(--muted)', flexShrink: 0 }} />
            <input
              ref={passwordRef}
              className="login-input"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ paddingLeft: 0, fontSize: '13px' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '4px 6px', color: 'var(--muted)', flexShrink: 0,
                display: 'flex', alignItems: 'center',
              }}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {mode === 'signup' && (
            <>
              <label className="login-label" style={{ fontSize: '11.5px', marginBottom: '3px' }}>Confirm Password</label>
              <div className="login-input-group" style={{ paddingLeft: '10px', marginBottom: '14px', height: '38px' }}>
                <Lock size={16} style={{ marginRight: '6px', color: 'var(--muted)', flexShrink: 0 }} />
                <input
                  ref={confirmPasswordRef}
                  className="login-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  style={{ paddingLeft: 0, fontSize: '13px' }}
                />
              </div>
            </>
          )}

          <button type="submit" className="login-btn" disabled={loading} style={{ marginTop: '4px', width: '100%', padding: '10px' }}>
            {loading ? (
              <div className="spinner" />
            ) : (
              <>
                <span>{mode === 'login' ? 'Sign In' : 'Create Account & Start Trial'}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <p className="login-devnote" style={{ marginTop: '14px', textAlign: 'center', color: 'var(--muted)', fontSize: '12px' }}>
          {mode === 'login' ? (
            <>Don't have an account? <span style={{ color: 'var(--accent)', fontWeight: 700, cursor: 'pointer' }} onClick={() => setMode('signup')}>Create one with 1-Month Free Trial</span></>
          ) : (
            <>Already have an account? <span style={{ color: 'var(--accent)', fontWeight: 700, cursor: 'pointer' }} onClick={() => setMode('login')}>Sign In here</span></>
          )}
        </p>
      </div>
    </div>
  );
}
