import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { getDeviceId } from '../utils/device';

function QRAttendance() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { token: authToken } = useSelector(state => state.auth);

    const sessionId = searchParams.get('session_id');
    const qrToken = searchParams.get('token');

    const hasValidParams = !!(sessionId && qrToken);
    const hasSubmitted = useRef(false);

    const [status, setStatus] = useState(hasValidParams ? 'processing' : 'error');
    const [message, setMessage] = useState(hasValidParams ? '' : 'Invalid QR code link.');

    useEffect(() => {
        if (!hasValidParams) return;
        if (hasSubmitted.current) return;

        if (!authToken) {
            const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
            navigate(`/login?redirect=${returnUrl}`);
            return;
        }

        hasSubmitted.current = true;

        // Mark attendance
        const markAttendance = async () => {
            try {
                // 1. Get Device ID
                const deviceId = await getDeviceId();

                // 2. Get Location (Best Effort)
                let latitude = null;
                let longitude = null;
                try {
                    const position = await new Promise((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, {
                            enableHighAccuracy: true,
                            timeout: 5000,
                            maximumAge: 0
                        });
                    });
                    latitude = position.coords.latitude;
                    longitude = position.coords.longitude;
                } catch (locErr) {
                    console.warn("Location access denied/failed", locErr);
                    // Proceed without location, backend might reject if radius is enforced
                }

                const payload = {
                    device_id: deviceId,
                    latitude: latitude,
                    longitude: longitude
                };

                const response = await axios.post(
                    `/attendance/qr/mark?session_id=${sessionId}&qr_token=${qrToken}`,
                    payload,
                    { headers: { Authorization: `Bearer ${authToken}` } }
                );
                setStatus('success');
                setMessage(response.data.message);
            } catch (err) {
                setStatus('error');
                if (err.response?.status === 409) {
                    setMessage('Your attendance has already been recorded for this session.');
                } else if (err.response?.status === 403) {
                    // Fraud prevention error (Device Lock or Geofence)
                    setMessage(err.response.data.detail || 'Attendance blocked by security rules.');
                } else if (err.response?.status === 401) {
                    setMessage(err.response.data.detail || 'QR code has expired. Please scan again.');
                } else {
                    setMessage(err.response?.data?.detail || 'Something went wrong. Please try again.');
                }
            }
        };

        markAttendance();
    }, [hasValidParams, sessionId, qrToken, authToken, navigate]);

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
            <div className="glass-card" style={{ maxWidth: '480px', width: '100%', textAlign: 'center', padding: '2.5rem' }}>
                {status === 'processing' && (
                    <>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
                        <h2>Marking Attendance...</h2>
                        <p style={{ color: 'var(--text-secondary)' }}>Please wait while we record your attendance.</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                        <h2 style={{ color: '#4ade80' }}>Attendance Marked!</h2>
                        <p style={{ fontSize: '1.1rem', marginTop: '0.5rem' }}>{message}</p>
                        <Link to="/" className="btn" style={{ display: 'inline-block', marginTop: '1.5rem' }}>
                            Go to Dashboard
                        </Link>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
                        <h2 style={{ color: '#ff6b6b' }}>Error</h2>
                        <p style={{ marginTop: '0.5rem' }}>{message}</p>
                        <Link to="/" className="btn" style={{ display: 'inline-block', marginTop: '1.5rem' }}>
                            Go to Dashboard
                        </Link>
                    </>
                )}

                {status === 'login_required' && (
                    <>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
                        <h2>Login Required</h2>
                        <p style={{ marginTop: '0.5rem' }}>{message}</p>
                        <Link
                            to={`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`}
                            className="btn"
                            style={{ display: 'inline-block', marginTop: '1.5rem' }}
                        >
                            Log In
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
}

export default QRAttendance;
