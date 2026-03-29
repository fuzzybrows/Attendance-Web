import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Config helper
const authConfig = (token) => ({
    headers: {
        Authorization: `Bearer ${token}`,
    },
});

export const fetchMonthAvailability = createAsyncThunk(
    'calendar/fetchMonthAvailability',
    async ({ year, month, token }, { rejectWithValue }) => {
        try {
            const response = await axios.get(`${API_URL}/calendar/availability/${year}/${month}`, authConfig(token));
            return response.data; // { sessions: [...] }
        } catch (err) {
            return rejectWithValue(err.response?.data?.detail || 'Failed to fetch availability');
        }
    }
);

export const updateAvailability = createAsyncThunk(
    'calendar/updateAvailability',
    async ({ sessionId, isAvailable, token }, { rejectWithValue }) => {
        try {
            const response = await axios.put(
                `${API_URL}/calendar/availability?session_id=${sessionId}`,
                { member_id: 0, session_id: sessionId, is_available: isAvailable }, // backend ignores member_id and uses current_user
                authConfig(token)
            );
            return response.data;
        } catch (err) {
            return rejectWithValue(err.response?.data?.detail || 'Failed to update availability');
        }
    }
);

export const updateDayAvailability = createAsyncThunk(
    'calendar/updateDayAvailability',
    async ({ date, isAvailable, token }, { rejectWithValue }) => {
        try {
            const response = await axios.post(
                `${API_URL}/calendar/availability/day`,
                { date, is_available: isAvailable },
                authConfig(token)
            );
            return response.data;
        } catch (err) {
            return rejectWithValue(err.response?.data?.detail || 'Failed to update day availability');
        }
    }
);

export const fetchSchedule = createAsyncThunk(
    'calendar/fetchSchedule',
    async ({ year, month, token }, { rejectWithValue }) => {
        try {
            const response = await axios.get(`${API_URL}/calendar/schedule/${year}/${month}`, authConfig(token));
            return response.data; // { sessions: [...] }
        } catch (err) {
            return rejectWithValue(err.response?.data?.detail || 'Failed to fetch schedule');
        }
    }
);

export const fetchUnavailableDays = createAsyncThunk(
    'calendar/fetchUnavailableDays',
    async ({ year, month, token }, { rejectWithValue }) => {
        try {
            const response = await axios.get(`${API_URL}/calendar/availability/days/${year}/${month}`, authConfig(token));
            return response.data; // { unavailable_days: [...] }
        } catch (err) {
            return rejectWithValue(err.response?.data?.detail || 'Failed to fetch unavailable days');
        }
    }
);

export const generateSchedule = createAsyncThunk(
    'calendar/generateSchedule',
    async ({ year, month, token }, { rejectWithValue }) => {
        try {
            const response = await axios.post(`${API_URL}/calendar/schedule/generate`, { year, month }, authConfig(token));
            return response.data; // DraftScheduleResponse
        } catch (err) {
            return rejectWithValue(err.response?.data?.detail || 'Failed to generate schedule');
        }
    }
);

export const saveSchedule = createAsyncThunk(
    'calendar/saveSchedule',
    async ({ scheduleData, token }, { rejectWithValue }) => {
        try {
            const response = await axios.post(`${API_URL}/calendar/schedule/save`, scheduleData, authConfig(token));
            return response.data;
        } catch (err) {
            return rejectWithValue(err.response?.data?.detail || 'Failed to save schedule');
        }
    }
);

const initialState = {
    availability: null, // { sessions: [] }
    schedule: null, // { sessions: [] }
    unavailableDays: [], // ['YYYY-MM-DD']
    status: 'idle',
    error: null,
};

const calendarSlice = createSlice({
    name: 'calendar',
    initialState,
    reducers: {
        clearCalendarError: (state) => {
            state.error = null;
        },
        setLocalSchedule: (state, action) => {
            // Allows frontend modification of the draft schedule before saving
            state.schedule = action.payload;
        }
    },
    extraReducers: (builder) => {
        // Fetch Month Availability
        builder.addCase(fetchMonthAvailability.pending, (state) => {
            state.status = 'loading';
            state.error = null;
        });
        builder.addCase(fetchMonthAvailability.fulfilled, (state, action) => {
            state.status = 'succeeded';
            state.availability = action.payload;
        });
        builder.addCase(fetchMonthAvailability.rejected, (state, action) => {
            state.status = 'failed';
            state.error = action.payload;
        });

        // Fetch Schedule
        builder.addCase(fetchSchedule.pending, (state) => {
            state.status = 'loading';
            state.error = null;
        });
        builder.addCase(fetchSchedule.fulfilled, (state, action) => {
            state.status = 'succeeded';
            // Only set if not empty, otherwise might override a working draft in progress with empty
            state.schedule = action.payload;
        });
        builder.addCase(fetchSchedule.rejected, (state, action) => {
            state.status = 'failed';
            state.error = action.payload;
        });

        // Fetch Unavailable Days
        builder.addCase(fetchUnavailableDays.fulfilled, (state, action) => {
            state.unavailableDays = action.payload.unavailable_days || [];
        });

        // Update Day Availability
        builder.addCase(updateDayAvailability.fulfilled, (state, action) => {
            const dateStr = action.payload.date;
            const isAvail = action.payload.is_available;
            if (isAvail) {
                state.unavailableDays = state.unavailableDays.filter(d => d !== dateStr);
            } else {
                if (!state.unavailableDays.includes(dateStr)) {
                    state.unavailableDays.push(dateStr);
                }
            }
        });

        // Generate Schedule (Draft)
        builder.addCase(generateSchedule.pending, (state) => {
            state.status = 'loading';
            state.error = null;
        });
        builder.addCase(generateSchedule.fulfilled, (state, action) => {
            state.status = 'succeeded';
            state.schedule = action.payload;
        });
        builder.addCase(generateSchedule.rejected, (state, action) => {
            state.status = 'failed';
            state.error = action.payload;
        });

        // Save Schedule
        builder.addCase(saveSchedule.pending, (state) => {
            state.status = 'loading';
            state.error = null;
        });
        builder.addCase(saveSchedule.fulfilled, (state) => {
            state.status = 'succeeded';
        });
        builder.addCase(saveSchedule.rejected, (state, action) => {
            state.status = 'failed';
            state.error = action.payload;
        });

        // Update Availability
        builder.addCase(updateAvailability.fulfilled, (state) => {
            state.status = 'succeeded';
            // We might want to re-fetch availability here, but the component handles doing it
        });
        builder.addCase(updateAvailability.rejected, (state, action) => {
            state.error = action.payload;
        })
    },
});

export const { clearCalendarError, setLocalSchedule } = calendarSlice.actions;
export default calendarSlice.reducer;
