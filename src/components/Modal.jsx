import React from 'react';

const Modal = ({ title, isOpen, onClose, onSubmit, hideFooter, submitText = 'Submit', children }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="glass-card" style={{ maxWidth: '500px', width: '100%', margin: 0 }}>
                <h2>{title}</h2>
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
