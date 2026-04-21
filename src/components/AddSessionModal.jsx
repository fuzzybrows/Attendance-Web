import React, { useState, useMemo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addSession } from '../store/sessionsSlice';
import Modal from './Modal';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const AddSessionModal = ({ isOpen, onClose, availableTypes = [], availableStatuses = [] }) => {
    const dispatch = useDispatch();
    const token = useSelector(state => state.auth.token);
    const tzName = useMemo(() => new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' }).formatToParts(new Date()).find(p => p.type === 'timeZoneName')?.value || 'CDT', []);

    const defaultType = availableTypes[0] || '';
    const defaultStatus = availableStatuses[0] || '';

    const [templates, setTemplates] = useState([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');

    const [formData, setFormData] = useState(() => ({
        title: '',
        type: defaultType,
        status: defaultStatus,
        start_time: new Date(),
        end_time: new Date(Date.now() + 2 * 60 * 60 * 1000)
    }));

    // Fetch templates when modal opens
    useEffect(() => {
        if (isOpen && token) {
            axios.get(`${API_URL}/session-templates/`, {
                headers: { Authorization: `Bearer ${token}` }
            }).then(res => {
                setTemplates(res.data);
            }).catch(() => {
                // Templates are optional — silently fail
            });
        }
    }, [isOpen, token]);

    // Sync defaults when availableTypes/availableStatuses load from backend
    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            type: prev.type || availableTypes[0] || '',
            status: prev.status || availableStatuses[0] || ''
        }));
    }, [availableTypes, availableStatuses]);

    const handleTemplateSelect = (templateId) => {
        setSelectedTemplateId(templateId);
        if (!templateId) return;

        const template = templates.find(t => String(t.id) === String(templateId));
        if (!template) return;

        // Use today's date with the template's time
        const now = new Date();
        const startTime = new Date(now);
        if (template.start_time) {
            // start_time from backend is "HH:MM:SS" or similar
            const [h, m] = template.start_time.split(':').map(Number);
            startTime.setHours(h, m, 0, 0);
        }

        const endTime = new Date(now);
        if (template.end_time) {
            const [h, m] = template.end_time.split(':').map(Number);
            endTime.setHours(h, m, 0, 0);
            // Handle overnight sessions
            if (endTime <= startTime) {
                endTime.setDate(endTime.getDate() + 1);
            }
        } else {
            endTime.setTime(startTime.getTime() + 2 * 60 * 60 * 1000);
        }

        setFormData(prev => ({
            ...prev,
            title: template.title,
            type: template.type || prev.type,
            start_time: startTime,
            end_time: endTime,
        }));

        toast.success(`Loaded "${template.title}" template`);
    };

    const resetAndClose = () => {
        setFormData({
            title: '',
            type: availableTypes[0] || '',
            status: availableStatuses[0] || '',
            start_time: new Date(),
            end_time: new Date(Date.now() + 2 * 60 * 60 * 1000)
        });
        setSelectedTemplateId('');
        onClose();
    };

    const handleSubmit = () => {
        if (!formData.title.trim()) {
            toast.error('Session title is required');
            return;
        }
        if (!formData.start_time) {
            toast.error('Please specify a start time.');
            return;
        }
        const payload = {
            ...formData,
            title: formData.title.trim(),
            start_time: formData.start_time.toISOString(),
            end_time: formData.end_time.toISOString(),
        };
        dispatch(addSession(payload));
        resetAndClose();
    };

    return (
        <Modal
            title="Add New Session"
            isOpen={isOpen}
            onClose={resetAndClose}
            hideFooter
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Template Selector */}
                {templates.length > 0 && (
                    <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '10px', padding: '0.75rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.8rem', color: '#818cf8', fontWeight: 600, letterSpacing: '0.03em' }}>
                            ⚡ Quick Fill from Template
                        </label>
                        <select
                            value={selectedTemplateId}
                            onChange={e => handleTemplateSelect(e.target.value)}
                            style={{ width: '100%', background: 'rgba(30, 41, 59, 0.8)', border: '1px solid rgba(99, 102, 241, 0.25)', color: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.9rem' }}
                        >
                            <option value="">— Select a template —</option>
                            {templates.map(t => (
                                <option key={t.id} value={t.id}>
                                    {t.title} ({t.type} · {DAY_NAMES[t.day_of_week]}s · {t.start_time?.slice(0, 5)})
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Session Title</label>
                    <input autoFocus placeholder="e.g. Sunday Service" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} style={{ width: '100%' }} />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Scheduled Start Time ({tzName})</label>
                    <DatePicker
                        selected={formData.start_time}
                        onChange={(date) => setFormData({ ...formData, start_time: date })}
                        showTimeSelect
                        dateFormat="Pp"
                        className="date-picker-input"
                        wrapperClassName="date-picker-wrapper"
                    />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Scheduled End Time ({tzName})</label>
                    <DatePicker
                        selected={formData.end_time}
                        onChange={(date) => setFormData({ ...formData, end_time: date })}
                        showTimeSelect
                        dateFormat="Pp"
                        className="date-picker-input"
                        wrapperClassName="date-picker-wrapper"
                    />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Session Type</label>
                    <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} style={{ width: '100%' }}>
                        {availableTypes.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                    </select>
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Status</label>
                    <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} style={{ width: '100%' }}>
                        {availableStatuses.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </select>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                    <button type="button" className="btn" style={{ background: 'transparent', border: '1px solid var(--text-secondary)' }} onClick={resetAndClose}>
                        Cancel
                    </button>
                    <button type="button" className="btn" style={{ background: 'var(--primary-color)', color: 'white' }} onClick={handleSubmit}>
                        Add Session
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default AddSessionModal;
