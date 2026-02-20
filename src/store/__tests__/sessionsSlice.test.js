import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import axios from 'axios';
import sessionsReducer, {
    fetchSessions, addSession, deleteSession,
    bulkDeleteSessions, updateSessionStatus, setCurrentSession,
} from '../sessionsSlice';

vi.mock('axios');
vi.mock('../../utils/logger', () => ({
    default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

function createStore(preloadedState) {
    return configureStore({
        reducer: { sessions: sessionsReducer },
        preloadedState: preloadedState ? { sessions: preloadedState } : undefined,
    });
}

const mockSessions = [
    { id: 1, title: 'Sunday Service', type: 'program', status: 'active' },
    { id: 2, title: 'Rehearsal', type: 'rehearsal', status: 'active' },
    { id: 3, title: 'Old Session', type: 'program', status: 'concluded' },
];

describe('sessionsSlice', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should have correct initial state', () => {
        const store = createStore();
        expect(store.getState().sessions).toEqual({
            items: [], status: 'idle', currentSession: null,
        });
    });

    describe('reducers', () => {
        it('setCurrentSession should set the current session', () => {
            const store = createStore();
            store.dispatch(setCurrentSession(mockSessions[0]));
            expect(store.getState().sessions.currentSession).toEqual(mockSessions[0]);
        });
    });

    describe('fetchSessions', () => {
        it('should set items on fetch success', async () => {
            axios.get.mockResolvedValue({ data: mockSessions });
            const store = createStore();
            await store.dispatch(fetchSessions());
            expect(store.getState().sessions.items).toEqual(mockSessions);
        });
    });

    describe('addSession', () => {
        it('should prepend new session to items', async () => {
            const newSession = { id: 4, title: 'New Event', type: 'program', status: 'active' };
            axios.post.mockResolvedValue({ data: newSession });

            const store = createStore({ items: [...mockSessions], status: 'idle', currentSession: null });
            await store.dispatch(addSession({ title: 'New Event', type: 'program', start_time: '2026-02-15T10:00:00' }));

            const items = store.getState().sessions.items;
            expect(items[0]).toEqual(newSession);
            expect(items).toHaveLength(4);
        });
    });

    describe('deleteSession', () => {
        it('should remove session from items', async () => {
            axios.delete.mockResolvedValue({});
            const store = createStore({ items: [...mockSessions], status: 'idle', currentSession: null });
            await store.dispatch(deleteSession(2));

            const items = store.getState().sessions.items;
            expect(items).toHaveLength(2);
            expect(items.find(s => s.id === 2)).toBeUndefined();
        });

        it('should clear currentSession if it was deleted', async () => {
            axios.delete.mockResolvedValue({});
            const store = createStore({
                items: [...mockSessions],
                status: 'idle',
                currentSession: mockSessions[1],
            });
            await store.dispatch(deleteSession(2));

            expect(store.getState().sessions.currentSession).toBeNull();
        });
    });

    describe('bulkDeleteSessions', () => {
        it('should remove multiple sessions', async () => {
            axios.post.mockResolvedValue({});
            const store = createStore({ items: [...mockSessions], status: 'idle', currentSession: null });
            await store.dispatch(bulkDeleteSessions([1, 3]));

            const items = store.getState().sessions.items;
            expect(items).toHaveLength(1);
            expect(items[0].id).toBe(2);
        });
    });

    describe('updateSessionStatus', () => {
        it('should update session status in items', async () => {
            const updated = { ...mockSessions[0], status: 'concluded' };
            axios.patch.mockResolvedValue({ data: updated });

            const store = createStore({ items: [...mockSessions], status: 'idle', currentSession: null });
            await store.dispatch(updateSessionStatus({ id: 1, status: 'concluded' }));

            expect(store.getState().sessions.items[0].status).toBe('concluded');
        });

        it('should update currentSession if it matches', async () => {
            const updated = { ...mockSessions[0], status: 'concluded' };
            axios.patch.mockResolvedValue({ data: updated });

            const store = createStore({
                items: [...mockSessions],
                status: 'idle',
                currentSession: mockSessions[0],
            });
            await store.dispatch(updateSessionStatus({ id: 1, status: 'concluded' }));

            expect(store.getState().sessions.currentSession.status).toBe('concluded');
        });
    });
});
