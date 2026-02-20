import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import axios from 'axios';
import membersReducer, { fetchMembers, addMember, updateMember } from '../membersSlice';

vi.mock('axios');
vi.mock('../../utils/logger', () => ({
    default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

function createStore(preloadedState) {
    return configureStore({
        reducer: { members: membersReducer },
        preloadedState: preloadedState ? { members: preloadedState } : undefined,
    });
}

const mockMembers = [
    { id: 1, first_name: 'John', last_name: 'Doe', email: 'john@test.com' },
    { id: 2, first_name: 'Jane', last_name: 'Doe', email: 'jane@test.com' },
];

describe('membersSlice', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should have correct initial state', () => {
        const store = createStore();
        expect(store.getState().members).toEqual({ items: [], status: 'idle' });
    });

    describe('fetchMembers', () => {
        it('should set items on fetch success', async () => {
            axios.get.mockResolvedValue({ data: mockMembers });
            const store = createStore();
            await store.dispatch(fetchMembers());
            expect(store.getState().members.items).toEqual(mockMembers);
        });
    });

    describe('addMember', () => {
        it('should append new member to items', async () => {
            const newMember = { id: 3, first_name: 'New', last_name: 'Member', email: 'new@test.com' };
            axios.post.mockResolvedValue({ data: newMember });

            const store = createStore({ items: mockMembers, status: 'idle' });
            await store.dispatch(addMember({ first_name: 'New', last_name: 'Member', email: 'new@test.com', password: 'pass' }));

            expect(store.getState().members.items).toHaveLength(3);
            expect(store.getState().members.items[2]).toEqual(newMember);
        });
    });

    describe('updateMember', () => {
        it('should update existing member in items', async () => {
            const updated = { id: 1, first_name: 'Johnny', last_name: 'Doe', email: 'john@test.com' };
            axios.put.mockResolvedValue({ data: updated });

            const store = createStore({ items: [...mockMembers], status: 'idle' });
            await store.dispatch(updateMember({ id: 1, updates: { first_name: 'Johnny' } }));

            expect(store.getState().members.items[0].first_name).toBe('Johnny');
        });

        it('should not fail if member not found in state', async () => {
            const updated = { id: 99, first_name: 'Ghost', last_name: 'User', email: 'ghost@test.com' };
            axios.put.mockResolvedValue({ data: updated });

            const store = createStore({ items: [...mockMembers], status: 'idle' });
            await store.dispatch(updateMember({ id: 99, updates: { first_name: 'Ghost' } }));

            // Should remain unchanged
            expect(store.getState().members.items).toHaveLength(2);
        });
    });
});
