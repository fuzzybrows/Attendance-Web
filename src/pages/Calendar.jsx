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
import { fetchMembers } from '../store/membersSlice';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';

const localizer = momentLocalizer(moment);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const Calendar = () => {
    const dispatch = useDispatch();
    const { availability, schedule, unavailableDays, externalEvents, googleConnected, status, error } = useSelector((state) => state.calendar);
    const { items: members } = useSelector((state) => state.members);
    const { token, user: currentUser } = useSelector((state) => state.auth);

    const [currentDate, setCurrentDate] = useState(new Date());
    const [currentView, setCurrentView] = useState('month');
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [isEditingAssignments, setIsEditingAssignments] = useState(false);
    const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
    const [isAvailable, setIsAvailable] = useState(true);
    const [selectedDays, setSelectedDays] = useState([]); // array of date strings for day-level modal
    const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
    const [generateMonth, setGenerateMonth] = useState(new Date().getMonth() + 1);
    const [generateYear, setGenerateYear] = useState(new Date().getFullYear());

    const isAdmin = currentUser?.permissions?.includes('admin') || currentUser?.roles?.includes('admin');
    const isScheduleRead = isAdmin || currentUser?.permissions?.includes('schedule_read');
    const isAssignmentsEdit = isAdmin || currentUser?.permissions?.includes('assignments_edit');
    const isTemplatesManage = isAdmin || currentUser?.permissions?.includes('templates_manage');
    const isScheduleGenerate = isAdmin || currentUser?.permissions?.includes('schedule_generate');
    const isScheduleExport = isAdmin || currentUser?.permissions?.includes('schedule_export');
    const [choirRoles, setChoirRoles] = useState(['lead_singer', 'soprano', 'alto', 'tenor']);
    const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
    const todayStr = new Date().toISOString().split('T')[0];
    const jsDayInit = new Date(todayStr + 'T00:00:00').getDay();
    const initDayOfWeek = jsDayInit === 0 ? 6 : jsDayInit - 1;

    const [templates, setTemplates] = useState([]);
    const [deletingTemplateId, setDeletingTemplateId] = useState(null);
    const [newTemplate, setNewTemplate] = useState({
        title: 'Weekly Rehearsal',
        type: 'rehearsal',
        frequency: 'weekly',
        reference_start_date: todayStr,
        day_of_week: initDayOfWeek,
        start_time: '18:00:00',
        end_time: '20:00:00'
    });

    const [confirmState, setConfirmState] = useState({ 
        isOpen: false, 
        title: '', 
        message: '', 
        onConfirm: () => {},
        type: 'danger' 
    });

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
            
            // Managers/privileged users need extra data
            if (isAssignmentsEdit || isTemplatesManage || isScheduleGenerate || isScheduleRead) {
                dispatch(fetchMonthAvailability({ year, month, token }));
                dispatch(fetchMembers());
                
                // Fetch choir roles for dynamic UI
                axios.get(`${API_URL}/members/metadata`, {
                    headers: { Authorization: `Bearer ${token}` }
                }).then(res => {
                    if (res.data.choir_roles?.length > 0) {
                        setChoirRoles(res.data.choir_roles);
                    }
                }).catch(err => console.error("Failed to fetch choir roles", err));

                // Fetch session templates
                axios.get(`${API_URL}/session-templates/`, {
                    headers: { Authorization: `Bearer ${token}` }
                }).then(res => {
                    setTemplates(res.data);
                }).catch(err => console.error("Failed to fetch templates", err));
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
            toast.success('Successfully connected to Google Calendar!');
            window.history.replaceState({}, document.title, window.location.pathname);
            // Refetch external events
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1;
            if (token) dispatch(fetchExternalEvents({ year, month, token }));
        } else if (urlParams.has('google_error')) {
            toast.error(`Google Calendar connection failed: ${urlParams.get('google_error')}`);
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, [token, dispatch, currentDate]);

    // Map the fetched schedule/availability data to BigCalendar events
    const events = useMemo(() => {
        const sourceData = schedule?.sessions?.length ? schedule.sessions : (availability?.sessions || []);
        
        const internalEvents = sourceData.map(session => {
            const start = new Date(session.session_date || session.start_time);
            const fallbackEnd = new Date(start.getTime() + 3 * 60 * 60 * 1000); // 3 hr fallback
            const end = session.end_time ? new Date(session.end_time) : fallbackEnd;

            // Check if current user is opted out
            const isOptedOut = availability?.sessions?.find(s => s.id === (session.session_id || session.id))?.opted_out_member_ids?.includes(currentUser?.id);
            
            const assignments = session.assignments || [];
            const isAssigned = assignments.some(a => String(a.member_id) === String(currentUser?.id));

            return {
                id: session.session_id || session.id,
                title: session.session_title || session.title,
                start,
                end,
                assignments: assignments,
                optedOut: isOptedOut || false,
                isAssigned: isAssigned,
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
    }, [schedule, availability, currentUser, externalEvents]);

    const isMonthLocked = useMemo(() => {
        if (isAssignmentsEdit || isScheduleGenerate) return false; // Managers are never locked out
        return schedule?.sessions?.some(s => s.assignments?.length > 0);
    }, [schedule, isAssignmentsEdit, isScheduleGenerate]);

    // Derived Selection Availability State
    const { allSelectedUnavailable, noneSelectedUnavailable, mixedAvailability } = useMemo(() => {
        if (selectedDays.length === 0) return { allSelectedUnavailable: false, noneSelectedUnavailable: false, mixedAvailability: false };
        const allUnavailable = selectedDays.every(d => unavailableDays.includes(d));
        const noneUnavailable = selectedDays.every(d => !unavailableDays.includes(d));
        return {
            allSelectedUnavailable: allUnavailable,
            noneSelectedUnavailable: noneUnavailable,
            mixedAvailability: !allUnavailable && !noneUnavailable
        };
    }, [selectedDays, unavailableDays]);

    const handleSelectEvent = (event) => {
        if (isMonthLocked && !isAdmin) {
            // We still allow selection to view details, but we'll show a lock notice in the modal
        }
        setSelectedEvent(event);
        setIsEditingAssignments(false);
        setIsAvailable(!event.optedOut);
    };

    const handleToggleAvailability = () => {
        if (isMonthLocked) return;
        const newAvailability = !isAvailable;
        dispatch(updateAvailability({ sessionId: selectedEvent.id, isAvailable: newAvailability, token }))
            .unwrap()
            .then(() => {
                setIsAvailable(newAvailability);
                // Refetch availability to update UI state
                const year = currentDate.getFullYear();
                const month = currentDate.getMonth() + 1;
                if (isAssignmentsEdit || isScheduleGenerate || isScheduleRead) dispatch(fetchMonthAvailability({ year, month, token }));
                toast.success("Availability updated!");
            })
            .catch((err) => toast.error("Failed to update availability: " + err));
    };

    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    const handleSelectSlot = ({ slots, action }) => {
        if (isMonthLocked) return;
        // On touch devices, block multi-day drag-to-select but allow single-day taps
        const uniqueSlotDays = new Set(slots.map(d => d.toDateString())).size;
        if (isTouchDevice && action === 'select' && uniqueSlotDays > 1) return;
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
        if (isMonthLocked) return;
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
            if (isScheduleRead || isAssignmentsEdit || isScheduleGenerate || isTemplatesManage) dispatch(fetchMonthAvailability({ year, month, token }));
            toast.success(`${count} day(s) marked as ${isAvail ? 'available' : 'unavailable'}.`);
        })
        .catch((err) => toast.error("Failed to update availability: " + err));
    };

    const handleGenerateSchedule = (month, year) => {
        dispatch(generateSchedule({ year, month, token }))
            .unwrap()
            .then(() => {
                setIsGenerateModalOpen(false);
                setIsSummaryModalOpen(true);
                toast.success("Draft assignments created! Remember to 'Save Schedule' to finalize them.", { duration: 6000 });
            })
            .catch(err => toast.error("Generation failed: " + err));
    };

    const handleSaveSchedule = () => {
        // Filter out empty placeholders before saving
        const cleanedSchedule = {
            ...schedule,
            sessions: schedule.sessions.map(s => ({
                ...s,
                assignments: s.assignments.filter(a => a.member_id !== '')
            }))
        };
        dispatch(saveSchedule({ scheduleData: cleanedSchedule, token }))
            .unwrap()
            .then(() => {
                toast.success("Schedule saved successfully!");
                setIsSummaryModalOpen(false);
            })
            .catch(e => toast.error("Failed to save: " + e));
    };

    const handleUpdateRoleAssignments = (sessionId, role, newMemberIds) => {
        const newSessions = schedule.sessions.map(s => {
            if (s.id === sessionId) {
                // remove all existing for this role
                const newAssignments = s.assignments.filter(a => a.role !== role);
                
                // add the new ones
                newMemberIds.forEach(id => {
                    if (id) {
                        const memberObj = members.find(m => m.id === Number(id));
                        newAssignments.push({
                            role,
                            member_id: Number(id),
                            member_name: memberObj ? `${memberObj.first_name} ${memberObj.last_name}` : '',
                            member: memberObj
                        });
                    } else {
                        newAssignments.push({
                            role,
                            member_id: '',
                            member_name: '',
                            member: null
                        });
                    }
                });
                return { ...s, assignments: newAssignments };
            }
            return s;
        });
        dispatch(setLocalSchedule({ ...schedule, sessions: newSessions }));
    };

    const handleExportCSV = async () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        try {
            const response = await axios.get(`/calendar/schedule/export_csv?year=${year}&month=${month}`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `choir_schedule_${year}_${month}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            toast.error("Failed to export CSV: " + (err?.response?.data?.detail || err.message));
        }
    };

    const handleExportPDF = async () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        try {
            const response = await axios.get(`/calendar/schedule/export_pdf?year=${year}&month=${month}`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `choir_schedule_${year}_${month}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            toast.error("Failed to export PDF: " + (err?.response?.data?.detail || err.message));
        }
    };

    const handleSyncICS = async () => {
        try {
            // Fetch sync info (this generates a token if it doesn't exist)
            const res = await axios.post('/calendar/sync/token', {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const { sync_url } = res.data;
            // The backend returns a relative URL like "/calendar/sync/1.ics?key=..."
            window.open(`${API_URL}${sync_url}`, '_blank');
        } catch (err) {
            toast.error("Failed to sync calendar: " + (err?.response?.data?.detail || err.message));
        }
    };

    const handleConnectGoogle = async () => {
        try {
            // Pass this client's absolute URL so the backend knows where to redirect back to.
            // This allows any number of web deployments (prod, staging, etc.) to work correctly.
            const appRedirect = `${window.location.origin}/calendar`;
            const res = await axios.get('/auth/google/login', {
                headers: { Authorization: `Bearer ${token}` },
                params: { app_redirect: appRedirect }
            });
            window.location.href = res.data.auth_url;
        } catch (err) {
            toast.error("Failed to initiate Google Login: " + (err?.response?.data?.detail || err.message));
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            {isMonthLocked && (
                <div style={{ 
                    background: 'rgba(245, 158, 11, 0.1)', 
                    border: '1px solid rgba(245, 158, 11, 0.3)', 
                    color: '#fbbf24', 
                    padding: '0.75rem 1rem', 
                    borderRadius: '8px', 
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.95rem',
                    fontWeight: 500
                }}>
                    <span>📅</span>
                    The schedule for {moment(currentDate).format('MMMM YYYY')} has been finalized. Availability is now locked.
                </div>
            )}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <h1 className="font-bold text-white" style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', margin: 0 }}>Schedule & Calendar</h1>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <button
                        onClick={() => {
                            if (isMonthLocked) return;
                            setIsMultiSelectMode(!isMultiSelectMode);
                            setSelectedDays([]); // clear selection when toggling mode
                        }}
                        disabled={isMonthLocked}
                        style={{ flex: '1 1 auto', minWidth: '160px', textAlign: 'center' }}
                        className={`px-4 py-2 rounded-xl shadow-lg transition font-medium text-sm ${isMultiSelectMode ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'} ${isMonthLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isMultiSelectMode ? 'Cancel Multi-Select' : 'Select Multiple Days'}
                    </button>
                    {!googleConnected && (
                        <button
                            onClick={handleConnectGoogle}
                            style={{ flex: '1 1 auto', minWidth: '160px', textAlign: 'center' }}
                            className="bg-blue-600/20 text-blue-400 border border-blue-500/30 px-4 py-2 rounded-xl shadow-lg hover:bg-blue-600/30 transition font-medium text-sm flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/><path d="M1 1h22v22H1z" fill="none"/></svg>
                            Connect Google Calendar
                        </button>
                    )}
                    <button
                        onClick={handleSyncICS}
                        style={{ flex: '1 1 auto', minWidth: '100px', textAlign: 'center' }}
                        className="bg-purple-600 text-white px-4 py-2 rounded-xl shadow-lg shadow-purple-900/30 hover:bg-purple-700 transition font-medium text-sm"
                    >
                        Export .ics
                    </button>
                    {isScheduleGenerate && (
                        <button
                            onClick={() => {
                                setGenerateMonth(currentDate.getMonth() + 1);
                                setGenerateYear(currentDate.getFullYear());
                                setIsGenerateModalOpen(true);
                            }}
                            style={{ flex: '1 1 auto', minWidth: '120px', textAlign: 'center' }}
                            className="bg-blue-600 text-white px-4 py-2 rounded-xl shadow-lg shadow-blue-900/40 hover:bg-blue-700 transition font-medium text-sm"
                        >
                            Auto Generate Assignments
                        </button>
                    )}
                    {isTemplatesManage && (
                        <button
                            onClick={() => setIsRecurringModalOpen(true)}
                            style={{ flex: '1 1 auto', minWidth: '130px', textAlign: 'center' }}
                            className="bg-amber-600 text-white px-4 py-2 rounded-xl shadow-lg shadow-amber-900/40 hover:bg-amber-700 transition font-medium text-sm flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            Recurring
                        </button>
                    )}
                    {(isAssignmentsEdit || isScheduleGenerate) && schedule?.sessions?.length > 0 && (
                        <button
                            onClick={handleSaveSchedule}
                            style={{ flex: '1 1 auto', minWidth: '100px', textAlign: 'center' }}
                            className="bg-green-600 text-white px-4 py-2 rounded-xl shadow-lg shadow-emerald-900/40 hover:bg-green-700 transition font-medium text-sm"
                        >
                            Save Schedule
                        </button>
                    )}
                    {isScheduleExport && (
                        <>
                            <button
                                onClick={handleExportCSV}
                                style={{ flex: '1 1 auto', minWidth: '100px', textAlign: 'center' }}
                                className="bg-gray-800 text-white px-4 py-2 rounded-xl shadow-lg shadow-slate-900/40 hover:bg-gray-900 transition font-medium text-sm"
                            >
                                Export CSV
                            </button>
                            <button
                                onClick={handleExportPDF}
                                style={{ flex: '1 1 auto', minWidth: '80px', textAlign: 'center' }}
                                className="bg-red-700 text-white px-4 py-2 rounded-xl shadow-lg shadow-red-900/40 hover:bg-red-800 transition flex items-center justify-center gap-2 font-medium text-sm"
                            >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd"/><path d="M6 10a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H7z"/></svg>
                                PDF
                            </button>
                        </>
                    )}
                </div>
            </div>

            {status === 'loading' && <p className="text-blue-500 mb-4">Loading calendar data...</p>}
            {error && (
                <div className="text-red-500 mb-4 p-4 bg-red-900/20 border border-red-900/40 rounded-xl text-sm">
                    <strong>Error:</strong> {typeof error === 'string' ? error : (
                        Array.isArray(error) ? (
                            <ul className="list-disc ml-5 mt-1">
                                {error.map((err, i) => (
                                    <li key={i}>{`${err.loc?.join(' -> ') || ''}: ${err.msg || JSON.stringify(err)}`}</li>
                                ))}
                            </ul>
                        ) : JSON.stringify(error)
                    )}
                </div>
            )}

            <div className="glass-card calendar-container">
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
                    longPressThreshold={10}
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
                        if (event.isAssigned) {
                            return {
                                className: 'assigned-event',
                                style: {
                                    fontWeight: '500' // fontWeight isn't globally forced, so inline is fine
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
                                            width: '100%', padding: '0.5rem', borderRadius: '8px', fontWeight: 500,
                                            transition: 'all 0.2s',
                                            background: isAvailable ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                            color: isAvailable ? '#34d399' : '#f87171',
                                            border: isAvailable ? '2px solid rgba(16,185,129,0.4)' : '2px solid rgba(239,68,68,0.3)',
                                            opacity: isMonthLocked ? 0.6 : 1,
                                            cursor: isMonthLocked ? 'not-allowed' : 'pointer'
                                        }}
                                        disabled={isMonthLocked}
                                    >
                                        {isAvailable ? '✅ I am available' : '❌ I am unavailable'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (isMonthLocked) return;
                                            const dayStr = selectedEvent.start.toISOString().split('T')[0];
                                            setConfirmState({
                                                isOpen: true,
                                                title: 'Mark Day Unavailable',
                                                message: `Mark ALL sessions on ${dayStr} as unavailable?`,
                                                onConfirm: () => {
                                                    dispatch(updateDayAvailability({ date: dayStr, isAvailable: false, token }))
                                                        .unwrap()
                                                        .then(() => {
                                                            setSelectedEvent(null);
                                                            const year = currentDate.getFullYear();
                                                            const month = currentDate.getMonth() + 1;
                                                            dispatch(fetchSchedule({ year, month, token }));
                                                            if (isScheduleRead || isAssignmentsEdit || isTemplatesManage || isScheduleGenerate) dispatch(fetchMonthAvailability({ year, month, token }));
                                                            toast.success(`All sessions on ${dayStr} marked as unavailable.`);
                                                        })
                                                        .catch((err) => toast.error(err));
                                                },
                                                type: 'danger'
                                            });
                                        }}
                                        disabled={isMonthLocked}
                                        style={{
                                            width: '100%', marginTop: '0.5rem', padding: '0.5rem', borderRadius: '8px', fontWeight: 500,
                                            transition: 'all 0.2s',
                                            background: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: '2px solid rgba(245,158,11,0.3)',
                                            opacity: isMonthLocked ? 0.6 : 1,
                                            cursor: isMonthLocked ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        🚫 Mark whole day unavailable
                                    </button>
                                    {isMonthLocked && (
                                        <p style={{ fontSize: '0.75rem', color: '#fbbf24', marginTop: '0.5rem', textAlign: 'center', fontWeight: 500 }}>
                                            ⚠️ Availability is locked for finalized schedules.
                                        </p>
                                    )}
                                </div>

                                {isAssignmentsEdit ? (
                                    <div style={{ marginBottom: '1rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                            <h3 style={{ fontWeight: 600, color: '#f8fafc', fontSize: '1rem', margin: 0 }}>Role Assignments</h3>
                                            {!isEditingAssignments && (
                                                <button 
                                                    onClick={() => setIsEditingAssignments(true)}
                                                    style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.2)', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                                                >
                                                    Edit Assignments
                                                </button>
                                            )}
                                        </div>

                                        {isEditingAssignments ? (
                                            <>
                                                <div style={{ display: 'grid', gap: '1rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                    {choirRoles.map(role => {
                                                        const assignment = selectedEvent.assignments.find(a => a.role === role);
                                                        const currentMemberId = assignment?.member_id || '';
                                                        const sessionAvailability = availability?.sessions?.find(as => as.id === selectedEvent.id);
                                                        const isMemberUnavailable = currentMemberId && sessionAvailability?.availability?.find(av => av.id === currentMemberId)?.optedOut;

                                                        return (
                                                            <div key={role} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                                                <label style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>{role.replace('_', ' ')}</label>
                                                                <select
                                                                    value={currentMemberId}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        const newAssignments = selectedEvent.assignments.filter(a => a.role !== role);
                                                                        if (val) {
                                                                            const memberObj = members.find(m => m.id === Number(val));
                                                                            newAssignments.push({
                                                                                role,
                                                                                member_id: Number(val),
                                                                                member_name: `${memberObj.first_name} ${memberObj.last_name}`,
                                                                                member: memberObj
                                                                            });
                                                                        }
                                                                        setSelectedEvent({ ...selectedEvent, assignments: newAssignments });
                                                                    }}
                                                                    style={{ 
                                                                        background: isMemberUnavailable ? 'rgba(239, 68, 68, 0.15)' : 'rgba(30, 41, 59, 0.5)', 
                                                                        border: `1px solid ${isMemberUnavailable ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255,255,255,0.1)'}`,
                                                                        color: isMemberUnavailable ? '#fca5a5' : '#e2e8f0',
                                                                        padding: '0.5rem', borderRadius: '8px', fontSize: '0.85rem'
                                                                    }}
                                                                >
                                                                    <option value="">Unassigned</option>
                                                                    {members.map(m => {
                                                                        const isUnavailable = sessionAvailability?.availability?.find(av => av.id === m.id)?.optedOut;
                                                                        const isNotSundayLead = role === 'lead_singer' && selectedEvent.start.getDay() === 0 && !m.roles?.includes('Sunday Lead Singer');
                                                                        let labelExt = '';
                                                                        if (isNotSundayLead) labelExt = ' (Not Sunday Lead)';
                                                                        else if (isUnavailable) labelExt = ' (Unavailable)';

                                                                        return (
                                                                            <option key={m.id} value={m.id} disabled={isNotSundayLead} style={{ background: '#0f172a', color: isNotSundayLead ? '#64748b' : 'white' }}>
                                                                                {m.first_name} {m.last_name}{labelExt}
                                                                            </option>
                                                                        );
                                                                    })}
                                                                </select>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                                                    <button 
                                                        onClick={() => setIsEditingAssignments(false)}
                                                        style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: 'none', padding: '0.75rem', borderRadius: '10px', fontWeight: 600, cursor: 'pointer' }}
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            const sessionData = {
                                                                session_id: selectedEvent.id,
                                                                session_title: selectedEvent.title,
                                                                session_date: selectedEvent.start.toISOString().split('T')[0],
                                                                assignments: selectedEvent.assignments.map(a => ({
                                                                    member_id: a.member_id,
                                                                    member_name: a.member_name,
                                                                    role: a.role
                                                                }))
                                                            };
                                                            dispatch(saveSchedule({ scheduleData: { sessions: [sessionData] }, token }))
                                                                .unwrap()
                                                                .then(() => {
                                                                    toast.success("Assignments updated!");
                                                                    setIsEditingAssignments(false);
                                                                    const year = currentDate.getFullYear();
                                                                    const month = currentDate.getMonth() + 1;
                                                                    dispatch(fetchSchedule({ year, month, token }));
                                                                })
                                                                .catch(e => toast.error("Save failed: " + e));
                                                        }}
                                                        style={{ flex: 2, background: '#059669', color: 'white', border: 'none', padding: '0.75rem', borderRadius: '10px', fontWeight: 600, cursor: 'pointer' }}
                                                    >
                                                        Save Changes
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                                {selectedEvent.assignments.length > 0 ? (
                                                    selectedEvent.assignments.map((a, idx) => (
                                                        <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', padding: '0.35rem 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                                            <span style={{ color: '#94a3b8', textTransform: 'capitalize' }}>{a.role.replace('_', ' ')}:</span>
                                                            <span style={{ fontWeight: 500, color: '#f8fafc' }}>{a.member_name}</span>
                                                        </li>
                                                    ))
                                                ) : (
                                                    <p style={{ fontSize: '0.875rem', color: '#64748b', fontStyle: 'italic' }}>No roles assigned for this session yet.</p>
                                                )}
                                            </ul>
                                        )}
                                    </div>
                                ) : (
                                    <>
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
                            {(noneSelectedUnavailable || mixedAvailability) && (
                                <button
                                    onClick={() => handleMarkDay(false)}
                                    style={{
                                        width: '100%', padding: '0.875rem', borderRadius: '12px', fontWeight: 600, cursor: 'pointer',
                                        background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', transition: 'all 0.2s'
                                    }}
                                >
                                    🚫 Mark {selectedDays.length > 1 ? `${selectedDays.length} days` : 'as'} Unavailable
                                </button>
                            )}
                            {(allSelectedUnavailable || mixedAvailability) && (
                                <button
                                    onClick={() => handleMarkDay(true)}
                                    style={{
                                        width: '100%', padding: '0.875rem', borderRadius: '12px', fontWeight: 600, cursor: 'pointer',
                                        background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)', transition: 'all 0.2s'
                                    }}
                                >
                                    ✅ Mark {selectedDays.length > 1 ? `${selectedDays.length} days` : 'as'} Available
                                </button>
                            )}
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
                    {(noneSelectedUnavailable || mixedAvailability) && (
                        <button onClick={() => handleMarkDay(false)} className="bg-red-500/10 text-red-400 border border-red-500/20 px-5 py-2.5 rounded-xl font-bold hover:bg-red-500/20 transition shadow-sm active:scale-95">
                            🚫 Mark Unavailable
                        </button>
                    )}
                    {(allSelectedUnavailable || mixedAvailability) && (
                        <button onClick={() => handleMarkDay(true)} className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-5 py-2.5 rounded-xl font-bold hover:bg-emerald-500/20 transition shadow-sm active:scale-95">
                            ✅ Mark Available
                        </button>
                    )}
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

            {/* Generation Summary & Manual Editor Modal */}
            {isSummaryModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, backdropFilter: 'blur(12px)' }}>
                    <div className="glass-card" style={{ padding: '2rem', width: '95%', maxWidth: '1100px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-white">Draft Schedule Summary</h2>
                                <p className="text-slate-400">Review and fine-tune assignments for {moment().month(generateMonth - 1).format('MMMM')} {generateYear}.</p>
                            </div>
                            <button onClick={() => setIsSummaryModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
                            <div className="desktop-only-table">
                                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.5rem' }}>
                                <thead style={{ position: 'sticky', top: 0, background: '#0f172a', zIndex: 10 }}>
                                    <tr className="text-left text-slate-400 text-xs uppercase tracking-wider">
                                        <th className="px-4 py-2">Session</th>
                                        <th className="px-4 py-2">Lead Singer</th>
                                        <th className="px-4 py-2">Soprano</th>
                                        <th className="px-4 py-2">Alto</th>
                                        <th className="px-4 py-2">Tenor</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {schedule?.sessions?.map(session => {
                                        const roles = choirRoles;
                                        return (
                                            <tr key={session.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                                                <td className="px-4 py-3">
                                                    <div className="text-white font-semibold text-sm">{moment(session.start_time).format('ddd, MMM D')}</div>
                                                    <div className="text-slate-500 text-[10px] uppercase font-bold tracking-tighter">{session.type}</div>
                                                </td>
                                                {roles.map(role => {
                                                    const assignedMembers = session.assignments.filter(a => a.role === role);
                                                    const memberIds = assignedMembers.map(a => a.member_id);
                                                    
                                                    // Ensure at least one slot exists
                                                    if (memberIds.length === 0) {
                                                        memberIds.push('');
                                                    }
                                                    
                                                    const sessionAvailability = availability?.sessions?.find(as => as.id === session.id);

                                                    return (
                                                        <td key={role} className="px-2 py-3 align-top">
                                                            <div className="flex flex-col gap-2">
                                                                {memberIds.map((currentMemberId, idx) => {
                                                                    const isMemberUnavailable = currentMemberId && sessionAvailability?.availability?.find(av => av.id === currentMemberId)?.optedOut;

                                                                    return (
                                                                        <div key={`${role}-${idx}`} className="flex items-center gap-1 group">
                                                                            <select
                                                                                value={currentMemberId}
                                                                                onChange={(e) => {
                                                                                    const newIds = [...memberIds];
                                                                                    newIds[idx] = e.target.value;
                                                                                    handleUpdateRoleAssignments(session.id, role, newIds);
                                                                                }}
                                                                                className="transition-all duration-200"
                                                                                style={{ 
                                                                                    background: isMemberUnavailable ? 'rgba(239, 68, 68, 0.15)' : 'rgba(30, 41, 59, 0.5)', 
                                                                                    border: `1px solid ${isMemberUnavailable ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255,255,255,0.1)'}`,
                                                                                    color: isMemberUnavailable ? '#fca5a5' : '#e2e8f0',
                                                                                    width: '100%', 
                                                                                    padding: '0.4rem 0.5rem', 
                                                                                    borderRadius: '6px',
                                                                                    fontSize: '0.8rem',
                                                                                    fontWeight: isMemberUnavailable ? '600' : '400',
                                                                                    outline: 'none'
                                                                                }}
                                                                            >
                                                                                <option value="">Unassigned</option>
                                                                                {members.map(m => {
                                                                                    const isUnavailable = sessionAvailability?.availability?.find(av => av.id === m.id)?.optedOut;
                                                                                    const isNotSundayLead = role === 'lead_singer' && new Date(session.start_time).getDay() === 0 && !m.roles?.includes('Sunday Lead Singer');
                                                                                    let labelExt = '';
                                                                                    if (isNotSundayLead) labelExt = ' (Not Sunday Lead)';
                                                                                    else if (isUnavailable) labelExt = ' (Unavailable)';

                                                                                    return (
                                                                                        <option key={m.id} value={m.id} disabled={isNotSundayLead} style={{ background: '#0f172a', color: isNotSundayLead ? '#64748b' : 'white' }}>
                                                                                            {m.first_name} {m.last_name}{labelExt}
                                                                                        </option>
                                                                                    );
                                                                                })}
                                                                            </select>
                                                                            {/* Remove button for extra slots */}
                                                                            {memberIds.length > 1 && (
                                                                                <button 
                                                                                    className="text-slate-500 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                                    onClick={() => {
                                                                                        const newIds = [...memberIds];
                                                                                        newIds.splice(idx, 1);
                                                                                        handleUpdateRoleAssignments(session.id, role, newIds);
                                                                                    }}
                                                                                    title="Remove assignment"
                                                                                >
                                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                                <div className="flex justify-start pl-1">
                                                                    <button
                                                                        className="text-[10px] uppercase tracking-wider text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 transition-colors"
                                                                        onClick={() => {
                                                                            const newIds = [...memberIds, ''];
                                                                            handleUpdateRoleAssignments(session.id, role, newIds);
                                                                        }}
                                                                    >
                                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                                                                        Add
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            </div>
                            
                            {/* Mobile responsive view */}
                            <div className="mobile-card-list">
                                {schedule?.sessions?.map(session => {
                                    const sessionAvailability = availability?.sessions?.find(as => as.id === session.id);
                                    return (
                                        <div key={session.id} className="mobile-card">
                                            <div className="mb-4 pb-2 border-b border-white/10">
                                                <div className="text-white font-semibold">{moment(session.start_time).format('ddd, MMM D YYYY')}</div>
                                                <div className="text-slate-500 text-xs uppercase font-bold">{session.type}</div>
                                            </div>
                                            <div className="flex flex-col gap-4">
                                                {choirRoles.map(role => {
                                                    const assignedMembers = session.assignments.filter(a => a.role === role);
                                                    const memberIds = assignedMembers.map(a => a.member_id);
                                                    if (memberIds.length === 0) memberIds.push('');
                                                    
                                                    return (
                                                        <div key={role}>
                                                            <label className="block text-slate-400 text-xs uppercase font-bold tracking-wider mb-1">{role}</label>
                                                            <div className="flex flex-col gap-2">
                                                                {memberIds.map((currentMemberId, idx) => {
                                                                    const isMemberUnavailable = currentMemberId && sessionAvailability?.availability?.find(av => av.id === currentMemberId)?.optedOut;
                                                                    return (
                                                                        <div key={`${role}-${idx}`} className="flex items-center gap-1 group">
                                                                            <select
                                                                                value={currentMemberId}
                                                                                onChange={(e) => {
                                                                                    const newIds = [...memberIds];
                                                                                    newIds[idx] = e.target.value;
                                                                                    handleUpdateRoleAssignments(session.id, role, newIds);
                                                                                }}
                                                                                className="transition-all duration-200"
                                                                                style={{ 
                                                                                    background: isMemberUnavailable ? 'rgba(239, 68, 68, 0.15)' : 'rgba(30, 41, 59, 0.5)', 
                                                                                    border: `1px solid ${isMemberUnavailable ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255,255,255,0.1)'}`,
                                                                                    color: isMemberUnavailable ? '#fca5a5' : '#e2e8f0',
                                                                                    width: '100%', 
                                                                                    padding: '0.6rem 0.5rem', 
                                                                                    borderRadius: '6px',
                                                                                    fontSize: '0.85rem',
                                                                                    fontWeight: isMemberUnavailable ? '600' : '400',
                                                                                    outline: 'none',
                                                                                    marginBottom: 0
                                                                                }}
                                                                            >
                                                                                <option value="">Unassigned</option>
                                                                                {members.map(m => {
                                                                                    const isUnavailable = sessionAvailability?.availability?.find(av => av.id === m.id)?.optedOut;
                                                                                    const isNotSundayLead = role === 'lead_singer' && new Date(session.start_time).getDay() === 0 && !m.roles?.includes('Sunday Lead Singer');
                                                                                    let labelExt = '';
                                                                                    if (isNotSundayLead) labelExt = ' (Not Sunday Lead)';
                                                                                    else if (isUnavailable) labelExt = ' (Unavailable)';

                                                                                    return (
                                                                                        <option key={m.id} value={m.id} disabled={isNotSundayLead} style={{ background: '#0f172a', color: isNotSundayLead ? '#64748b' : 'white' }}>
                                                                                            {m.first_name} {m.last_name}{labelExt}
                                                                                        </option>
                                                                                    );
                                                                                })}
                                                                            </select>
                                                                            {memberIds.length > 1 && (
                                                                                <button 
                                                                                    className="text-slate-500 hover:text-red-400 p-2"
                                                                                    onClick={() => {
                                                                                        const newIds = [...memberIds];
                                                                                        newIds.splice(idx, 1);
                                                                                        handleUpdateRoleAssignments(session.id, role, newIds);
                                                                                    }}
                                                                                >
                                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    )
                                                                })}
                                                                <button
                                                                    className="text-xs uppercase tracking-wider text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 transition-colors w-fit"
                                                                    onClick={() => {
                                                                        const newIds = [...memberIds, ''];
                                                                        handleUpdateRoleAssignments(session.id, role, newIds);
                                                                    }}
                                                                >
                                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                                                                    Add {role}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="mt-8 flex gap-4 pt-6 border-t border-white/5">
                             <button 
                                 onClick={() => {
                                     setConfirmState({
                                         isOpen: true,
                                         title: 'Discard Changes',
                                         message: 'Discard all draft assignments? This will reset to the currently saved schedule.',
                                         onConfirm: () => {
                                             setIsSummaryModalOpen(false);
                                             const year = currentDate.getFullYear();
                                             const month = currentDate.getMonth() + 1;
                                             dispatch(fetchSchedule({ year, month, token }));
                                         },
                                         type: 'danger'
                                     });
                                 }}
                                 className="px-6 py-3 rounded-xl font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                             >
                                 Discard Draft
                             </button>
                            <div className="flex-1" />
                            <div className="flex items-center text-slate-500 text-xs gap-2 mr-4 bg-slate-800/40 px-3 py-2 rounded-lg">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                Draft Mode Active
                            </div>
                            <button 
                                onClick={handleSaveSchedule}
                                className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-900/20 active:scale-95"
                            >
                                Save & Publish Schedule
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Recurring Sessions Modal */}
            {isRecurringModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', width: '100%', maxWidth: '500px', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0, color: '#f8fafc' }}>Recurring Sessions</h2>
                                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>Automate your weekly rehearsals and services</p>
                            </div>
                            <button onClick={() => setIsRecurringModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}>&times;</button>
                        </div>

                        {/* Template List */}
                        <div style={{ marginBottom: '2rem' }}>
                            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Active Templates</h3>
                            {templates.length === 0 ? (
                                <p style={{ fontSize: '0.9rem', color: '#64748b', textAlign: 'center', py: '1rem' }}>No recurring templates defined yet.</p>
                            ) : (
                                <div style={{ display: 'grid', gap: '0.75rem' }}>
                                    {templates.map(t => (
                                        <div key={t.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.95rem' }}>{t.title}</div>
                                                    <span style={{ 
                                                        fontSize: '0.65rem', 
                                                        padding: '0.1rem 0.4rem', 
                                                        borderRadius: '6px', 
                                                        background: t.type === 'program' ? 'rgba(79, 70, 229, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                                                        color: t.type === 'program' ? '#818cf8' : '#fbbf24',
                                                        border: `1px solid ${t.type === 'program' ? 'rgba(79, 70, 229, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                                                    }}>
                                                        {t.type}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'capitalize' }}>
                                                    {t.frequency === 'daily' ? (
                                                        `Daily at ${t.start_time.substring(0, 5)}`
                                                    ) : (
                                                        `${t.frequency || 'Weekly'} on ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][t.day_of_week]} at ${t.start_time.substring(0, 5)}`
                                                    )}
                                                </div>
                                            </div>
                                            {deletingTemplateId === t.id ? (
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button 
                                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeletingTemplateId(null); }}
                                                        style={{ background: 'rgba(255,255,255,0.1)', color: '#f8fafc', border: 'none', padding: '0.3rem 0.6rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem' }}
                                                    >Cancel</button>
                                                    <button 
                                                        onClick={async (e) => {
                                                            e.preventDefault(); e.stopPropagation();
                                                            try {
                                                                await axios.delete(`${API_URL}/session-templates/${t.id}`, { headers: { Authorization: `Bearer ${token}` } });
                                                                setTemplates(prev => prev.filter(temp => temp.id !== t.id));
                                                                setDeletingTemplateId(null);
                                                                toast.success("Template deleted");
                                                            } catch (err) { toast.error("Failed to delete: " + err.message); }
                                                        }}
                                                        style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.3rem 0.6rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                                                    >Delete</button>
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeletingTemplateId(t.id); }}
                                                    style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: 'none', padding: '0.4rem', borderRadius: '8px', cursor: 'pointer' }}
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Add Template Form */}
                        <div style={{ background: 'rgba(99, 102, 241, 0.05)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.1)', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc', marginBottom: '1rem' }}>Create New Template</h3>
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', paddingLeft: '0.25rem' }}>Template Title</span>
                                        <input 
                                            placeholder="e.g. Sunday Service" 
                                            value={newTemplate.title} 
                                            onChange={e => setNewTemplate({...newTemplate, title: e.target.value})}
                                            style={{ width: '100%', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.6rem', borderRadius: '8px' }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', paddingLeft: '0.25rem' }}>Session Type</span>
                                        <select 
                                            value={newTemplate.type} 
                                            onChange={e => setNewTemplate({...newTemplate, type: e.target.value})}
                                            style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.6rem', borderRadius: '8px' }}
                                        >
                                            <option value="rehearsal">Rehearsal</option>
                                            <option value="program">Program</option>
                                        </select>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', paddingLeft: '0.25rem' }}>Frequency</span>
                                        <select 
                                            value={newTemplate.frequency} 
                                            onChange={e => setNewTemplate({...newTemplate, frequency: e.target.value})}
                                            style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.6rem', borderRadius: '8px' }}
                                        >
                                            <option value="daily">Daily</option>
                                            <option value="weekly">Weekly</option>
                                            <option value="bi-weekly">Bi-Weekly</option>
                                            <option value="monthly">Monthly</option>
                                        </select>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', paddingLeft: '0.25rem' }}>Reference Start Date</span>
                                        <input 
                                            type="date" 
                                            value={newTemplate.reference_start_date} 
                                            onChange={e => {
                                                const newDateStr = e.target.value;
                                                const dateObj = new Date(newDateStr + 'T00:00:00'); // Parse explicitly as local time to avoid timezone shifts
                                                let newDayOfWeek = newTemplate.day_of_week;
                                                if (!isNaN(dateObj.getTime())) {
                                                    const jsDay = dateObj.getDay(); // 0 is Sun, 6 is Sat
                                                    newDayOfWeek = jsDay === 0 ? 6 : jsDay - 1; // Backend: 0 is Mon, 6 is Sun
                                                }
                                                setNewTemplate({...newTemplate, reference_start_date: newDateStr, day_of_week: newDayOfWeek});
                                            }}
                                            style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.6rem', borderRadius: '8px', colorScheme: 'dark' }}
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', paddingLeft: '0.25rem' }}>Inferred Day of Week</span>
                                        <select 
                                            value={newTemplate.day_of_week} 
                                            disabled={true}
                                            style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.6rem', borderRadius: '8px', opacity: 0.5, cursor: 'not-allowed' }}
                                        >
                                            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((d, i) => (
                                                <option key={i} value={i}>{d}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', paddingLeft: '0.25rem' }}>Start Time</span>
                                        <input 
                                            type="time" 
                                            value={newTemplate.start_time.substring(0, 5)} 
                                            onChange={e => setNewTemplate({...newTemplate, start_time: e.target.value + ':00'})}
                                            style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.6rem', borderRadius: '8px', colorScheme: 'dark' }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', paddingLeft: '0.25rem' }}>End Time</span>
                                        <input 
                                            type="time" 
                                            value={(newTemplate.end_time || '20:00:00').substring(0, 5)} 
                                            onChange={e => setNewTemplate({...newTemplate, end_time: e.target.value + ':00'})}
                                            style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.6rem', borderRadius: '8px', colorScheme: 'dark' }}
                                        />
                                    </div>
                                </div>
                                <button 
                                    onClick={async () => {
                                        try {
                                            const res = await axios.post(`${API_URL}/session-templates/`, newTemplate, { headers: { Authorization: `Bearer ${token}` } });
                                            setTemplates([...templates, res.data]);
                                            const currentTodayStr = new Date().toISOString().split('T')[0];
                                            const currentJsDay = new Date(currentTodayStr + 'T00:00:00').getDay();
                                            const currentInitDayOfWeek = currentJsDay === 0 ? 6 : currentJsDay - 1;
                                            setNewTemplate({ title: '', type: 'rehearsal', frequency: 'weekly', reference_start_date: currentTodayStr, day_of_week: currentInitDayOfWeek, start_time: '18:00:00', end_time: '20:00:00' });
                                        } catch (e) { toast.error("Failed to add template"); }
                                    }}
                                    style={{ background: '#6366f1', color: 'white', border: 'none', padding: '0.75rem', borderRadius: '10px', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    Add Template
                                </button>
                            </div>
                        </div>

                        {/* Generation Action */}
                        <button 
                            disabled={templates.length === 0}
                            onClick={async () => {
                                try {
                                    const year = currentDate.getFullYear();
                                    const month = currentDate.getMonth() + 1;
                                    const lastDay = new Date(year, month, 0).getDate();
                                    const start_date = `${year}-${String(month).padStart(2, '0')}-01`;
                                    const end_date = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

                                    const res = await axios.post(`${API_URL}/session-templates/generate`, { start_date, end_date }, { headers: { Authorization: `Bearer ${token}` } });
                                    toast.success(`Generated ${res.data.length} sessions for ${currentDate.toLocaleString('default', { month: 'long' })}!`);
                                    dispatch(fetchSchedule({ year, month, token }));
                                    setIsRecurringModalOpen(false);
                                } catch (e) { toast.error("Generation failed: " + (e.response?.data?.detail || e.message)); }
                            }}
                            style={{ 
                                width: '100%', padding: '1rem', borderRadius: '12px', fontWeight: 700, cursor: 'pointer',
                                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                                color: 'white', border: 'none', boxShadow: '0 4px 15px rgba(16,185,129,0.3)',
                                opacity: templates.length === 0 ? 0.5 : 1
                            }}
                        >
                            Generate Sessions for {currentDate.toLocaleString('default', { month: 'long' })}
                        </button>
                    </div>
                </div>
            )}

            <ConfirmModal 
                isOpen={confirmState.isOpen}
                onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmState.onConfirm}
                title={confirmState.title}
                message={confirmState.message}
                type={confirmState.type}
            />
        </div>
    );
};

export default Calendar;
