import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

export const fetchStats = createAsyncThunk('stats/fetchStats', async () => {
    const response = await axios.get(`/attendance/stats`);
    return response.data;
});

export const fetchMemberStats = createAsyncThunk('stats/fetchMemberStats', async (memberId) => {
    const response = await axios.get(`/statistics/member/${memberId}`);
    return response.data;
});

const statsSlice = createSlice({
    name: 'stats',
    initialState: {
        overall: [],
        memberDetail: null,
        status: 'idle'
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchStats.fulfilled, (state, action) => {
                state.overall = action.payload;
            })
            .addCase(fetchMemberStats.fulfilled, (state, action) => {
                state.memberDetail = action.payload;
            });
    },
});

export default statsSlice.reducer;
