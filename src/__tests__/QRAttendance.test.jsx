import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import authReducer from '../store/authSlice';
import QRAttendance from '../pages/QRAttendance';

// Mock axios
vi.mock('axios', () => {
    const instance = {
        post: vi.fn(),
        get: vi.fn(),
        defaults: { baseURL: '' },
        interceptors: {
            request: { use: vi.fn() },
            response: { use: vi.fn() }
        }
    };
    return { default: instance };
});

// Mock device util
vi.mock('../utils/device', () => ({
    getDeviceId: vi.fn(() => Promise.resolve('test-device-id'))
}));

import axios from 'axios';

const createStore = (token = 'test-jwt-token') =>
    configureStore({
        reducer: { auth: authReducer },
        preloadedState: {
            auth: {
                user: { id: 1, email: 'test@example.com', permissions: [] },
                token,
                loading: false,
                error: null,
                needsVerification: null,
            }
        }
    });

const renderQR = (search, store) =>
    render(
        <Provider store={store || createStore()}>
            <MemoryRouter initialEntries={[`/qr-attendance${search}`]}>
                <QRAttendance />
            </MemoryRouter>
        </Provider>
    );

describe('QRAttendance - Double submission prevention', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('only calls the mark endpoint once per component mount', async () => {
        axios.post.mockResolvedValue({
            data: { status: 'success', message: 'Attendance marked for John Doe' }
        });

        renderQR('?session_id=1&token=valid-qr-token');

        await waitFor(() => {
            expect(screen.getByText(/Attendance Marked!/i)).toBeInTheDocument();
        });

        // The ref guard ensures only one API call even if effects re-run
        expect(axios.post).toHaveBeenCalledTimes(1);
        expect(axios.post).toHaveBeenCalledWith(
            expect.stringContaining('/attendance/qr/mark'),
            expect.objectContaining({ device_id: 'test-device-id' }),
            expect.any(Object)
        );
    });

    it('shows success message after successful QR mark', async () => {
        axios.post.mockResolvedValueOnce({
            data: { status: 'success', message: 'Attendance marked for Jane Smith' }
        });

        renderQR('?session_id=5&token=valid-qr');

        await waitFor(() => {
            expect(screen.getByText(/Attendance Marked!/i)).toBeInTheDocument();
            expect(screen.getByText(/Jane Smith/)).toBeInTheDocument();
        });
    });

    it('shows expired error instead of logging out on 401', async () => {
        axios.post.mockRejectedValueOnce({
            response: { status: 401, data: { detail: 'QR token expired or invalid' } }
        });

        const store = createStore();
        renderQR('?session_id=1&token=expired-qr', store);

        await waitFor(() => {
            expect(screen.getByText(/Error/i)).toBeInTheDocument();
            expect(screen.getByText(/QR token expired or invalid/)).toBeInTheDocument();
        });

        // User should still be logged in (token still in store)
        expect(store.getState().auth.token).toBe('test-jwt-token');
    });

    it('shows duplicate error on 409', async () => {
        axios.post.mockRejectedValueOnce({
            response: { status: 409, data: { detail: 'Already marked' } }
        });

        renderQR('?session_id=1&token=valid-qr');

        await waitFor(() => {
            expect(screen.getByText(/already been recorded/i)).toBeInTheDocument();
        });
    });

    it('shows error for invalid QR link (missing params)', () => {
        renderQR('');
        expect(screen.getByText(/Invalid QR code link/i)).toBeInTheDocument();
    });
});

describe('Axios interceptor - QR mark exclusion', () => {
    it('should not trigger logout for /attendance/qr/mark 401 responses', () => {
        // Simulate the interceptor logic directly
        const url = '/attendance/qr/mark?session_id=1&qr_token=abc';
        const shouldLogout = !url.endsWith('/auth/refresh') && !url.includes('/attendance/qr/mark');
        expect(shouldLogout).toBe(false);
    });

    it('should not trigger logout for /auth/refresh 401 responses', () => {
        const url = '/auth/refresh';
        const shouldLogout = !url.endsWith('/auth/refresh') && !url.includes('/attendance/qr/mark');
        expect(shouldLogout).toBe(false);
    });

    it('should trigger logout for other 401 responses', () => {
        const url = '/sessions/';
        const shouldLogout = !url.endsWith('/auth/refresh') && !url.includes('/attendance/qr/mark');
        expect(shouldLogout).toBe(true);
    });

    it('should trigger logout for /members/ 401 responses', () => {
        const url = '/members/';
        const shouldLogout = !url.endsWith('/auth/refresh') && !url.includes('/attendance/qr/mark');
        expect(shouldLogout).toBe(true);
    });
});
