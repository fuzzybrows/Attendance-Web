import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import AddSessionModal from '../components/AddSessionModal';
import authReducer from '../store/authSlice';
import sessionsReducer from '../store/sessionsSlice';

// Mock DatePicker (avoids portal/DOM complexity)
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
const mockGet = vi.fn();
vi.mock('axios', () => ({
    default: {
        get: (...args) => mockGet(...args),
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

const mockTemplates = [
    {
        id: 1,
        title: 'Sunday Service',
        type: 'program',
        day_of_week: 6,
        frequency: 'weekly',
        start_time: '10:00:00',
        end_time: '12:00:00',
        is_active: true,
    },
    {
        id: 2,
        title: 'Wednesday Rehearsal',
        type: 'rehearsal',
        day_of_week: 2,
        frequency: 'weekly',
        start_time: '19:00:00',
        end_time: '21:00:00',
        is_active: true,
    }
];

const setupStore = () => configureStore({
    reducer: {
        auth: authReducer,
        sessions: sessionsReducer,
    },
    preloadedState: {
        auth: {
            token: 'test-token',
            user: { id: 1, email: 'admin@test.com', permissions: ['admin'] }
        },
        sessions: { items: [], status: 'idle' },
    }
});

const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    availableTypes: ['program', 'rehearsal'],
    availableStatuses: ['scheduled', 'active', 'concluded', 'archived'],
};

const renderModal = (props = {}) => {
    const store = setupStore();
    return render(
        <Provider store={store}>
            <AddSessionModal {...defaultProps} {...props} />
        </Provider>
    );
};

describe('AddSessionModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGet.mockResolvedValue({ data: [] });
    });

    it('renders the modal with form fields when open', () => {
        renderModal();
        expect(screen.getByText('Add New Session')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('e.g. Sunday Service')).toBeInTheDocument();
        expect(screen.getByText('Session Type')).toBeInTheDocument();
        expect(screen.getByText('Status')).toBeInTheDocument();
        expect(screen.getByText('Add Session')).toBeInTheDocument();
        expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
        renderModal({ isOpen: false });
        expect(screen.queryByText('Add New Session')).not.toBeInTheDocument();
    });

    it('shows validation error when submitting without title', async () => {
        const { toast } = await import('react-hot-toast');
        renderModal();
        const addBtn = screen.getByText('Add Session');
        fireEvent.click(addBtn);
        expect(toast.error).toHaveBeenCalledWith('Session title is required');
    });

    it('calls onClose when Cancel is clicked', () => {
        const onClose = vi.fn();
        renderModal({ onClose });
        // The modal has two Cancel buttons (via Modal component footer and inline)
        const cancelBtns = screen.getAllByText('Cancel');
        fireEvent.click(cancelBtns[0]);
        expect(onClose).toHaveBeenCalled();
    });

    // ─── defaultDate Tests ──────────────────────────────────────────────

    it('uses defaultDate for initial start time date', () => {
        renderModal({ defaultDate: '2026-05-15' });
        const datePickers = screen.getAllByTestId('date-picker-input');
        // The start time picker should show a date on May 15
        const startValue = datePickers[0].value;
        expect(startValue).toContain('2026-05-15');
    });

    it('uses defaultDate for initial end time date', () => {
        renderModal({ defaultDate: '2026-05-15' });
        const datePickers = screen.getAllByTestId('date-picker-input');
        const endValue = datePickers[1].value;
        expect(endValue).toContain('2026-05-15');
    });

    it('defaults to 9AM start and 11AM end when defaultDate is provided', () => {
        renderModal({ defaultDate: '2026-06-20' });
        const datePickers = screen.getAllByTestId('date-picker-input');
        const startDate = new Date(datePickers[0].value);
        const endDate = new Date(datePickers[1].value);
        expect(startDate.getHours()).toBe(9);
        expect(startDate.getMinutes()).toBe(0);
        expect(endDate.getHours()).toBe(11);
        expect(endDate.getMinutes()).toBe(0);
    });

    // ─── Template Quick Fill Tests ──────────────────────────────────────

    it('shows template selector when templates are fetched', async () => {
        mockGet.mockResolvedValue({ data: mockTemplates });
        renderModal();
        expect(await screen.findByText(/Quick Fill from Template/i)).toBeInTheDocument();
        expect(screen.getByText(/Sunday Service/i)).toBeInTheDocument();
        expect(screen.getByText(/Wednesday Rehearsal/i)).toBeInTheDocument();
    });

    it('does not show template selector when no templates exist', async () => {
        mockGet.mockResolvedValue({ data: [] });
        renderModal();
        // Wait for any effects to settle
        await waitFor(() => {
            expect(screen.queryByText(/Quick Fill from Template/i)).not.toBeInTheDocument();
        });
    });

    it('fills form fields when a template is selected', async () => {
        const { toast } = await import('react-hot-toast');
        mockGet.mockResolvedValue({ data: mockTemplates });
        renderModal();

        // Wait for templates to load
        await screen.findByText(/Quick Fill from Template/i);
        const selects = screen.getAllByRole('combobox');
        const templateSelector = selects[0]; // First combobox is the template selector
        fireEvent.change(templateSelector, { target: { value: '1' } });

        // Title should be filled
        const titleInput = screen.getByPlaceholderText('e.g. Sunday Service');
        expect(titleInput.value).toBe('Sunday Service');

        // Toast should confirm
        expect(toast.success).toHaveBeenCalledWith('Loaded "Sunday Service" template');
    });

    it('preserves defaultDate when a template is selected', async () => {
        mockGet.mockResolvedValue({ data: mockTemplates });
        renderModal({ defaultDate: '2026-07-04' });

        await screen.findByText(/Quick Fill from Template/i);
        const selects = screen.getAllByRole('combobox');
        fireEvent.change(selects[0], { target: { value: '1' } });

        // The date pickers should still show July 4th, but with the template's times
        const datePickers = screen.getAllByTestId('date-picker-input');
        const startDate = new Date(datePickers[0].value);
        expect(startDate.getFullYear()).toBe(2026);
        expect(startDate.getMonth()).toBe(6); // July is 6 (0-indexed)
        expect(startDate.getDate()).toBe(4);
        expect(startDate.getHours()).toBe(10); // Template start time
    });

    it('fills type from template', async () => {
        mockGet.mockResolvedValue({ data: mockTemplates });
        renderModal();

        await screen.findByText(/Quick Fill from Template/i);
        const selects = screen.getAllByRole('combobox');
        // selects[0] = template, selects[1] = type, selects[2] = status
        fireEvent.change(selects[0], { target: { value: '2' } });

        // Type dropdown should now be 'rehearsal'
        expect(selects[1].value).toBe('rehearsal');
    });

    it('fetches templates when modal opens', () => {
        renderModal();
        expect(mockGet).toHaveBeenCalledWith(
            expect.stringContaining('/session-templates/'),
            expect.objectContaining({
                headers: { Authorization: 'Bearer test-token' }
            })
        );
    });

    it('handles template fetch failure gracefully', async () => {
        mockGet.mockRejectedValue(new Error('Network error'));
        renderModal();
        // Modal should still render even if templates fail
        await waitFor(() => {
            expect(screen.getByText('Add New Session')).toBeInTheDocument();
        });
        // Template selector should not appear
        expect(screen.queryByText(/Quick Fill from Template/i)).not.toBeInTheDocument();
    });
});
