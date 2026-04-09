import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Calendar from '../pages/Calendar';
import calendarReducer from '../store/calendarSlice';
import membersReducer from '../store/membersSlice';
import authReducer from '../store/authSlice';
import { MemoryRouter } from 'react-router-dom';


// Mock BigCalendar since it relies on browser-only dimensions and complex layouts
vi.mock('react-big-calendar', () => ({
    Calendar: ({ events, onSelectEvent }) => (
        <div data-testid="mock-calendar">
            {events.map(event => (
                <div 
                    key={event.id || event.session_id} 
                    data-testid={`event-${event.id || event.session_id}`}
                    onClick={() => onSelectEvent(event)}
                >
                    {event.title}
                </div>
            ))}
        </div>
    ),
    momentLocalizer: vi.fn(() => ({}))
}));

const mockMembers = [
    { id: 1, first_name: 'John', last_name: 'Doe', roles: ['lead_singer', 'Sunday Lead Singer'] },
    { id: 2, first_name: 'Jane', last_name: 'Smith', roles: ['lead_singer'] }
];

const mockSchedule = {
    sessions: [
        {
            id: 101,
            session_id: 101,
            title: 'Sunday Service',
            session_title: 'Sunday Service',
            start_time: '2026-04-12T10:00:00', // A Sunday
            type: 'program',
            assignments: [
                { member_id: 1, member_name: 'John Doe', role: 'lead_singer' }
            ]
        }
    ]
};

// Mock axios
vi.mock('axios', () => ({
    default: {
        get: vi.fn((url) => {
            if (url.includes('/calendar/schedule/')) {
                return Promise.resolve({ data: mockSchedule });
            }
            if (url.includes('/members/metadata')) {
                return Promise.resolve({ data: { assignable_roles: ['lead_singer', 'soprano', 'alto', 'tenor', 'Sunday Lead Singer'] } });
            }
            if (url.includes('/session-templates/')) {
                return Promise.resolve({ data: [] });
            }
            if (url.includes('/members/')) {
                return Promise.resolve({ data: mockMembers });
            }
            return Promise.resolve({ data: {} });
        }),
        post: vi.fn((url) => {
            if (url.includes('/calendar/schedule/generate')) {
                return Promise.resolve({ data: mockSchedule });
            }
            return Promise.resolve({ data: {} });
        }),
        put: vi.fn(() => Promise.resolve({ data: {} })),
        delete: vi.fn(() => Promise.resolve({ data: {} }))
    }
}));

const setupStore = (isAdmin = false) => {
    return configureStore({
        reducer: {
            calendar: calendarReducer,
            members: membersReducer,
            auth: authReducer
        },
        preloadedState: {
            auth: {
                token: 'test-token',
                user: { id: 1, email: 'test@example.com', permissions: isAdmin ? ['admin'] : [] }
            },
            members: { items: mockMembers },
            calendar: {
                schedule: mockSchedule,
                availability: { sessions: [] },
                externalEvents: [],
                status: 'idle'
            }
        }
    });
};

describe('Calendar Page Integration Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('renders the calendar and action buttons for admins', async () => {
        const isAdmin = true;
        localStorage.setItem('token', 'test-token');
        localStorage.setItem('user', JSON.stringify({ id: 1, email: 'test@example.com', permissions: ['admin'] }));
        
        const store = setupStore(isAdmin);
        render(
            <Provider store={store}>
                <MemoryRouter>
                    <Calendar />
                </MemoryRouter>
            </Provider>
        );

        expect(await screen.findByText(/Auto Generate Assignments/i)).toBeInTheDocument();
        expect(screen.getByText(/Export CSV/i)).toBeInTheDocument();
        expect(screen.getByTestId('mock-calendar')).toBeInTheDocument();
    });

    it('filters Sunday Lead Singer role in assignment dropdown on Sundays', async () => {
        localStorage.setItem('token', 'test-token');
        localStorage.setItem('user', JSON.stringify({ id: 1, email: 'admin@test.com', permissions: ['admin'] }));

        const store = setupStore(true);
        render(
            <Provider store={store}>
                <MemoryRouter>
                    <Calendar />
                </MemoryRouter>
            </Provider>
        );

        // 1. Open the Generate Modal
        const generateBtn = await screen.findByText(/Auto Generate Assignments/i);
        fireEvent.click(generateBtn);

        // 2. Click "Generate" to trigger handleGenerateSchedule
        const modalGenerateBtn = await screen.findByText(/^Generate$/);
        fireEvent.click(modalGenerateBtn);

        // 3. The "Draft Schedule Summary" modal should now be open
        expect(await screen.findByText(/Draft Schedule Summary/i)).toBeInTheDocument();

        // 4. Check the Lead Singer dropdown for the Sunday session (id 101)
        const selects = screen.getAllByRole('combobox');
        const leadSingerSelect = selects[0];
        
        // 5. Verify options
        const options = Array.from(leadSingerSelect.options);
        
        // John Doe (id 1) has 'Sunday Lead Singer' role -> enabled
        const johnOption = options.find(o => o.value === '1');
        expect(johnOption.disabled).toBe(false);

        // Jane Smith (id 2) DOES NOT have it -> disabled
        const janeOption = options.find(o => o.value === '2');
        expect(janeOption.disabled).toBe(true);
        expect(janeOption.text).toContain('(Not Sunday Lead)');
    });
});
