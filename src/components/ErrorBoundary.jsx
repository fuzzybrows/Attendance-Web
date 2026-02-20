import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    handleGoHome = () => {
        this.setState({ hasError: false, error: null });
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '80vh',
                    padding: '2rem',
                    textAlign: 'center',
                }}>
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '16px',
                        padding: '3rem 2.5rem',
                        maxWidth: '480px',
                        width: '100%',
                        backdropFilter: 'blur(12px)',
                    }}>
                        <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>⚠️</div>
                        <h1 style={{
                            fontSize: '1.5rem',
                            fontWeight: '600',
                            color: 'var(--text-primary)',
                            marginBottom: '0.75rem',
                        }}>
                            Something went wrong
                        </h1>
                        <p style={{
                            color: 'var(--text-secondary)',
                            fontSize: '0.95rem',
                            lineHeight: '1.5',
                            marginBottom: '2rem',
                        }}>
                            {this.state.error?.message || 'An unexpected error occurred. Please try again.'}
                        </p>
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                            <button
                                className="btn"
                                onClick={this.handleRetry}
                                style={{ padding: '0.6rem 1.5rem' }}
                            >
                                Try Again
                            </button>
                            <button
                                className="btn"
                                onClick={this.handleGoHome}
                                style={{
                                    padding: '0.6rem 1.5rem',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                }}
                            >
                                Go Home
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
