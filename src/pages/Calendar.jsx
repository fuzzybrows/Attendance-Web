import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Calendar as BigCalendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import {
    fetchMonthAvailability,
    fetchSchedule,
    generateSchedule,
    updateAvailability,
    updateDayAvailability,
    saveSchedule,
    setLocalSchedule,
    fetchUnavailableDays,
    fetchExternalEvents
} from '../store/calendarSlice';
import axios from 'axios';

const localizer = momentLocalizer(moment);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const Calendar = () => {
    const dispatch = useDispatch();
    const { availability, schedule, unavailableDays, externalEvents, googleConnected, status, error } = useSelector((state) => state.calendar);
    const { token, user: member } = useSelector((state) => state.auth);

    const [currentDate, setCurrentDate] = useState(new Date());
    const [currentView, setCurrentView] = useState('month');
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [isAvailable, setIsAvailable] = useState(true);
    const [selectedDays, setSelectedDays] = useState([]); // array of date strings for day-level modal
    const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
    const [generateMonth, setGenerateMonth] = useState(new Date().getMonth() + 1);
    const [generateYear, setGenerateYear] = useState(new Date().getFullYear());

    const isAdmin = member?.permissions?.includes('admin') || member?.roles?.includes('admin');

    // Custom Date Header component for checkboxes
    const CustomDateHeader = ({ label, date }) => {
        const localDateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const isSelected = selectedDays.includes(localDateStr);

        if (!isMultiSelectMode) return <span>{label}</span>;

        return (
            <div 
                style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    width: '100%',
                    padding: '2px 6px',
                    margin: '-2px -4px',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    transition: 'all 0.2s',
                    background: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                    pointerEvents: 'none' // Let the cell-level onSelectSlot handle it to avoid double-toggling
                }}
            >
                <span style={{ 
                    fontWeight: isSelected ? '700' : '500', 
                    color: isSelected ? '#f8fafc' : '#94a3b8',
                    fontSize: '0.9rem'
                }}>
                    {label}
                </span>
                <input 
                    type="checkbox" 
                    checked={isSelected}
                    readOnly
                    style={{ 
                        cursor: 'pointer',
                        width: '18px',
                        height: '18px',
                        margin: 0,
                        accentColor: '#6366f1'
                    }}
                />
            </div>
        );
    };

    // Fetch data when month changes
    useEffect(() => {
        if (token) {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1; // 1-indexed for backend
            if (isAdmin) {
                dispatch(fetchMonthAvailability({ year, month, token }));
            }
            dispatch(fetchSchedule({ year, month, token }));
            dispatch(fetchUnavailableDays({ year, month, token }));
            dispatch(fetchExternalEvents({ year, month, token }));
        }
    }, [currentDate, token, dispatch, isAdmin]);

    // Check for success/error query params from Google Auth Callback
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('google_success')) {
            alert('Successfully connected to Google Calendar!');
            window.history.replaceState({}, document.title, window.location.pathname);
            // Refetch external events
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1;
            if (token) dispatch(fetchExternalEvents({ year, month, token }));
        } else if (urlParams.has('google_error')) {
            alert(`Google Calendar connection failed: ${urlParams.get('google_error')}`);
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, [token, dispatch, currentDate]);

    // Map the fetched schedule/availability data to BigCalendar events
    const events = useMemo(() => {
        const sourceData = schedule?.sessions?.length ? schedule.sessions : (availability?.sessions || []);
        
        const internalEvents = sourceData.map(session => {
            const start = new Date(session.session_date || session.start_time);
            const end = new Date(start.getTime() + 3 * 60 * 60 * 1000); // add 3 hrs for UI bounds

            // Check if current user is opted out
            const isOptedOut = availability?.sessions?.find(s => s.id === session.session_id)?.opted_out_member_ids?.includes(member?.id);

            return {
                id: session.session_id || session.id,
                title: session.session_title || session.title,
                start,
                end,
                assignments: session.assignments || [],
                optedOut: isOptedOut || false,
                originalData: session,
                is_external: false
            }
        });

        const mappedExternal = (externalEvents || []).map(ext => ({
            id: ext.id,
            title: `(Busy) ${ext.title}`,
            start: new Date(ext.start),
            end: new Date(ext.end),
            is_external: true
        }));

        return [...internalEvents, ...mappedExternal];
    }, [schedule, availability, member, externalEvents]);

    const handleSelectEvent = (event) => {
        setSelectedEvent(event);
        setIsAvailable(!event.optedOut);
    };

    const handleToggleAvailability = () => {
        const newAvailability = !isAvailable;
        dispatch(updateAvailability({ sessionId: selectedEvent.id, isAvailable: newAvailability, token }))
            .unwrap()
            .then(() => {
                setIsAvailable(newAvailability);
                // Refetch availability to update UI state
                const year = currentDate.getFullYear();
                const month = currentDate.getMonth() + 1;
                if (isAdmin) dispatch(fetchMonthAvailability({ year, month, token }));
                alert("Availability updated!");
            })
            .catch((err) => alert("Failed to update availability: " + err));
    };

    const handleSelectSlot = ({ slots, action }) => {
        // action can be 'select' or 'click'
        console.log("Slot selected:", { slots, action, isMultiSelectMode });
        
        // Extract unique local dates
        const uniqueDates = [...new Set(slots.map(date => {
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        }))];

        if (isMultiSelectMode) {
            setSelectedDays(prev => {
                let next = [...prev];
                uniqueDates.forEach(d => {
                    if (next.includes(d)) {
                        next = next.filter(existing => existing !== d);
                    } else {
                        next.push(d);
                    }
                });
                return next.sort();
            });
        } else {
            // In single select mode, we only set one day unless drag happened
            if (uniqueDates.length > 0) {
                setSelectedDays(uniqueDates);
            }
        }
    };

    const handleMarkDay = (isAvail) => {
        Promise.all(selectedDays.map(date => 
            dispatch(updateDayAvailability({ date, isAvailable: isAvail, token })).unwrap()
        ))
        .then(() => {
            const count = selectedDays.length;
            setSelectedDays([]);
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1;
            dispatch(fetchSchedule({ year, month, token }));
            dispatch(fetchUnavailableDays({ year, month, token }));
            if (isAdmin) dispatch(fetchMonthAvailability({ year, month, token }));
            alert(`${count} day(s) marked as ${isAvail ? 'available' : 'unavailable'}.`);
        })
        .catch((err) => alert("Failed to update availability: " + err));
    };

    const handleGenerateSchedule = (month, year) => {
        dispatch(generateSchedule({ year, month, token }));
        setIsGenerateModalOpen(false);
    };

    const handleSaveSchedule = () => {
        dispatch(saveSchedule({ scheduleData: schedule, token }))
            .unwrap()
            .then(() => alert("Schedule saved successfully!"))
            .catch(e => alert("Failed to save: " + e));
    };

    const handleExportCSV = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        window.open(`${API_URL}/calendar/schedule/export_csv?year=${year}&month=${month}`, '_blank');
    };

    const handleSyncICS = () => {
        window.open(`${API_URL}/calendar/sync/${member.id}.ics`, '_blank');
    };

    const handleConnectGoogle = async () => {
        try {
            const res = await axios.get('/auth/google/login', {
                headers: { Authorization: `Bearer ${token}` }
            });
            window.location.href = res.data.auth_url;
        } catch (err) {
            alert("Failed to initiate Google Login: " + (err?.response?.data?.detail || err.message));
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Schedule & Calendar</h1>
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            setIsMultiSelectMode(!isMultiSelectMode);
                            setSelectedDays([]); // clear selection when toggling mode
                        }}
                        className={`px-4 py-2 rounded shadow transition font-medium ${isMultiSelectMode ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'}`}
                    >
                        {isMultiSelectMode ? 'Cancel Multi-Select' : 'Select Multiple Days'}
                    </button>
                    {!googleConnected && (
                        <button
                            onClick={handleConnectGoogle}
                            className="bg-blue-100 text-blue-700 px-4 py-2 rounded shadow hover:bg-blue-200 transition font-medium flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/><path d="M1 1h22v22H1z" fill="none"/></svg>
                            Connect Google
                        </button>
                    )}
                    <button
                        onClick={handleSyncICS}
                        className="bg-purple-600 text-white px-4 py-2 rounded shadow hover:bg-purple-700 transition"
                    >
                        Export to Calendar Apps (.ics)
                    </button>
                    {isAdmin && (
                        <>
                            <button
                                onClick={() => {
                                    setGenerateMonth(currentDate.getMonth() + 1);
                                    setGenerateYear(currentDate.getFullYear());
                                    setIsGenerateModalOpen(true);
                                }}
                                className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition"
                            >
                                Auto-Generate Roles
                            </button>
                            {schedule?.sessions?.length > 0 && (
                                <button
                                    onClick={handleSaveSchedule}
                                    className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 transition"
                                >
                                    Save Draft
                                </button>
                            )}
                            <button
                                onClick={handleExportCSV}
                                className="bg-gray-800 text-white px-4 py-2 rounded shadow hover:bg-gray-900 transition"
                            >
                                Export CSV
                            </button>
                        </>
                    )}
                </div>
            </div>

            {status === 'loading' && <p className="text-blue-500 mb-4">Loading calendar data...</p>}
            {error && <p className="text-red-500 mb-4">{error}</p>}

            <div className="glass-card" style={{ height: '70vh', minHeight: '600px', padding: '1rem' }}>
                <BigCalendar
                    localizer={localizer}
                    events={events}
                    date={currentDate}
                    view={currentView}
                    onView={(view) => setCurrentView(view)}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: '100%' }}
                    onNavigate={(date) => setCurrentDate(date)}
                    onSelectEvent={handleSelectEvent}
                    onSelectSlot={handleSelectSlot}
                    selectable
                    views={['month', 'week', 'day']}
                    components={{
                        month: {
                            dateHeader: CustomDateHeader
                        }
                    }}
                    dayPropGetter={(date) => {
                        const localDateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                        
                        let style = {};
                        if (unavailableDays?.includes(localDateStr)) {
                            style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
                            style.opacity = 0.8;
                        }
                        
                        if (isMultiSelectMode && selectedDays.includes(localDateStr)) {
                            style.border = '2px solid #6366f1';
                            style.backgroundColor = 'rgba(99, 102, 241, 0.15)';
                            style.opacity = 1;
                        }

                        return { style };
                    }}
                    eventPropGetter={(event) => {
                        if (event.is_external) {
                            return {
                                className: 'external-event',
                                style: {
                                    opacity: 0.8,
                                    fontSize: '0.85rem' // Slightly smaller text
                                }
                            };
                        }
                        return {};
                    }}
                />
            </div>

            {/* Event Details Modal */}
            {selectedEvent && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
                    <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 10px 40px rgba(0,0,0,0.4)', width: '100%', maxWidth: '420px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0, color: '#f8fafc' }}>{selectedEvent.title}</h2>
                            <button onClick={() => setSelectedEvent(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}>&times;</button>
                        </div>
                        <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '1rem' }}>{selectedEvent.start.toLocaleString()}</p>

                        {selectedEvent.is_external ? (
                            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <p style={{ fontSize: '0.9rem', color: '#cbd5e1', margin: 0 }}>This is a personal event imported from your connected Google Calendar.</p>
                            </div>
                        ) : (
                            <>
                                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    <h3 style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#f8fafc' }}>My Availability</h3>
                                    <button
                                        onClick={handleToggleAvailability}
                                        style={{
                                            width: '100%', padding: '0.5rem', borderRadius: '8px', fontWeight: 500, cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            background: isAvailable ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                            color: isAvailable ? '#34d399' : '#f87171',
                                            border: isAvailable ? '2px solid rgba(16,185,129,0.4)' : '2px solid rgba(239,68,68,0.3)'
                                        }}
                                    >
                                        {isAvailable ? '✅ I am available' : '❌ I am unavailable'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            const dayStr = selectedEvent.start.toISOString().split('T')[0];
                                            if (window.confirm(`Mark ALL sessions on ${dayStr} as unavailable?`)) {
                                                dispatch(updateDayAvailability({ date: dayStr, isAvailable: false, token }))
                                                    .unwrap()
                                                    .then(() => {
                                                        setSelectedEvent(null);
                                                        const year = currentDate.getFullYear();
                                                        const month = currentDate.getMonth() + 1;
                                                        dispatch(fetchSchedule({ year, month, token }));
                                                        if (isAdmin) dispatch(fetchMonthAvailability({ year, month, token }));
                                                        alert(`All sessions on ${dayStr} marked as unavailable.`);
                                                    })
                                                    .catch((err) => alert(err));
                                            }
                                        }}
                                        style={{
                                            width: '100%', marginTop: '0.5rem', padding: '0.5rem', borderRadius: '8px', fontWeight: 500, cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            background: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: '2px solid rgba(245,158,11,0.3)'
                                        }}
                                    >
                                        🚫 Mark whole day unavailable
                                    </button>
                                </div>

                                {selectedEvent.assignments.length > 0 && (
                                    <div style={{ marginBottom: '1rem' }}>
                                        <h3 style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#f8fafc' }}>Role Assignments</h3>
                                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                            {selectedEvent.assignments.map((a, idx) => (
                                                <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', padding: '0.25rem 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                                    <span style={{ color: '#94a3b8', textTransform: 'capitalize' }}>{a.role.replace('_', ' ')}:</span>
                                                    <span style={{ fontWeight: 500, color: '#f8fafc' }}>{a.member_name}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {selectedEvent.assignments.length === 0 && (
                                    <p style={{ fontSize: '0.875rem', color: '#64748b', fontStyle: 'italic' }}>No roles assigned for this session yet.</p>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Day Selection Modal (Single-Day Mode) */}
            {!isMultiSelectMode && selectedDays.length > 0 && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
                    <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 10px 40px rgba(0,0,0,0.4)', width: '100%', maxWidth: '360px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0, color: '#f8fafc' }}>
                                📅 {selectedDays.length === 1 ? selectedDays[0] : `${selectedDays[0]} to ${selectedDays[selectedDays.length - 1]}`}
                            </h2>
                            <button onClick={() => setSelectedDays([])} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}>&times;</button>
                        </div>
                        <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '1.5rem' }}>Set your availability for <strong style={{ color: '#f8fafc' }}>{selectedDays.length > 1 ? 'all selected days' : 'all sessions on this day'}</strong>.</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <button
                                onClick={() => handleMarkDay(false)}
                                style={{
                                    width: '100%', padding: '0.5rem', borderRadius: '8px', fontWeight: 500, cursor: 'pointer',
                                    background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '2px solid rgba(239,68,68,0.3)', transition: 'all 0.2s'
                                }}
                            >
                                🚫 Mark {selectedDays.length > 1 ? `${selectedDays.length} days` : 'whole day'} unavailable
                            </button>
                            <button
                                onClick={() => handleMarkDay(true)}
                                style={{
                                    width: '100%', padding: '0.5rem', borderRadius: '8px', fontWeight: 500, cursor: 'pointer',
                                    background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '2px solid rgba(16,185,129,0.3)', transition: 'all 0.2s'
                                }}
                            >
                                ✅ Mark {selectedDays.length > 1 ? `${selectedDays.length} days` : 'whole day'} available
                            </button>
                            <button
                                onClick={() => setSelectedDays([])}
                                style={{
                                    width: '100%', padding: '0.5rem', borderRadius: '8px', fontWeight: 500, cursor: 'pointer',
                                    background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.15)', transition: 'all 0.2s'
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Multi-Select Floating Action Bar */}
            {isMultiSelectMode && selectedDays.length > 0 && (
                <div style={{ 
                    position: 'fixed', 
                    bottom: '2rem', 
                    left: '50%', 
                    transform: 'translateX(-50%)', 
                    background: 'rgba(30, 41, 59, 0.9)', 
                    backdropFilter: 'blur(12px)',
                    padding: '1rem 1.5rem', 
                    borderRadius: '16px', 
                    boxShadow: '0 20px 40px rgba(0,0,0,0.6)', 
                    display: 'flex', 
                    gap: '1rem', 
                    alignItems: 'center', 
                    zIndex: 1000, 
                    border: '1px solid rgba(255,255,255,0.1)',
                    animation: 'slideUp 0.3s ease-out'
                }}>
                    <style>{`
                        @keyframes slideUp {
                            from { transform: translate(-50%, 20px); opacity: 0; }
                            to { transform: translate(-50%, 0); opacity: 1; }
                        }
                    `}</style>
                    <span style={{ color: '#f8fafc', fontWeight: 'bold', fontSize: '1.1rem' }}>{selectedDays.length} days selected</span>
                    <button onClick={() => handleMarkDay(false)} className="bg-red-500/20 text-red-400 border border-red-500/30 px-4 py-2 rounded-lg font-medium hover:bg-red-500/30 transition shadow-sm">
                        🚫 Mark Unavailable
                    </button>
                    <button onClick={() => handleMarkDay(true)} className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-lg font-medium hover:bg-emerald-500/30 transition shadow-sm">
                        ✅ Mark Available
                    </button>
                    <button onClick={() => setSelectedDays([])} className="text-slate-400 hover:text-white px-2 font-medium transition">
                        Clear
                    </button>
                </div>
            )}
            {/* Auto-Generate Month/Year Selection Modal */}
            {isGenerateModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(8px)' }}>
                    <div className="glass-card" style={{ padding: '2rem', width: '100%', maxWidth: '400px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <h2 className="text-2xl font-bold text-white mb-6">Select Month & Year</h2>
                        <p className="text-slate-400 mb-6">Choose which month to auto-generate singer assignments for.</p>
                        
                        <div className="mb-4">
                            <label className="block text-slate-400 text-sm mb-2">Month</label>
                            <select 
                                value={generateMonth} 
                                onChange={(e) => setGenerateMonth(Number(e.target.value))}
                                style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: 'white', width: '100%', padding: '0.75rem', borderRadius: '0.5rem' }}
                            >
                                {moment.months().map((m, i) => (
                                    <option key={m} value={i + 1}>{m}</option>
                                ))}
                            </select>
                        </div>

                        <div className="mb-8">
                            <label className="block text-slate-400 text-sm mb-2">Year</label>
                            <select 
                                value={generateYear} 
                                onChange={(e) => setGenerateYear(Number(e.target.value))}
                                style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: 'white', width: '100%', padding: '0.75rem', borderRadius: '0.5rem' }}
                            >
                                {[new Date().getFullYear(), new Date().getFullYear() + 1].map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex gap-4">
                            <button 
                                onClick={() => setIsGenerateModalOpen(false)}
                                className="flex-1 bg-slate-700 text-slate-200 py-3 rounded-xl font-semibold hover:bg-slate-600 transition"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => handleGenerateSchedule(generateMonth, generateYear)}
                                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition shadow-lg shadow-blue-900/40"
                            >
                                Generate
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Calendar;
