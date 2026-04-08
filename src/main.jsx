import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './store'
import { logout } from './store/authSlice'
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

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Dispatch through Redux so state is cleanly cleared,
      // then let the useSessionExpiry hook / ProtectedRoute handle the redirect.
      store.dispatch(logout());
      window.location.href = '/login';
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
