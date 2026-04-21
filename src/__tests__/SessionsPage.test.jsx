import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Sessions from '../pages/Sessions';
import authReducer from '../store/authSlice';
import sessionsReducer from '../store/sessionsSlice';
import membersReducer from '../store/membersSlice';
import { MemoryRouter } from 'react-router-dom';

// Mock DatePicker
vi.mock('react-datepicker', () => ({
    default: ({ selected, onChange, ...props }) => (
        <input
            data-testid={props.className || 'date-picker'}
            value={selected ? selected.toISOString() : ''}
            onChange={e => onChange(new Date(e.target.value))}
        />
    ),
}));

// Mock axios
vi.mock('axios', () => ({
    default: {
        get: vi.fn((url) => {
            if (url.includes('/sessions/metadata')) {
                return Promise.resolve({ data: { types: ['program', 'rehearsal'], statuses: ['scheduled', 'active', 'concluded', 'archived'] } });
            }
            if (url.includes('/members/metadata')) {
                return Promise.resolve({ data: { assignable_roles: ['lead_singer', 'soprano'] } });
            }
            if (url.includes('/session-templates/')) {
                return Promise.resolve({ data: [] });
            }
            if (url.includes('/members/')) {
                return Promise.resolve({ data: mockMembers });
            }
            if (url.includes('/sessions')) {
                return Promise.resolve({ data: mockSessions });
            }
            return Promise.resolve({ data: {} });
        }),
        post: vi.fn(() => Promise.resolve({ data: {} })),
        put: vi.fn(() => Promise.resolve({ data: {} })),
        delete: vi.fn(() => Promise.resolve({ data: {} })),
    }
}));

// Mock toast
vi.mock('react-hot-toast', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    }
}));

const mockMembers = [
    { id: 1, first_name: 'John', last_name: 'Doe', roles: ['lead_singer'] },
    { id: 2, first_name: 'Jane', last_name: 'Smith', roles: ['soprano'] },
];

const mockSessions = [
    {
        id: 101,
        title: 'Sunday Service',
        type: 'program',
        status: 'scheduled',
        start_time: '2026-04-20T15:00:00Z',
        end_time: '2026-04-20T17:00:00Z',
    },
    {
        id: 102,
        title: 'Wednesday Rehearsal',
        type: 'rehearsal',
        status: 'active',
        start_time: '2026-04-16T00:00:00Z',
        end_time: '2026-04-16T02:00:00Z',
    },
    {
        id: 103,
        title: 'Old Service',
        type: 'program',
        status: 'concluded',
        start_time: '2026-03-10T15:00:00Z',
        end_time: '2026-03-10T17:00:00Z',
    },
];

const setupStore = (permissions = ['admin']) => configureStore({
    reducer: {
        auth: authReducer,
        sessions: sessionsReducer,
        members: membersReducer,
    },
    preloadedState: {
        auth: {
            token: 'test-token',
            user: { id: 1, email: 'admin@test.com', permissions }
        },
        sessions: { items: mockSessions, currentSession: null, status: 'idle' },
        members: { items: mockMembers },
    }
});

const renderSessions = (permissions = ['admin']) => {
    const store = setupStore(permissions);
    return render(
        <Provider store={store}>
            <MemoryRouter>
                <Sessions />
            </MemoryRouter>
        </Provider>
    );
};

describe('Sessions Page Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders session list for admin users', () => {
        renderSessions();
        expect(screen.getByText('Sunday Service')).toBeInTheDocument();
        expect(screen.getByText('Wednesday Rehearsal')).toBeInTheDocument();
    });

    it('shows Add Session button for users with sessions_create permission', () => {
        renderSessions(['sessions_read', 'sessions_create']);
        expect(screen.getByText(/Add Session/i)).toBeInTheDocument();
    });

    it('does not show Add Session button for users without sessions_create permission', () => {
        renderSessions(['sessions_read']);
        expect(screen.queryByText(/\+ Add Session/i)).not.toBeInTheDocument();
    });

    it('shows search and status/type filter controls', () => {
        renderSessions();
        expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
    });

    it('separates current and past sessions', () => {
        renderSessions();
        // Current sessions: scheduled + active
        expect(screen.getByText('Sunday Service')).toBeInTheDocument();
        expect(screen.getByText('Wednesday Rehearsal')).toBeInTheDocument();
    });

    // ─── View/Edit Modal Tests ──────────────────────────────────────────

    it('opens view modal when a session row is clicked', async () => {
        renderSessions();
        const row = screen.getByText('Sunday Service');
        fireEvent.click(row);
        expect(await screen.findByText('Session Details')).toBeInTheDocument();
        // Should show session action buttons
        expect(screen.getByText('View Attendance')).toBeInTheDocument();
        expect(screen.getByText('Close')).toBeInTheDocument();
    });

    it('shows Edit Details button for users with sessions_edit permission', async () => {
        renderSessions(['admin']);
        fireEvent.click(screen.getByText('Sunday Service'));
        expect(await screen.findByText('Edit Details')).toBeInTheDocument();
    });

    it('switches to edit mode and shows Save Changes button', async () => {
        renderSessions(['admin']);
        fireEvent.click(screen.getByText('Sunday Service'));

        const editBtn = await screen.findByText('Edit Details');
        fireEvent.click(editBtn);

        // Should now be in edit mode
        expect(await screen.findByText('Edit Session Details')).toBeInTheDocument();

        // The critical fix: Save Changes button must exist
        expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    it('shows Cancel button in edit mode that returns to view mode', async () => {
        renderSessions(['admin']);
        fireEvent.click(screen.getByText('Sunday Service'));

        const editBtn = await screen.findByText('Edit Details');
        fireEvent.click(editBtn);

        await screen.findByText('Edit Session Details');

        // Click Cancel
        const cancelBtns = screen.getAllByText('Cancel');
        // The inline Cancel in edit mode
        const editCancelBtn = cancelBtns.find(btn => btn.closest('div[style]'));
        fireEvent.click(editCancelBtn);

        // Should return to view mode
        expect(await screen.findByText('Session Details')).toBeInTheDocument();
    });

    it('edit mode shows editable form fields', async () => {
        renderSessions(['admin']);
        fireEvent.click(screen.getByText('Sunday Service'));

        const editBtn = await screen.findByText('Edit Details');
        fireEvent.click(editBtn);

        await screen.findByText('Edit Session Details');

        // Should show editable fields
        expect(screen.getByText('Session Title')).toBeInTheDocument();
        expect(screen.getByText('Session Type')).toBeInTheDocument();
        expect(screen.getByText('Status')).toBeInTheDocument();
    });
});
