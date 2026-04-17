import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { login } from '../store/authSlice';
import ReCAPTCHA from 'react-google-recaptcha';
import { toast } from 'react-hot-toast';

const appTitle = import.meta.env.VITE_APP_TITLE || 'Attendance';

// Context-specific branding based on the app title
const APP_CONTEXTS = [
    {
        match: (t) => /choir/i.test(t),
        icon: (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
            </svg>
        ),
        gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        shadow: '0 8px 32px rgba(99, 102, 241, 0.3)',
    },
    {
        match: (t) => /av\b|audio.?visual|avd/i.test(t),
        icon: (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 7l-7 5 7 5V7z" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
        ),
        gradient: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
        shadow: '0 8px 32px rgba(14, 165, 233, 0.3)',
    },
];

const defaultContext = {
    icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            <path d="M9 14l2 2 4-4" />
        </svg>
    ),
    gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    shadow: '0 8px 32px rgba(99, 102, 241, 0.3)',
};

const appContext = APP_CONTEXTS.find(c => c.match(appTitle)) || defaultContext;

function Login() {
    const [credentials, setCredentials] = useState({ login: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [recaptchaToken, setRecaptchaToken] = useState(null);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { token, loading, error, needsVerification } = useSelector(state => state.auth);

    const redirectPath = searchParams.get('redirect');

    useEffect(() => {
        if (token) navigate(redirectPath || '/');
        if (needsVerification) navigate('/verify');
    }, [token, needsVerification, navigate, redirectPath]);

    const handleSubmit = (e) => {
        e.preventDefault();
        
        const finalToken = recaptchaToken || (import.meta.env.VITE_RECAPTCHA_SITE_KEY ? null : "mock_token");
        
        if (!finalToken) {
            toast.error("Please complete the reCAPTCHA challenge");
            return;
        }
        
        dispatch(login({ 
            login: credentials.login.trim(), 
            password: credentials.password.trim(),
            recaptcha_token: finalToken
        }));
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Decorative background orbs */}
            <div style={{
                position: 'absolute',
                top: '-15%',
                left: '-10%',
                width: '450px',
                height: '450px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
                filter: 'blur(60px)',
                animation: 'pulse 8s ease-in-out infinite',
                pointerEvents: 'none',
            }} />
            <div style={{
                position: 'absolute',
                bottom: '-10%',
                right: '-10%',
                width: '400px',
                height: '400px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, transparent 70%)',
                filter: 'blur(60px)',
                animation: 'pulse 10s ease-in-out infinite reverse',
                pointerEvents: 'none',
            }} />

            <div style={{ maxWidth: '420px', width: '100%', position: 'relative', zIndex: 1 }}>
                {/* Brand header */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '64px',
                        height: '64px',
                        borderRadius: '18px',
                        background: appContext.gradient,
                        boxShadow: appContext.shadow,
                        marginBottom: '1.25rem',
                    }}>
                        {appContext.icon}
                    </div>
                    <h1 style={{
                        fontSize: '1.75rem',
                        fontWeight: 800,
                        margin: '0 0 0.35rem 0',
                        background: 'linear-gradient(135deg, #f8fafc 0%, #c7d2fe 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        letterSpacing: '-0.02em',
                    }}>
                        {appTitle}
                    </h1>
                    <p style={{
                        color: 'var(--text-secondary)',
                        fontSize: '0.9rem',
                        margin: 0,
                    }}>
                        Sign in to your account
                    </p>
                </div>

                {/* Login card */}
                <div className="glass-card" style={{
                    padding: '2rem',
                    borderRadius: '20px',
                    border: '1px solid rgba(99, 102, 241, 0.15)',
                }}>
                    {error && (
                        <div style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            borderRadius: '10px',
                            padding: '0.75rem 1rem',
                            marginBottom: '1.25rem',
                            color: '#fca5a5',
                            fontSize: '0.85rem',
                            textAlign: 'center',
                        }}>
                            {error}
                        </div>
                    )}
                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{
                                display: 'block',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                color: 'var(--text-secondary)',
                                marginBottom: '0.4rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                            }}>
                                Email
                            </label>
                            <input
                                placeholder="Enter your email"
                                value={credentials.login}
                                onChange={e => setCredentials({ ...credentials, login: e.target.value })}
                                required
                                style={{ marginBottom: 0 }}
                            />
                        </div>
                        <div style={{ marginBottom: '1.25rem' }}>
                            <label style={{
                                display: 'block',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                color: 'var(--text-secondary)',
                                marginBottom: '0.4rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                            }}>
                                Password
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter your password"
                                    value={credentials.password}
                                    onChange={e => setCredentials({ ...credentials, password: e.target.value })}
                                    required
                                    style={{ width: '100%', paddingRight: '2.5rem', marginBottom: 0 }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    data-testid="show-password-toggle"
                                    style={{
                                        position: 'absolute',
                                        right: '0.75rem',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: 0,
                                        fontSize: '1.2rem',
                                        opacity: 0.7,
                                        outline: 'none'
                                    }}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                    title={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? "🙈" : "👁️"}
                                </button>
                            </div>
                        </div>
                        
                        <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'center' }}>
                            <ReCAPTCHA
                                sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"}
                                onChange={setRecaptchaToken}
                                theme="dark"
                            />
                        </div>
                        
                        <button
                            className="btn"
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '0.8rem',
                                fontSize: '0.95rem',
                                fontWeight: 600,
                                background: loading ? 'rgba(99, 102, 241, 0.4)' : appContext.gradient,
                                boxShadow: loading ? 'none' : appContext.shadow,
                                borderRadius: '12px',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            {loading ? (
                                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="31.4 31.4" strokeLinecap="round" />
                                    </svg>
                                    Signing in…
                                </span>
                            ) : 'Sign In'}
                        </button>
                    </form>
                    <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem' }}>
                        <Link to="/forgot-password" style={{ color: '#a5b4fc', textDecoration: 'none', transition: 'color 0.2s' }}>
                            Forgot your password?
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Login;
