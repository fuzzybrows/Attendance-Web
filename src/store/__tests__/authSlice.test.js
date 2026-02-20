import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import axios from 'axios';
import authReducer, { login, verifyOTP, logout, clearError } from '../authSlice';

vi.mock('axios');
vi.mock('../../utils/logger', () => ({
    default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

function createStore(preloadedState) {
    return configureStore({
        reducer: { auth: authReducer },
        preloadedState: preloadedState ? { auth: preloadedState } : undefined,
    });
}

const initialState = {
    user: null,
    token: null,
    loading: false,
    error: null,
    needsVerification: null,
};

describe('authSlice', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    describe('reducers', () => {
        it('should return the initial state', () => {
            const store = createStore(initialState);
            expect(store.getState().auth).toEqual(initialState);
        });

        it('logout should clear user, token, and localStorage', () => {
            const store = createStore({
                ...initialState,
                user: { id: 1, email: 'john@test.com' },
                token: 'abc123',
            });
            store.dispatch(logout());
            const state = store.getState().auth;
            expect(state.user).toBeNull();
            expect(state.token).toBeNull();
            expect(localStorage.getItem('user')).toBeNull();
            expect(localStorage.getItem('token')).toBeNull();
        });

        it('clearError should reset error to null', () => {
            const store = createStore({ ...initialState, error: 'Some error' });
            store.dispatch(clearError());
            expect(store.getState().auth.error).toBeNull();
        });
    });

    describe('login thunk', () => {
        it('should set user and token on successful login', async () => {
            const mockResponse = {
                data: {
                    access_token: 'token123',
                    token_type: 'bearer',
                    member: { id: 1, email: 'john@test.com', first_name: 'John' },
                },
            };
            axios.post.mockResolvedValue(mockResponse);

            const store = createStore(initialState);
            await store.dispatch(login({ login: 'john@test.com', password: 'pass' }));

            const state = store.getState().auth;
            expect(state.user).toEqual(mockResponse.data.member);
            expect(state.token).toBe('token123');
            expect(state.loading).toBe(false);
        });

        it('should set needsVerification for unverified users', async () => {
            axios.post.mockResolvedValue({
                data: { status: 'unverified', method: 'email' },
            });

            const store = createStore(initialState);
            await store.dispatch(login({ login: 'john@test.com', password: 'pass' }));

            const state = store.getState().auth;
            expect(state.needsVerification).toEqual({
                method: 'email',
                login: 'john@test.com',
            });
            expect(state.user).toBeNull();
        });

        it('should set error on login failure', async () => {
            axios.post.mockRejectedValue({
                response: { data: { detail: 'Invalid credentials' } },
            });

            const store = createStore(initialState);
            await store.dispatch(login({ login: 'john@test.com', password: 'wrong' }));

            const state = store.getState().auth;
            expect(state.error).toBe('Invalid credentials');
            expect(state.loading).toBe(false);
        });
    });

    describe('verifyOTP thunk', () => {
        it('should set user and token on successful OTP verification', async () => {
            const mockResponse = {
                data: {
                    access_token: 'token456',
                    member: { id: 1, email: 'john@test.com' },
                },
            };
            axios.post.mockResolvedValue(mockResponse);

            const store = createStore({
                ...initialState,
                needsVerification: { method: 'email', login: 'john@test.com' },
            });
            await store.dispatch(verifyOTP({ login: 'john@test.com', otp: '123456' }));

            const state = store.getState().auth;
            expect(state.user).toEqual(mockResponse.data.member);
            expect(state.token).toBe('token456');
            expect(state.needsVerification).toBeNull();
        });

        it('should set error on OTP verification failure', async () => {
            axios.post.mockRejectedValue({
                response: { data: { detail: 'Invalid code' } },
            });

            const store = createStore(initialState);
            await store.dispatch(verifyOTP({ login: 'john@test.com', otp: 'bad' }));

            expect(store.getState().auth.error).toBe('Invalid code');
        });
    });
});
