import React from 'react';

const Modal = ({ title, isOpen, onClose, onSubmit, hideFooter, submitText = 'Submit', children }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="glass-card" style={{ maxWidth: '500px', width: '100%', margin: 0, position: 'relative' }}>
                {onClose && (
                    <button 
                        onClick={onClose} 
                        style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}
                        aria-label="Close modal"
                    >
                        &times;
                    </button>
                )}
                <h2 style={{ marginTop: 0, paddingRight: '2rem' }}>{title}</h2>
                <div>{children}</div>
                {!hideFooter && <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                    <button className="btn" style={{ background: 'transparent', border: '1px solid var(--text-secondary)' }} onClick={onClose}>Cancel</button>
                    {onSubmit && <button className="btn" onClick={onSubmit} style={{ background: 'var(--primary-color)', color: 'white' }}>{submitText}</button>}
                </div>}
            </div>
        </div>
    );
};

export default Modal;
