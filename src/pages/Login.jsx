import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { login, clearError } from '../store/authSlice';
import ReCAPTCHA from 'react-google-recaptcha';
import { toast } from 'react-hot-toast';

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
        
        // Use a mock token if recaptcha fails to load or no site key is provided during dev
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
        <div style={{ maxWidth: '400px', margin: '100px auto', padding: '0 1rem' }}>
            <div className="glass-card">
                <h1 style={{ textAlign: 'center' }}>Login</h1>
                {error && <p style={{ color: 'var(--error-color)', textAlign: 'center' }}>{error}</p>}
                <form onSubmit={handleSubmit}>
                    <input
                        placeholder="Email or Phone Number"
                        value={credentials.login}
                        onChange={e => setCredentials({ ...credentials, login: e.target.value })}
                        required
                    />
                    <div style={{ position: 'relative' }}>
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            value={credentials.password}
                            onChange={e => setCredentials({ ...credentials, password: e.target.value })}
                            required
                            style={{ width: '100%', paddingRight: '2.5rem', marginBottom: '1rem' }}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{
                                position: 'absolute',
                                right: '0.75rem',
                                top: '40%',
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
                    
                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                        <ReCAPTCHA
                            sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"} // Public testing key as fallback
                            onChange={setRecaptchaToken}
                            theme="dark"
                        />
                    </div>
                    
                    <button className="btn" style={{ width: '100%' }} disabled={loading}>
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>
                <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem' }}>
                    <Link to="/forgot-password" style={{ color: 'var(--text-secondary)' }}>Forgot password?</Link>
                </div>
            </div>
        </div>
    );
}

export default Login;
