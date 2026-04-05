import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import MembersManagement from '../pages/MembersManagement';
import membersReducer from '../store/membersSlice';
import authReducer from '../store/authSlice';
import { MemoryRouter } from 'react-router-dom';

const mockMembers = [
    { id: 1, first_name: 'Active', last_name: 'Member', email: 'active@test.com', is_active: true, roles: [], permissions: ['member'], nfc_verified: true },
    { id: 2, first_name: 'Inactive', last_name: 'Member', email: 'inactive@test.com', is_active: false, roles: [], permissions: ['member'], nfc_verified: false }
];

// Mock axios
vi.mock('axios', () => ({
    default: {
        get: vi.fn((url) => {
            if (url.includes('/members/metadata')) {
                return Promise.resolve({ data: { choir_roles: ['lead_singer', 'soprano', 'alto', 'tenor', 'Sunday Lead Singer'] } });
            }
            if (url.includes('/members/')) {
                return Promise.resolve({ data: mockMembers });
            }
            return Promise.resolve({ data: [] });
        }),
        post: vi.fn(() => Promise.resolve({ data: {} })),
        put: vi.fn(() => Promise.resolve({ data: {} })),
        delete: vi.fn(() => Promise.resolve({ data: {} }))
    }
}));

const setupStore = (isAdmin = true) => {
    return configureStore({
        reducer: {
            members: membersReducer,
            auth: authReducer
        },
        preloadedState: {
            auth: {
                token: 'test-token',
                user: { id: 99, email: 'admin@test.com', permissions: isAdmin ? ['admin'] : [] }
            },
            members: { items: mockMembers, status: 'idle' }
        }
    });
};

describe('MembersManagement Page Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('displays (Disabled) text and reduced opacity for inactive members', async () => {
        const store = setupStore(true);
        render(
            <Provider store={store}>
                <MemoryRouter>
                    <MembersManagement />
                </MemoryRouter>
            </Provider>
        );

        // Wait for the list to be rendered
        await waitFor(() => {
            expect(screen.queryByText(/active@test.com/i)).toBeInTheDocument();
        }, { timeout: 3000 });

        // Check for (Disabled) text
        const disabledLabel = await screen.findByText(/\(Disabled\)/i);
        expect(disabledLabel).toBeInTheDocument();

        // Check for the inactive member row's opacity
        // Find the cell with the inactive email
        const cells = screen.getAllByRole('cell');
        const inactiveEmailCell = cells.find(c => c.textContent.includes('inactive@test.com'));
        expect(inactiveEmailCell).toBeInTheDocument();
        
        const row = inactiveEmailCell.closest('tr');
        expect(row.style.opacity).toBe('0.6');
    });

    it('shows "Account is Active" checkbox in the modals', async () => {
        const store = setupStore(true);
        render(
            <Provider store={store}>
                <MemoryRouter>
                    <MembersManagement />
                </MemoryRouter>
            </Provider>
        );

        // 1. Add Member Modal
        const addBtn = await screen.findByText(/\+ Add Member/i);
        fireEvent.click(addBtn);
        expect(await screen.findByLabelText(/Account is Active/i)).toBeInTheDocument();
        
        // Close modal
        const cancelButtons = screen.getAllByText(/Cancel/i);
        fireEvent.click(cancelButtons[0]);

        // 2. Edit Member Modal
        // Find Edit buttons - there should be two in the table
        const editButtons = await screen.findAllByText(/^Edit$/);
        // The second one (at index 1) is for our inactive member in the list
        fireEvent.click(editButtons[1]);
        
        const checkbox = await screen.findByLabelText(/Account is Active/i);
        expect(checkbox.checked).toBe(false); // Should be false for Inactive member
    });
});
