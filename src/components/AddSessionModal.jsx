import React, { useState, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { addSession } from '../store/sessionsSlice';
import Modal from './Modal';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { toast } from 'react-hot-toast';

const AddSessionModal = ({ isOpen, onClose, availableTypes = [], availableStatuses = [] }) => {
    const dispatch = useDispatch();
    const tzName = useMemo(() => new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' }).formatToParts(new Date()).find(p => p.type === 'timeZoneName')?.value || 'CDT', []);

    const defaultType = availableTypes[0] || '';
    const defaultStatus = availableStatuses[0] || '';

    const [formData, setFormData] = useState(() => ({
        title: '',
        type: defaultType,
        status: defaultStatus,
        start_time: new Date(),
        end_time: new Date(Date.now() + 2 * 60 * 60 * 1000)
    }));

    // Sync defaults when availableTypes/availableStatuses load from backend
    React.useEffect(() => {
        setFormData(prev => ({
            ...prev,
            type: prev.type || availableTypes[0] || '',
            status: prev.status || availableStatuses[0] || ''
        }));
    }, [availableTypes, availableStatuses]);

    const resetAndClose = () => {
        setFormData({
            title: '',
            type: availableTypes[0] || '',
            status: availableStatuses[0] || '',
            start_time: new Date(),
            end_time: new Date(Date.now() + 2 * 60 * 60 * 1000)
        });
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
