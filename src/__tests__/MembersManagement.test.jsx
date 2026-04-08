import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import MembersManagement from '../pages/MembersManagement';
import membersReducer from '../store/membersSlice';
import authReducer from '../store/authSlice';
import { MemoryRouter } from 'react-router-dom';

// Mock navigator.clipboard
Object.assign(navigator, {
    clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
    },
});

const mockMembers = [
    { id: 1, first_name: 'Active', last_name: 'Member', email: 'active@test.com', is_active: true, roles: ['lead_singer'], permissions: ['member'], phone_number: '+1234567890' },
    { id: 2, first_name: 'Inactive', last_name: 'Member', email: 'inactive@test.com', is_active: false, roles: [], permissions: ['member'] }
];

// Mock axios
vi.mock('axios', () => ({
    default: {
        get: vi.fn((url) => {
            if (url.includes('/members/metadata')) {
                return Promise.resolve({ data: { assignable_roles: ['lead_singer', 'soprano', 'alto', 'tenor', 'Sunday Lead Singer'] } });
            }
            if (url.includes('/members/')) {
                return Promise.resolve({ data: mockMembers });
            }
            return Promise.resolve({ data: [] });
        }),
        post: vi.fn((url, data) => Promise.resolve({ data: { id: 3, ...data } })),
        put: vi.fn((url, data) => Promise.resolve({ data: { id: 1, ...data } })),
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

    it('displays (Disabled) text and reduced opacity for inactive members using testids', async () => {
        const store = setupStore(true);
        render(
            <Provider store={store}>
                <MemoryRouter>
                    <MembersManagement />
                </MemoryRouter>
            </Provider>
        );

        // Find the inactive member row
        const inactiveRow = await screen.findByTestId('member-row-2');
        expect(inactiveRow).toBeInTheDocument();
        expect(inactiveRow.style.opacity).toBe('0.6');

        // Check for (Disabled) label
        const disabledLabel = screen.getByTestId('disabled-label');
        expect(disabledLabel).toBeInTheDocument();
        expect(disabledLabel.textContent).toBe('(Disabled)');
    });

    it('shows "Account is Active" checkbox and ensures it is functional', async () => {
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
        const activeCheckbox = await screen.findByLabelText(/Account is Active/i);
        expect(activeCheckbox).toBeInTheDocument();
        expect(activeCheckbox.checked).toBe(true); // Default should be true
        
        // Close modal
        fireEvent.click(screen.getByText(/Cancel/i));

        // 2. Edit Member Modal
        const editButtons = screen.getAllByText(/^Edit$/);
        fireEvent.click(editButtons[1]); // Edit inactive member
        const editActiveCheckbox = await screen.findByLabelText(/Account is Active/i);
        expect(editActiveCheckbox.checked).toBe(false); // Should be false for Inactive
    });

    it('generates a secure password in the Add Member modal', async () => {
        const store = setupStore(true);
        render(
            <Provider store={store}>
                <MemoryRouter>
                    <MembersManagement />
                </MemoryRouter>
            </Provider>
        );

        fireEvent.click(screen.getByText(/\+ Add Member/i));
        const passwordInput = await screen.findByPlaceholderText(/Password/i);
        expect(passwordInput.value).toBe('');

        const generateBtn = screen.getByText(/Generate/i);
        fireEvent.click(generateBtn);

        expect(passwordInput.value).not.toBe('');
        expect(passwordInput.value.length).toBeGreaterThanOrEqual(12);
    });

    it('copies a member to start creation with pre-filled data', async () => {
        const store = setupStore(true);
        render(
            <Provider store={store}>
                <MemoryRouter>
                    <MembersManagement />
                </MemoryRouter>
            </Provider>
        );

        const copyButtons = await screen.findAllByText(/Copy/i);
        fireEvent.click(copyButtons[0]); // Copy Active Member

        // Should open Add Member modal (not Edit)
        expect(await screen.findByText(/Add New Member/i)).toBeInTheDocument();

        // Fields should be pre-filled except email/nfc
        expect(screen.getByPlaceholderText(/First Name/i).value).toBe('Active');
        expect(screen.getByPlaceholderText(/Last Name/i).value).toBe('Member');
        expect(screen.getByPlaceholderText(/Email/i).value).toBe('copyactive@test.com');
        expect(screen.getByPlaceholderText(/Phone/i).value).toBe('+1234567890');
    });

    it('allows custom password input in the Reset Password modal', async () => {
        const store = setupStore(true);
        render(
            <Provider store={store}>
                <MemoryRouter>
                    <MembersManagement />
                </MemoryRouter>
            </Provider>
        );

        const resetButtons = await screen.findAllByText(/Reset Password/i);
        fireEvent.click(resetButtons[0]);

        const passwordInput = await screen.findByDisplayValue(/.+/); // Should be auto-filled initially
        expect(passwordInput).not.toBeDisabled();

        // Change to custom password
        fireEvent.change(passwordInput, { target: { value: 'CustomPassword123!' } });
        expect(passwordInput.value).toBe('CustomPassword123!');
    });
});
