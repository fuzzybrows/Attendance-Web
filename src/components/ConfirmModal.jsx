import React from 'react';
import Modal from './Modal';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', type = 'danger' }) => {
    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={title}
            hideFooter={true}
        >
            <div style={{ padding: '0.5rem 0' }}>
                <p style={{ color: '#94a3b8', marginBottom: '2rem', lineHeight: '1.5' }}>
                    {message}
                </p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                    <button 
                        onClick={onClose}
                        style={{ 
                            padding: '0.6rem 1.25rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', 
                            background: 'transparent', color: 'white', cursor: 'pointer', fontWeight: 600
                        }}
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={() => { onConfirm(); onClose(); }}
                        style={{ 
                            padding: '0.6rem 1.25rem', borderRadius: '8px', border: 'none', 
                            background: type === 'danger' ? '#ef4444' : '#6366f1', 
                            color: 'white', cursor: 'pointer', fontWeight: 600,
                            boxShadow: type === 'danger' ? '0 4px 12px rgba(239, 68, 68, 0.2)' : '0 4px 12px rgba(99, 102, 241, 0.2)'
                        }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ConfirmModal;
