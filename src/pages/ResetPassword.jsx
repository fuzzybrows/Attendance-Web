import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useNavigate, Link } from 'react-router-dom';
import ReCAPTCHA from 'react-google-recaptcha';

const appTitle = import.meta.env.VITE_APP_TITLE || 'Attendance';

const labelStyle = {
    display: 'block',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: '0.4rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
};

const btnGradient = 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)';
const btnShadow = '0 8px 32px rgba(99, 102, 241, 0.3)';

function ResetPassword() {
    const [step, setStep] = useState(1); // 1: Request, 2: Reset
    const [login, setLogin] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [recaptchaToken, setRecaptchaToken] = useState(null);
    const navigate = useNavigate();

    const handleRequest = async (e) => {
        e.preventDefault();
        
        const finalToken = recaptchaToken || (import.meta.env.VITE_RECAPTCHA_SITE_KEY ? null : "mock_token");
        if (!finalToken) {
            setError("Please complete the reCAPTCHA challenge");
            return;
        }

        setLoading(true);
        setError('');
        try {
            const res = await axios.post('/auth/forgot-password', { login: login.trim(), recaptcha_token: finalToken });
            toast.success(res.data.status);
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.detail || 'Request failed');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await axios.post('/auth/reset-password', { login: login.trim(), otp, new_password: newPassword });
            toast.success('Password reset successfully!');
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.detail || 'Reset failed');
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
                        background: btnGradient,
                        boxShadow: btnShadow,
                        marginBottom: '1.25rem',
                    }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
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
                        {step === 1 ? 'Enter your email to receive a reset code' : 'Enter the code and your new password'}
                    </p>
                </div>

                {/* Reset card */}
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

                    {step === 1 ? (
                        <form onSubmit={handleRequest}>
                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={labelStyle}>Email</label>
                                <input
                                    placeholder="Enter your email"
                                    value={login}
                                    onChange={e => setLogin(e.target.value)}
                                    required
                                    style={{ marginBottom: 0 }}
                                />
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
                                    background: loading ? 'rgba(99, 102, 241, 0.4)' : btnGradient,
                                    boxShadow: loading ? 'none' : btnShadow,
                                    borderRadius: '12px',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                {loading ? (
                                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="31.4 31.4" strokeLinecap="round" />
                                        </svg>
                                        Sending Code…
                                    </span>
                                ) : 'Send Reset Code'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleReset}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={labelStyle}>Verification Code</label>
                                <input
                                    placeholder="6-digit code"
                                    value={otp}
                                    onChange={e => setOtp(e.target.value)}
                                    required
                                    style={{ marginBottom: 0 }}
                                />
                            </div>
                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={labelStyle}>New Password</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Enter your new password"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$"
                                        title="Password must be at least 8 characters long, include an uppercase letter, a lowercase letter, a number, and a special character (@, $, !, %, *, ?, &, #)."
                                        required
                                        style={{ width: '100%', paddingRight: '2.5rem', marginBottom: 0 }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
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
                            <button
                                className="btn"
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    padding: '0.8rem',
                                    fontSize: '0.95rem',
                                    fontWeight: 600,
                                    background: loading ? 'rgba(99, 102, 241, 0.4)' : btnGradient,
                                    boxShadow: loading ? 'none' : btnShadow,
                                    borderRadius: '12px',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                {loading ? (
                                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="31.4 31.4" strokeLinecap="round" />
                                        </svg>
                                        Resetting…
                                    </span>
                                ) : 'Reset Password'}
                            </button>
                        </form>
                    )}

                    {/* Back to login link */}
                    <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem' }}>
                        <Link to="/login" style={{ color: '#a5b4fc', textDecoration: 'none', transition: 'color 0.2s' }}>
                            ← Back to Sign In
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ResetPassword;
