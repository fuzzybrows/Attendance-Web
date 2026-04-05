import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Login from '../pages/Login';
import authReducer from '../store/authSlice';
import { MemoryRouter } from 'react-router-dom';

const setupStore = () => {
    return configureStore({
        reducer: {
            auth: authReducer
        }
    });
};

describe('LoginPage Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('toggles password visibility when the show/hide button is clicked', async () => {
        const store = setupStore();
        render(
            <Provider store={store}>
                <MemoryRouter>
                    <Login />
                </MemoryRouter>
            </Provider>
        );

        const passwordInput = screen.getByPlaceholderText(/Password/i);
        const toggleButton = screen.getByTestId('show-password-toggle');

        // Initial state should be password
        expect(passwordInput.type).toBe('password');

        // Click to show
        fireEvent.click(toggleButton);
        expect(passwordInput.type).toBe('text');
        expect(toggleButton.getAttribute('aria-label')).toBe('Hide password');

        // Click to hide
        fireEvent.click(toggleButton);
        expect(passwordInput.type).toBe('password');
        expect(toggleButton.getAttribute('aria-label')).toBe('Show password');
    });
});
