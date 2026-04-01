import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchMembers } from '../store/membersSlice';
import { fetchSessions, deleteSession, bulkDeleteSessions, updateSessionStatus, setCurrentSession, updateSession, addSession } from '../store/sessionsSlice';
import Modal from '../components/Modal';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import axios from 'axios';

const statusColors = {
    scheduled: { bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.4)', color: '#38bdf8' },
    active: { bg: 'rgba(74, 222, 128, 0.15)', border: 'rgba(74, 222, 128, 0.4)', color: '#4ade80' },
    concluded: { bg: 'rgba(251, 191, 36, 0.15)', border: 'rgba(251, 191, 36, 0.4)', color: '#fbbf24' },
    archived: { bg: 'rgba(148, 163, 184, 0.15)', border: 'rgba(148, 163, 184, 0.4)', color: '#94a3b8' },
};

function Sessions() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { items: sessions } = useSelector(state => state.sessions);
    const { items: members } = useSelector(state => state.members);
    const { user } = useSelector(state => state.auth);
    const isAdmin = user?.permissions?.includes('admin');

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [selected, setSelected] = useState(new Set());
    const [availableTypes, setAvailableTypes] = useState(['rehearsal', 'program']);
    const [availableStatuses, setAvailableStatuses] = useState(['scheduled', 'active', 'concluded', 'archived']);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    // Add Session Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newSessionData, setNewSessionData] = useState({
        title: '',
        type: 'rehearsal',
        status: 'scheduled',
        start_time: new Date(),
        end_time: new Date(Date.now() + 2 * 60 * 60 * 1000)
    });

    // View/Edit Modal State
    const [viewSession, setViewSession] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editSessionData, setEditSessionData] = useState(null);
    const [sessionAssignments, setSessionAssignments] = useState([]);
    const [isEditingAssignments, setIsEditingAssignments] = useState(false);
    const [editedAssignments, setEditedAssignments] = useState([]);
    const [assignmentsLoading, setAssignmentsLoading] = useState(false);

    // Delete state
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deletePassword, setDeletePassword] = useState('');
    const [deleteError, setDeleteError] = useState('');
    const [deleteLoading, setDeleteLoading] = useState(false);

    useEffect(() => {
        const params = {};
        if (startDate) params.start_date = startDate.toISOString();
        if (endDate) {
            // Set end date to end of day to include all sessions on that day
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);
            params.end_date = endOfDay.toISOString();
        }
        dispatch(fetchSessions(params));
    }, [dispatch, startDate, endDate]);

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, statusFilter, typeFilter, startDate, endDate]);

    useEffect(() => {
        dispatch(fetchMembers());

        const fetchMetadata = async () => {
            try {
                const response = await axios.get('/sessions/metadata');
                if (response.data.types) setAvailableTypes(response.data.types);
                if (response.data.statuses) setAvailableStatuses(response.data.statuses);
            } catch (err) {
                console.error('Failed to fetch session metadata', err);
            }
        };
        fetchMetadata();
    }, [dispatch]);

    // Redirect non-admin
    useEffect(() => {
        if (!isAdmin) {
            navigate('/');
        }
    }, [isAdmin, navigate]);

    if (!isAdmin) return null;

    // Fuzzy search: case-insensitive substring match on title, type, status
    const fuzzyMatch = (session) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            (session.title || '').toLowerCase().includes(q) ||
            (session.type || '').toLowerCase().includes(q) ||
            (session.status || 'active').toLowerCase().includes(q)
        );
    };

    const filtered = sessions
        .filter(fuzzyMatch)
        .filter(s => statusFilter === 'all' || (s.status || 'active') === statusFilter)
        .filter(s => typeFilter === 'all' || s.type === typeFilter);

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
    const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
    const paginatedFiltered = filtered.slice((validCurrentPage - 1) * ITEMS_PER_PAGE, validCurrentPage * ITEMS_PER_PAGE);

    const grouped = {
        scheduled: paginatedFiltered.filter(s => s.status === 'scheduled'),
        active: paginatedFiltered.filter(s => (s.status || 'active') === 'active'),
        concluded: paginatedFiltered.filter(s => s.status === 'concluded'),
        archived: paginatedFiltered.filter(s => s.status === 'archived'),
    };

    const handleSelectAll = (e) => {
        const nextSelected = new Set(selected);
        if (e.target.checked) {
            paginatedFiltered.forEach(s => nextSelected.add(s.id));
        } else {
            paginatedFiltered.forEach(s => nextSelected.delete(s.id));
        }
        setSelected(nextSelected);
    };
    
    // Check if all paginated are selected
    const isAllSelected = paginatedFiltered.length > 0 && paginatedFiltered.every(s => selected.has(s.id));

    const handleStatusChange = (sessionId, newStatus) => {
        dispatch(updateSessionStatus({ id: sessionId, status: newStatus }));
    };

    const requestDelete = (sessionId, label) => {
        setDeleteTarget({ id: sessionId, label });
        setDeletePassword('');
        setDeleteError('');
    };

    const requestBulkDelete = () => {
        setDeleteTarget({ bulk: true, ids: [...selected], label: `${selected.size} session${selected.size > 1 ? 's' : ''}` });
        setDeletePassword('');
        setDeleteError('');
    };

    const handleConfirmDelete = async () => {
        setDeleteLoading(true);
        try {
            const response = await axios.post('/auth/login', { login: user.email, password: deletePassword });
            if (response.data.access_token) {
                if (deleteTarget.bulk) {
                    await dispatch(bulkDeleteSessions(deleteTarget.ids)).unwrap();
                    setSelected(new Set());
                } else {
                    await dispatch(deleteSession(deleteTarget.id)).unwrap();
                }
                setDeleteTarget(null);
            }
        } catch (err) {
            setDeleteError(err.response?.status === 401 ? 'Invalid password' : 'Error verifying password');
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleViewAttendance = (session) => {
        dispatch(setCurrentSession(session));
        navigate('/');
    };

    const handleViewSession = async (session) => {
        setViewSession(session);
        setIsEditMode(false);
        setEditSessionData({
            ...session,
            start_time: session.start_time ? new Date(session.start_time) : new Date(),
            end_time: session.end_time ? new Date(session.end_time) : new Date(Date.now() + 2 * 60 * 60 * 1000)
        });
        
        setAssignmentsLoading(true);
        setIsEditingAssignments(false);
        try {
            const res = await axios.get(`/calendar/schedule/session/${session.id}`);
            setSessionAssignments(res.data.assignments || []);
            setEditedAssignments(res.data.assignments || []);
        } catch (e) {
            console.error("Failed to load assignments", e);
            setSessionAssignments([]);
            setEditedAssignments([]);
        } finally {
            setAssignmentsLoading(false);
        }
    };

    const handleSaveAssignments = async () => {
        try {
            const payload = {
                sessions: [{
                    session_id: viewSession.id,
                    session_title: viewSession.title,
                    session_date: viewSession.start_time,
                    assignments: editedAssignments
                }]
            };
            await axios.post('/calendar/schedule/save', payload);
            setSessionAssignments(editedAssignments);
            setIsEditingAssignments(false);
            alert('Assignments saved successfully!');
        } catch (e) {
            alert('Failed to save assignments: ' + e);
        }
    };

    const handleUpdateSession = () => {
        const payload = {
            title: editSessionData.title,
            type: editSessionData.type,
            status: editSessionData.status,
            start_time: editSessionData.start_time.toISOString(),
            end_time: editSessionData.end_time.toISOString(),
        };
        dispatch(updateSession({ id: viewSession.id, data: payload }));
        setIsEditMode(false);
        setViewSession(null);
    };

    const handleAddSession = () => {
        if (!newSessionData.title.trim()) {
            alert('Session title is required');
            return;
        }
        const payload = {
            ...newSessionData,
            title: newSessionData.title.trim(),
            start_time: newSessionData.start_time.toISOString(),
            end_time: newSessionData.end_time.toISOString(),
        };
        dispatch(addSession(payload));
        setIsAddModalOpen(false);
        setNewSessionData({ title: '', type: 'rehearsal', status: 'scheduled', start_time: new Date(), end_time: new Date(Date.now() + 2 * 60 * 60 * 1000) });
    };

    const renderGroup = (title, items, statusKey) => {
        if (items.length === 0) return null;
        const sc = statusColors[statusKey];
        return (
            <div key={statusKey} style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0 }}>{title}</h3>
                    <span style={{
                        background: sc.bg, border: `1px solid ${sc.border}`, color: sc.color,
                        padding: '0.15rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600
                    }}>
                        {items.length}
                    </span>
                </div>
                {items.map(s => (
                    <div key={s.id} className={`glass-card session-card ${selected.has(s.id) ? 'selected' : ''}`} style={{
                        border: selected.has(s.id) ? undefined : `1px solid ${sc.border}`,
                        transition: 'all 0.2s ease'
                    }}
                        onClick={() => handleViewSession(s)}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <input
                                type="checkbox"
                                checked={selected.has(s.id)}
                                onChange={(e) => {
                                    e.stopPropagation();
                                    const next = new Set(selected);
                                    if (e.target.checked) next.add(s.id);
                                    else next.delete(s.id);
                                    setSelected(next);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                style={{ accentColor: '#818cf8', margin: 0, width: '18px', height: '18px', flexShrink: 0 }}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <strong style={{ lineHeight: '1.2' }}>{s.title}</strong>
                                <small style={{ color: 'var(--text-secondary)', lineHeight: '1.2', marginTop: '0.2rem' }}>{new Date(s.start_time).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}</small>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span className={`status-badge ${s.type === 'rehearsal' ? 'status-nfc' : 'status-manual'}`}>{s.type}</span>
                            <select
                                value={s.status || 'active'}
                                onChange={(e) => { e.stopPropagation(); handleStatusChange(s.id, e.target.value); }}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                    background: sc.bg, border: `1px solid ${sc.border}`, color: sc.color,
                                    borderRadius: '8px', padding: '0.2rem 0.4rem', fontSize: '0.8rem', cursor: 'pointer', outline: 'none'
                                }}
                            >
                                <option value="scheduled">Scheduled</option>
                                <option value="active">Active</option>
                                <option value="concluded">Concluded</option>
                                <option value="archived">Archived</option>
                            </select>
                            <button
                                className="btn"
                                style={{ background: 'rgba(255,50,50,0.2)', border: '1px solid rgba(255,50,50,0.4)', color: '#ff6b6b', padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                                onClick={(e) => { e.stopPropagation(); requestDelete(s.id, s.title); }}
                            >
                                🗑️
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <>
            <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
                    
                    {/* Top Row: Title, Select All, Add, Delete */}
                    <div className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                            <h2 style={{ margin: 0 }}>All Sessions</h2>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                <input 
                                    type="checkbox" 
                                    checked={isAllSelected}
                                    onChange={handleSelectAll}
                                    style={{ margin: 0, width: '18px', height: '18px', accentColor: '#818cf8' }}
                                />
                                Select all
                            </label>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <button
                                className="btn"
                                style={{ background: 'var(--primary-color)', color: 'white', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                                onClick={() => setIsAddModalOpen(true)}
                            >
                                + Add Session
                            </button>
                            {selected.size > 0 && (
                                <button
                                    className="btn"
                                    style={{ background: 'rgba(255,50,50,0.2)', border: '1px solid rgba(255,50,50,0.4)', color: '#ff6b6b', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                                    onClick={requestBulkDelete}
                                >
                                    🗑️ Delete {selected.size} selected
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Filter Row */}
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <input
                            type="text"
                            placeholder="🔍 Search sessions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                flex: 1, minWidth: '200px', padding: '0.4rem 1rem', borderRadius: '10px',
                                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)',
                                color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none',
                                transition: 'border-color 0.2s ease', height: '38px', margin: 0
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'rgba(129, 140, 248, 0.5)'}
                            onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
                        />
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                            {['all', ...availableStatuses].map(f => (
                                <button
                                    key={f}
                                    className="btn"
                                    onClick={() => setStatusFilter(f)}
                                    style={{
                                        padding: '0.4rem 0.8rem', fontSize: '0.8rem', height: '38px',
                                        background: statusFilter === f ? 'rgba(129, 140, 248, 0.2)' : 'rgba(255,255,255,0.05)',
                                        border: statusFilter === f ? '1px solid rgba(129, 140, 248, 0.4)' : '1px solid rgba(255,255,255,0.15)',
                                        color: statusFilter === f ? '#818cf8' : 'var(--text-secondary)',
                                        borderRadius: '8px', textTransform: 'capitalize', display: 'flex', alignItems: 'center'
                                    }}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>

                        {/* Type Filter */}
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '0 0.75rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', height: '38px' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Type:</span>
                            <select
                                className="input-field"
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                                style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', padding: '0', cursor: 'pointer', outline: 'none', fontSize: '0.85rem', textTransform: 'capitalize' }}
                            >
                                <option value="all" style={{ background: '#1e1b4b' }}>All Types</option>
                                {availableTypes.map(type => (
                                    <option key={type} value={type} style={{ background: '#1e1b4b' }}>
                                        {type}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Date Range Filter */}
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '0 0.75rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', height: '38px' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>From:</span>
                            <DatePicker
                                selected={startDate}
                                onChange={(date) => setStartDate(date)}
                                placeholderText="Start Date"
                                className="date-picker-input-small"
                                wrapperClassName="date-picker-wrapper-small"
                                dateFormat="MMM d, yyyy"
                                isClearable
                            />
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>To:</span>
                            <DatePicker
                                selected={endDate}
                                onChange={(date) => setEndDate(date)}
                                placeholderText="End Date"
                                className="date-picker-input-small"
                                wrapperClassName="date-picker-wrapper-small"
                                dateFormat="MMM d, yyyy"
                                isClearable
                            />
                            {(startDate || endDate) && (
                                <button 
                                    className="btn" 
                                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', background: 'rgba(255,255,255,0.1)' }}
                                    onClick={() => { setStartDate(null); setEndDate(null); }}
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {filtered.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
                        {searchQuery ? `No sessions matching "${searchQuery}"` : 'No sessions found.'}
                    </p>
                ) : (
                    <>
                        {renderGroup('🔵 Scheduled', grouped.scheduled, 'scheduled')}
                        {renderGroup('🟢 Active', grouped.active, 'active')}
                        {renderGroup('🟡 Concluded', grouped.concluded, 'concluded')}
                        {renderGroup('⚪ Archived', grouped.archived, 'archived')}

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '2rem', padding: '1rem 0', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                <button
                                    className="btn"
                                    disabled={validCurrentPage === 1}
                                    onClick={() => setCurrentPage(validCurrentPage - 1)}
                                    style={{
                                        background: validCurrentPage === 1 ? 'rgba(255,255,255,0.05)' : 'rgba(129, 140, 248, 0.2)',
                                        color: validCurrentPage === 1 ? 'var(--text-secondary)' : '#818cf8',
                                        border: validCurrentPage === 1 ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(129, 140, 248, 0.4)',
                                        padding: '0.4rem 1rem', borderRadius: '8px', cursor: validCurrentPage === 1 ? 'not-allowed' : 'pointer', fontSize: '0.9rem', width: '100px'
                                    }}
                                >
                                    Previous
                                </button>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', minWidth: '80px', textAlign: 'center' }}>
                                    Page {validCurrentPage} of {totalPages}
                                </span>
                                <button
                                    className="btn"
                                    disabled={validCurrentPage === totalPages}
                                    onClick={() => setCurrentPage(validCurrentPage + 1)}
                                    style={{
                                        background: validCurrentPage === totalPages ? 'rgba(255,255,255,0.05)' : 'rgba(129, 140, 248, 0.2)',
                                        color: validCurrentPage === totalPages ? 'var(--text-secondary)' : '#818cf8',
                                        border: validCurrentPage === totalPages ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(129, 140, 248, 0.4)',
                                        padding: '0.4rem 1rem', borderRadius: '8px', cursor: validCurrentPage === totalPages ? 'not-allowed' : 'pointer', fontSize: '0.9rem', width: '100px'
                                    }}
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Add Session Modal */}
            {isAddModalOpen && (
                <Modal
                    title="Add New Session"
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                    onSubmit={handleAddSession}
                    hideFooter
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Session Title</label>
                            <input autoFocus placeholder="e.g. Sunday Service" value={newSessionData.title} onChange={e => setNewSessionData({ ...newSessionData, title: e.target.value })} style={{ width: '100%' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Scheduled Start Time</label>
                            <DatePicker
                                selected={newSessionData.start_time}
                                onChange={(date) => setNewSessionData({ ...newSessionData, start_time: date })}
                                showTimeSelect
                                dateFormat="Pp"
                                className="date-picker-input"
                                wrapperClassName="date-picker-wrapper"
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Scheduled End Time</label>
                            <DatePicker
                                selected={newSessionData.end_time}
                                onChange={(date) => setNewSessionData({ ...newSessionData, end_time: date })}
                                showTimeSelect
                                dateFormat="Pp"
                                className="date-picker-input"
                                wrapperClassName="date-picker-wrapper"
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Session Type</label>
                            <select value={newSessionData.type} onChange={e => setNewSessionData({ ...newSessionData, type: e.target.value })} style={{ width: '100%' }}>
                                {availableTypes.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Status</label>
                            <select value={newSessionData.status} onChange={e => setNewSessionData({ ...newSessionData, status: e.target.value })} style={{ width: '100%' }}>
                                {availableStatuses.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                            </select>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                            <button type="button" className="btn" style={{ background: 'transparent', border: '1px solid var(--text-secondary)' }} onClick={() => setIsAddModalOpen(false)}>
                                Cancel
                            </button>
                            <button type="button" className="btn" style={{ background: 'var(--primary-color)', color: 'white' }} onClick={handleAddSession}>
                                Add Session
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* View/Edit Modal */}
            {viewSession && (
                <Modal
                    title={isEditMode ? "Edit Session Details" : "Session Details"}
                    isOpen={!!viewSession}
                    onClose={() => {
                        setViewSession(null);
                        setIsEditMode(false);
                    }}
                    onSubmit={isEditMode ? handleUpdateSession : undefined}
                    hideFooter
                >
                    {!isEditMode ? (
                        <div>
                            <p><strong>Title:</strong> {viewSession.title}</p>
                            <p><strong>Type:</strong> <span className={`status-badge ${viewSession.type === 'rehearsal' ? 'status-nfc' : 'status-manual'}`}>{viewSession.type}</span></p>
                            <p><strong>Status:</strong> <span className="status-badge" style={{ background: statusColors[viewSession.status || 'active'].bg, color: statusColors[viewSession.status || 'active'].color }}>{viewSession.status || 'active'}</span></p>
                            <p><strong>Start Time:</strong> {new Date(viewSession.start_time).toLocaleString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}</p>
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                                <button className="btn" style={{ background: 'var(--primary-color)' }} onClick={() => handleViewAttendance(viewSession)}>
                                    View Attendance
                                </button>
                                <button className="btn" style={{ background: '#4b5563' }} onClick={() => setIsEditMode(true)}>
                                    Edit Details
                                </button>
                            </div>

                            {/* Assignments Section */}
                            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f8fafc' }}>Role Assignments</h3>
                                    {!isEditingAssignments ? (
                                        <button className="btn" style={{ background: 'transparent', border: '1px solid var(--text-secondary)', padding: '0.25rem 0.6rem', fontSize: '0.8rem' }} onClick={() => setIsEditingAssignments(true)}>
                                            Edit Roles
                                        </button>
                                    ) : (
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button className="btn" style={{ background: 'transparent', border: '1px solid var(--text-secondary)', padding: '0.25rem 0.6rem', fontSize: '0.8rem' }} onClick={() => { setIsEditingAssignments(false); setEditedAssignments(sessionAssignments); }}>
                                                Cancel
                                            </button>
                                            <button className="btn" style={{ background: 'var(--primary-color)', color: 'white', padding: '0.25rem 0.6rem', fontSize: '0.8rem' }} onClick={handleSaveAssignments}>
                                                Save
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {assignmentsLoading ? (
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading assignments...</p>
                                ) : !isEditingAssignments ? (
                                    sessionAssignments.length > 0 ? (
                                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                            {sessionAssignments.map((a, idx) => (
                                                <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.9rem' }}>
                                                    <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{a.role.replace('_', ' ')}</span>
                                                    <span style={{ fontWeight: 500, color: '#f8fafc' }}>{a.member_name}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontStyle: 'italic' }}>No roles assigned for this session.</p>
                                    )
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {['lead_singer', 'soprano', 'alto', 'tenor'].map(role => {
                                            const roleAssign = editedAssignments.find(a => a.role === role);
                                            return (
                                                <div key={role} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                                                    <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'capitalize', width: '100px' }}>{role.replace('_', ' ')}</label>
                                                    <select 
                                                        style={{ flex: 1, padding: '0.4rem', fontSize: '0.9rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '6px' }}
                                                        value={roleAssign ? roleAssign.member_id : ''}
                                                        onChange={e => {
                                                            const memberId = e.target.value;
                                                            let nextAssignments = editedAssignments.filter(a => a.role !== role);
                                                            if (memberId) {
                                                                const sMember = members.find(m => m.id === parseInt(memberId));
                                                                if (sMember) {
                                                                    nextAssignments.push({
                                                                        member_id: sMember.id,
                                                                        member_name: `${sMember.first_name} ${sMember.last_name}`,
                                                                        role: role
                                                                    });
                                                                }
                                                            }
                                                            setEditedAssignments(nextAssignments);
                                                        }}
                                                    >
                                                        <option value="">-- Unassigned --</option>
                                                        {members.map(m => (
                                                            <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Session Title</label>
                                <input placeholder="Session Title" value={editSessionData.title} onChange={e => setEditSessionData({ ...editSessionData, title: e.target.value })} style={{ width: '100%' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Scheduled Start Time</label>
                                <DatePicker
                                    selected={editSessionData.start_time}
                                    onChange={(date) => setEditSessionData({ ...editSessionData, start_time: date })}
                                    showTimeSelect
                                    dateFormat="Pp"
                                    className="date-picker-input"
                                    wrapperClassName="date-picker-wrapper"
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Scheduled End Time</label>
                                <DatePicker
                                    selected={editSessionData.end_time}
                                    onChange={(date) => setEditSessionData({ ...editSessionData, end_time: date })}
                                    showTimeSelect
                                    dateFormat="Pp"
                                    className="date-picker-input"
                                    wrapperClassName="date-picker-wrapper"
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Session Type</label>
                                <select value={editSessionData.type} onChange={e => setEditSessionData({ ...editSessionData, type: e.target.value })} style={{ width: '100%' }}>
                                    {availableTypes.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Status</label>
                                <select value={editSessionData.status} onChange={e => setEditSessionData({ ...editSessionData, status: e.target.value })} style={{ width: '100%' }}>
                                    {availableStatuses.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                                <button type="button" className="btn" style={{ background: 'transparent', border: '1px solid var(--text-secondary)' }} onClick={() => setIsEditMode(false)}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </Modal>
            )}

            {/* Delete Confirmation Modal */}
            {deleteTarget && (
                <div className="modal-overlay">
                    <div className="glass-card" style={{ maxWidth: '420px', width: '100%', margin: 0 }}>
                        <h2 style={{ color: '#ff6b6b' }}>⚠️ Confirm Delete</h2>
                        <p>
                            You are about to delete: <strong>{deleteTarget.label}</strong>
                        </p>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                            This will also delete all attendance records for {deleteTarget.bulk ? 'these sessions' : 'this session'}.
                        </p>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                            Enter your password to confirm:
                        </label>
                        <input
                            type="password"
                            placeholder="Password"
                            value={deletePassword}
                            onChange={e => { setDeletePassword(e.target.value); setDeleteError(''); }}
                            onKeyDown={e => e.key === 'Enter' && handleConfirmDelete()}
                            autoFocus
                        />
                        {deleteError && (
                            <p style={{ color: '#ff6b6b', fontSize: '0.85rem', marginTop: '0.5rem' }}>{deleteError}</p>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                            <button
                                className="btn"
                                style={{ background: 'transparent', border: '1px solid var(--text-secondary)' }}
                                onClick={() => setDeleteTarget(null)}
                                disabled={deleteLoading}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn"
                                style={{ background: 'rgba(255,50,50,0.3)', border: '1px solid rgba(255,50,50,0.6)', color: '#ff6b6b' }}
                                onClick={handleConfirmDelete}
                                disabled={deleteLoading || !deletePassword}
                            >
                                {deleteLoading ? 'Verifying...' : '🗑️ Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default Sessions;
