import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import logger from '../utils/logger';


export const fetchAttendance = createAsyncThunk('attendance/fetchAttendance', async (sessionId) => {
    const response = await axios.get(`/attendance/session/${sessionId}`);
    return response.data;
});

export const fetchMemberHistory = createAsyncThunk('attendance/fetchMemberHistory', async (memberId) => {
    const response = await axios.get(`/attendance/member/${memberId}`);
    return response.data;
});

import { getDeviceId } from '../utils/device';

export const submitAttendance = createAsyncThunk('attendance/submitAttendance', async (data) => {
    logger.info('Submitting attendance', { type: 'attendance_submit_attempt', member_id: data.member_id, session_id: data.session_id });
    const deviceId = await getDeviceId();
    const payload = { ...data, device_id: deviceId };
    const response = await axios.post(`/attendance/`, payload);
    logger.info('Attendance submitted', { type: 'attendance_submit_success', attendance_id: response.data.id });
    return response.data;
});

export const deleteAttendance = createAsyncThunk('attendance/deleteAttendance', async (attendanceId) => {
    await axios.delete(`/attendance/${attendanceId}`);
    return attendanceId;
});

export const bulkDeleteAttendance = createAsyncThunk('attendance/bulkDeleteAttendance', async (ids) => {
    logger.warn('Bulk deleting attendance', { type: 'attendance_bulk_delete_attempt', count: ids.length });
    await axios.post(`/attendance/bulk-delete`, { ids });
    logger.info('Attendance bulk deleted', { type: 'attendance_bulk_delete_success' });
    return ids;
});

const attendanceSlice = createSlice({
    name: 'attendance',
    initialState: { items: [], memberHistory: [], status: 'idle' },
    extraReducers: (builder) => {
        builder
            .addCase(fetchAttendance.fulfilled, (state, action) => {
                state.items = action.payload;
            })
            .addCase(submitAttendance.fulfilled, (state, action) => {
                state.items.push(action.payload);
            })
            .addCase(deleteAttendance.fulfilled, (state, action) => {
                state.items = state.items.filter(a => a.id !== action.payload);
            })
            .addCase(bulkDeleteAttendance.fulfilled, (state, action) => {
                const deletedIds = new Set(action.payload);
                state.items = state.items.filter(a => !deletedIds.has(a.id));
            })
            .addCase(fetchMemberHistory.fulfilled, (state, action) => {
                state.memberHistory = action.payload;
            });
    },
});

export default attendanceSlice.reducer;
