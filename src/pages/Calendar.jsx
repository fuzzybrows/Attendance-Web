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
    saveSchedule,
    setLocalSchedule
} from '../store/calendarSlice';

const localizer = momentLocalizer(moment);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const Calendar = () => {
    const dispatch = useDispatch();
    const { availability, schedule, status, error } = useSelector((state) => state.calendar);
    const { token, user: member } = useSelector((state) => state.auth);

    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [isAvailable, setIsAvailable] = useState(true);

    const isAdmin = member?.permissions?.some(p => p.name === 'admin');

    // Fetch data when month changes
    useEffect(() => {
        if (token) {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1; // 1-indexed for backend
            if (isAdmin) {
                dispatch(fetchMonthAvailability({ year, month, token }));
            }
            dispatch(fetchSchedule({ year, month, token }));
        }
    }, [currentDate, token, dispatch, isAdmin]);

    // Map the fetched schedule/availability data to BigCalendar events
    const events = useMemo(() => {
        if (!schedule?.sessions && !availability?.sessions) return [];

        // We prioritize schedule data for titles/assignments.
        // If not admin, they only see availability toggles on their own events.
        const sourceData = schedule?.sessions?.length ? schedule.sessions : (availability?.sessions || []);

        return sourceData.map(session => {
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
                originalData: session
            }
        })
    }, [schedule, availability, member]);

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

    const handleGenerateSchedule = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        dispatch(generateSchedule({ year, month, token }));
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

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Schedule & Calendar</h1>
                <div className="flex gap-2">
                    <button
                        onClick={handleSyncICS}
                        className="bg-purple-600 text-white px-4 py-2 rounded shadow hover:bg-purple-700 transition"
                    >
                        Sync Apple/Google Calendar
                    </button>
                    {isAdmin && (
                        <>
                            <button
                                onClick={handleGenerateSchedule}
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

            <div className="bg-white p-4 rounded-xl shadow-lg mb-8" style={{ height: '70vh', minHeight: '600px' }}>
                <BigCalendar
                    localizer={localizer}
                    events={events}
                    date={currentDate}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: '100%' }}
                    onNavigate={(date) => setCurrentDate(date)}
                    onSelectEvent={handleSelectEvent}
                    views={['month', 'week', 'day']}
                />
            </div>

            {/* Event Details Modal */}
            {selectedEvent && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                        <div className="flex justify-between items-start mb-4">
                            <h2 className="text-xl font-bold">{selectedEvent.title}</h2>
                            <button onClick={() => setSelectedEvent(null)} className="text-gray-500 hover:text-gray-700">&times;</button>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">{selectedEvent.start.toLocaleString()}</p>

                        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                            <h3 className="font-semibold mb-2">My Availability</h3>
                            <button
                                onClick={handleToggleAvailability}
                                className={`w-full py-2 rounded font-medium transition ${isAvailable ? 'bg-green-100 text-green-800 border-2 border-green-500' : 'bg-red-100 text-red-800 border-2 border-transparent'}`}
                            >
                                {isAvailable ? '✅ I am available' : '❌ I am unavailable'}
                            </button>
                        </div>

                        {selectedEvent.assignments.length > 0 && (
                            <div className="mb-4">
                                <h3 className="font-semibold mb-2">Role Assignments</h3>
                                <ul className="space-y-2">
                                    {selectedEvent.assignments.map((a, idx) => (
                                        <li key={idx} className="flex justify-between text-sm py-1 border-b">
                                            <span className="text-gray-600 capitalize">{a.role.replace('_', ' ')}:</span>
                                            <span className="font-medium">{a.member_name}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {selectedEvent.assignments.length === 0 && (
                            <p className="text-sm text-gray-500 italic">No roles assigned for this session yet.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Calendar;
