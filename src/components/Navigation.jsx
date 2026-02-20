import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/authSlice';

const Navigation = () => {
    const { token, user } = useSelector(state => state.auth);
    const dispatch = useDispatch();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const isAdmin = user?.permissions?.includes('admin');

    if (!token) return null;

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
    const closeMenu = () => setIsMenuOpen(false);

    return (
        <nav className="glass-card" style={{ padding: '1rem', marginBottom: '2rem', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <NavLink to="/" onClick={closeMenu} style={({ isActive }) => ({ color: isActive ? 'var(--primary-color)' : 'var(--text-secondary)', textDecoration: 'none', fontWeight: 600, fontSize: '1.1rem' })}>
                        Attendance
                    </NavLink>
                </div>

                {/* Desktop Menu */}
                <div className="desktop-menu" style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                    <NavLink to="/" style={({ isActive }) => ({ color: isActive ? 'var(--primary-color)' : 'var(--text-secondary)', textDecoration: 'none', fontWeight: 600 })}>
                        Dashboard
                    </NavLink>
                    {isAdmin && (
                        <>
                            <NavLink to="/members" style={({ isActive }) => ({ color: isActive ? 'var(--primary-color)' : 'var(--text-secondary)', textDecoration: 'none', fontWeight: 600 })}>
                                Members
                            </NavLink>
                            <NavLink to="/sessions" style={({ isActive }) => ({ color: isActive ? 'var(--primary-color)' : 'var(--text-secondary)', textDecoration: 'none', fontWeight: 600 })}>
                                Sessions
                            </NavLink>
                            <NavLink to="/stats" style={({ isActive }) => ({ color: isActive ? 'var(--primary-color)' : 'var(--text-secondary)', textDecoration: 'none', fontWeight: 600 })}>
                                Insights
                            </NavLink>
                        </>
                    )}
                    <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }}></div>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        {user?.first_name}
                    </span>
                    <button
                        className="btn"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: 'var(--error-color)' }}
                        onClick={() => dispatch(logout())}
                    >
                        Logout
                    </button>
                </div>

                {/* Mobile Menu Button */}
                <button
                    className="mobile-menu-btn"
                    onClick={toggleMenu}
                    style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '1.5rem', cursor: 'pointer', padding: '0.5rem' }}
                >
                    {isMenuOpen ? '✕' : '☰'}
                </button>
            </div>

            {/* Mobile Dropdown */}
            {isMenuOpen && (
                <div style={{
                    marginTop: '1rem',
                    paddingTop: '1rem',
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                }}>
                    <NavLink to="/" onClick={closeMenu} style={({ isActive }) => ({ color: isActive ? 'var(--primary-color)' : 'var(--text-secondary)', textDecoration: 'none', fontWeight: 600, padding: '0.5rem 0' })}>
                        Dashboard
                    </NavLink>
                    {isAdmin && (
                        <>
                            <NavLink to="/members" onClick={closeMenu} style={({ isActive }) => ({ color: isActive ? 'var(--primary-color)' : 'var(--text-secondary)', textDecoration: 'none', fontWeight: 600, padding: '0.5rem 0' })}>
                                Members
                            </NavLink>
                            <NavLink to="/sessions" onClick={closeMenu} style={({ isActive }) => ({ color: isActive ? 'var(--primary-color)' : 'var(--text-secondary)', textDecoration: 'none', fontWeight: 600, padding: '0.5rem 0' })}>
                                Sessions
                            </NavLink>
                            <NavLink to="/stats" onClick={closeMenu} style={({ isActive }) => ({ color: isActive ? 'var(--primary-color)' : 'var(--text-secondary)', textDecoration: 'none', fontWeight: 600, padding: '0.5rem 0' })}>
                                Insights
                            </NavLink>
                        </>
                    )}
                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '0.5rem 0' }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{user?.first_name} {user?.last_name}</span>
                        <button
                            className="btn"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: 'var(--error-color)' }}
                            onClick={() => dispatch(logout())}
                        >
                            Logout
                        </button>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navigation;
