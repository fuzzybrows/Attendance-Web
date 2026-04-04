import React from 'react';

const Modal = ({ title, isOpen, onClose, onSubmit, hideFooter, hideCancel, submitText = 'Submit', children }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" style={{ display: 'block', overflowY: 'auto', padding: '1rem' }}>
            <div className="glass-card" style={{ 
                maxWidth: '500px', 
                width: '100%', 
                margin: '2rem auto', 
                position: 'relative',
                display: 'flex',
                flexDirection: 'column'
            }}>
                {onClose && (
                    <button 
                        onClick={onClose} 
                        style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1, zIndex: 10 }}
                        aria-label="Close modal"
                    >
                        &times;
                    </button>
                )}
                <h2 style={{ marginTop: 0, paddingRight: '2rem', flexShrink: 0 }}>{title}</h2>
                <div style={{ paddingRight: '0.5rem', flex: 1 }}>{children}</div>
                {!hideFooter && <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
                    {!hideCancel && <button className="btn" style={{ background: 'transparent', border: '1px solid var(--text-secondary)' }} onClick={onClose}>Cancel</button>}
                    {onSubmit && <button className="btn" onClick={onSubmit} style={{ background: 'var(--primary-color)', color: 'white' }}>{submitText}</button>}
                </div>}
            </div>
        </div>
    );
};

export default Modal;
