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

// Mock BigCalendar to expose onSelectSlot for testing
vi.mock('react-big-calendar', () => ({
    Calendar: ({ onSelectSlot }) => (
        <div data-testid="mock-calendar">
            <button 
                data-testid="trigger-single-tap" 
                onClick={() => onSelectSlot({ slots: [new Date('2026-04-10')], action: 'click' })}
            >
                Single Tap
            </button>
            <button 
                data-testid="trigger-single-select" 
                onClick={() => onSelectSlot({ slots: [new Date('2026-04-10')], action: 'select' })}
            >
                Single Long Press
            </button>
            <button 
                data-testid="trigger-multi-drag" 
                onClick={() => onSelectSlot({ 
                    slots: [new Date('2026-04-10'), new Date('2026-04-11')], 
                    action: 'select' 
                })}
            >
                Multi Drag
            </button>
        </div>
    ),
    momentLocalizer: vi.fn(() => ({}))
}));

// Mock axios
vi.mock('axios', () => ({
    default: {
        get: vi.fn(() => Promise.resolve({ data: {} })),
        post: vi.fn(() => Promise.resolve({ data: {} })),
        put: vi.fn(() => Promise.resolve({ data: {} })),
        delete: vi.fn(() => Promise.resolve({ data: {} }))
    }
}));

const setupStore = (permissions = ['admin']) => {
    return configureStore({
        reducer: {
            calendar: calendarReducer,
            members: membersReducer,
            auth: authReducer
        },
        preloadedState: {
            auth: {
                token: 'test-token',
                user: { id: 1, email: 'test@example.com', permissions }
            },
            members: { items: [] },
            calendar: {
                schedule: { sessions: [] },
                availability: { sessions: [] },
                unavailableDays: [],
                externalEvents: [],
                status: 'idle'
            }
        }
    });
};

describe('Calendar Mobile Touch Interaction Tests', () => {
    const _originalMaxTouchPoints = navigator.maxTouchPoints;

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset touch points to desktop by default
        Object.defineProperty(navigator, 'maxTouchPoints', {
            configurable: true,
            value: 0
        });
    });

    const setTouchDevice = (isTouch) => {
        Object.defineProperty(navigator, 'maxTouchPoints', {
            configurable: true,
            value: isTouch ? 1 : 0
        });
        // Also mock ontouchstart presence
        if (isTouch) {
            window.ontouchstart = vi.fn();
        } else {
            delete window.ontouchstart;
        }
    };

    it('blocks multi-day drag selections on mobile', async () => {
        setTouchDevice(true);
        const store = setupStore();
        render(
            <Provider store={store}>
                <MemoryRouter>
                    <Calendar />
                </MemoryRouter>
            </Provider>
        );

        // Try to trigger a multi-day drag selection
        const multiDragBtn = screen.getByTestId('trigger-multi-drag');
        fireEvent.click(multiDragBtn);

        // Expect the Day Selection Modal NOT to appear
        const modalHeader = screen.queryByText(/Set your availability for/i);
        expect(modalHeader).not.toBeInTheDocument();
    });

    it('allows single-day taps on mobile (to open availability modal)', async () => {
        setTouchDevice(true);
        const store = setupStore();
        render(
            <Provider store={store}>
                <MemoryRouter>
                    <Calendar />
                </MemoryRouter>
            </Provider>
        );

        // Trigger a single-day tap selection
        const singleTapBtn = screen.getByTestId('trigger-single-tap');
        fireEvent.click(singleTapBtn);

        // Expect the Day Selection Modal TO appear
        const modalHeader = await screen.findByText(/Set your availability for/i);
        expect(modalHeader).toBeInTheDocument();
    });

    it('allows multi-day drag selections on desktop', async () => {
        setTouchDevice(false);
        const store = setupStore();
        render(
            <Provider store={store}>
                <MemoryRouter>
                    <Calendar />
                </MemoryRouter>
            </Provider>
        );

        // Trigger a multi-day drag selection
        const multiDragBtn = screen.getByTestId('trigger-multi-drag');
        fireEvent.click(multiDragBtn);

        // Expect the Day Selection Modal TO appear
        const modalHeader = await screen.findByText(/Set your availability for/i);
        expect(modalHeader).toBeInTheDocument();
    });

    it('allows single-day long-press (select action) on mobile — regression for dd90775', async () => {
        setTouchDevice(true);
        const store = setupStore();
        render(
            <Provider store={store}>
                <MemoryRouter>
                    <Calendar />
                </MemoryRouter>
            </Provider>
        );

        // Trigger a single-day select (long-press) — this was broken by dd90775
        const singleSelectBtn = screen.getByTestId('trigger-single-select');
        fireEvent.click(singleSelectBtn);

        // Expect the Day Selection Modal TO appear
        const modalHeader = await screen.findByText(/Set your availability for/i);
        expect(modalHeader).toBeInTheDocument();
    });

    it('allows single-day taps for member+schedule_read users', async () => {
        setTouchDevice(true);
        const store = setupStore(['member', 'schedule_read']);
        render(
            <Provider store={store}>
                <MemoryRouter>
                    <Calendar />
                </MemoryRouter>
            </Provider>
        );

        const singleTapBtn = screen.getByTestId('trigger-single-tap');
        fireEvent.click(singleTapBtn);

        const modalHeader = await screen.findByText(/Set your availability for/i);
        expect(modalHeader).toBeInTheDocument();
    });
});
