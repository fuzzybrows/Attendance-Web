import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './store'
import { logout, refreshToken } from './store/authSlice'
import App from './App'
import './index.css'

import axios from 'axios';

// API Configuration - Connect directly to the standalone API server
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8001';
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- Silent Token Refresh ---
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // refresh when < 5 min remaining
let isRefreshing = false;

function getTokenExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 : null; // ms
  } catch {
    return null;
  }
}

function shouldRefresh(token) {
  const exp = getTokenExpiry(token);
  if (!exp) return false;
  return exp - Date.now() < REFRESH_THRESHOLD_MS;
}

axios.interceptors.response.use(
  (response) => {
    // After any successful authenticated response, check if token needs refreshing
    const token = localStorage.getItem('token');
    if (token && shouldRefresh(token) && !isRefreshing) {
      isRefreshing = true;
      store.dispatch(refreshToken())
        .finally(() => { isRefreshing = false; });
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Don't logout if this was the refresh call itself failing
      if (!error.config?.url?.endsWith('/auth/refresh')) {
        store.dispatch(logout());
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>,
)
