import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchMembers, addMember, updateMember } from '../store/membersSlice';
import Modal from '../components/Modal';
import axios from 'axios';
import { toast } from 'react-hot-toast';

function MembersManagement() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { items: members, loading } = useSelector(state => state.members);
    const { user } = useSelector(state => state.auth);
    
    const isAdmin = user?.permissions?.includes('admin') || user?.roles?.includes('admin');
    const canReadMembers = isAdmin || user?.permissions?.includes('members_read');
    const canCreateMembers = isAdmin || user?.permissions?.includes('members_create');
    const canEditMembers = isAdmin || user?.permissions?.includes('members_edit');
    const canDeleteMembers = isAdmin || user?.permissions?.includes('members_delete');

    console.log('[DEBUG] Member Privileges Eval:', { user, isAdmin, canReadMembers, canEditMembers, canDeleteMembers });

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
    const [memberToReset, setMemberToReset] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [editingMember, setEditingMember] = useState(null);
    const [newMember, setNewMember] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone_number: '',
        password: '',
        roles: [],
        permissions: ['member'],
        nfc_id: ''
    });

    const [searchQuery, setSearchQuery] = useState('');
    const [availableRoles, setAvailableRoles] = useState([]);
    const [availablePermissions, setAvailablePermissions] = useState([]);

    useEffect(() => {
        dispatch(fetchMembers());
        
        // Fetch metadata (roles and permissions)
        const fetchMetadata = async () => {
            try {
                const response = await axios.get('/members/metadata');
                setAvailableRoles(response.data.roles || []);
                setAvailablePermissions(response.data.permissions || []);
            } catch (err) {
                console.error('Failed to fetch roles/permissions metadata', err);
            }
        };
        fetchMetadata();
    }, [dispatch]);

    // Redirect non-authorized users
    useEffect(() => {
        if (!canReadMembers) {
            navigate('/');
        }
    }, [canReadMembers, navigate]);

    if (!canReadMembers) return null;

    const filteredMembers = members.filter(m =>
        (m.first_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.last_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.email || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAddMember = () => {
        dispatch(addMember({
            ...newMember,
            first_name: (newMember.first_name || '').trim(),
            last_name: (newMember.last_name || '').trim(),
            email: (newMember.email || '').trim(),
            phone_number: (newMember.phone_number || '').trim() || null,
            nfc_id: (newMember.nfc_id || '').trim() || null,
            password: (newMember.password || '').trim(),
            roles: newMember.roles || [],
            permissions: newMember.permissions || ['member']
        }));
        setIsAddModalOpen(false);
        setNewMember({
            first_name: '',
            last_name: '',
            email: '',
            phone_number: '',
            password: '',
            roles: [],
            permissions: ['member'],
            nfc_id: ''
        });
    };

    const openEditModal = (member) => {
        setEditingMember({
            id: member.id,
            first_name: member.first_name,
            last_name: member.last_name,
            email: member.email,
            phone_number: member.phone_number || '',
            nfc_id: member.nfc_id || '',
            roles: member.roles || [],
            permissions: member.permissions || ['member']
        });
        setIsEditModalOpen(true);
    };

    const handleUpdateMember = () => {
        if (!editingMember) return;
        dispatch(updateMember({
            id: editingMember.id,
            updates: {
                first_name: (editingMember.first_name || '').trim(),
                last_name: (editingMember.last_name || '').trim(),
                email: (editingMember.email || '').trim(),
                phone_number: (editingMember.phone_number || '').trim() || null,
                nfc_id: (editingMember.nfc_id || '').trim() || null,
                roles: editingMember.roles || [],
                permissions: editingMember.permissions || []
            }
        }));
        setIsEditModalOpen(false);
        setEditingMember(null);
    };

    const toggleNewMemberRole = (role) => {
        setNewMember(prev => ({
            ...prev,
            roles: prev.roles.includes(role)
                ? prev.roles.filter(r => r !== role)
                : [...prev.roles, role]
        }));
    };

    const toggleNewMemberPermission = (perm) => {
        setNewMember(prev => ({
            ...prev,
            permissions: prev.permissions.includes(perm)
                ? prev.permissions.filter(p => p !== perm)
                : [...prev.permissions, perm]
        }));
    };

    const toggleEditRole = (role) => {
        setEditingMember(prev => ({
            ...prev,
            roles: prev.roles.includes(role)
                ? prev.roles.filter(r => r !== role)
                : [...prev.roles, role]
        }));
    };

    const toggleEditPermission = (perm) => {
        setEditingMember(prev => ({
            ...prev,
            permissions: prev.permissions.includes(perm)
                ? prev.permissions.filter(p => p !== perm)
                : [...prev.permissions, perm]
        }));
    };

    const openResetPasswordModal = (member) => {
        setMemberToReset(member);
        setNewPassword('');
        setIsResetPasswordModalOpen(true);
    };

    const handleResetPassword = (e) => {
        e.preventDefault();
        if (!newPassword || newPassword.trim() === '') {
            toast.error("Password cannot be empty.");
            return;
        }
        axios.post(`/members/${memberToReset.id}/reset-password`, { new_password: newPassword })
            .then(() => {
                toast.success(`Password successfully reset for ${memberToReset.first_name}.`);
                setIsResetPasswordModalOpen(false);
                setMemberToReset(null);
                setNewPassword('');
            })
            .catch(err => {
                toast.error("Failed to reset password: " + (err.response?.data?.detail || err.message));
            });
    };

    return (
        <div className="glass-card">
            <div className="flex-between" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h1 style={{ margin: 0, fontSize: 'clamp(1.5rem, 5vw, 2.5rem)' }}>Member Management</h1>
                <div style={{ display: 'flex', gap: '0.5rem', width: '100%', maxWidth: '500px', flexWrap: 'wrap' }}>
                    <input
                        type="text"
                        placeholder="Search members..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            padding: '0.65rem 1rem',
                            borderRadius: '10px',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            background: 'rgba(255,255,255,0.05)',
                            color: 'var(--text-primary)',
                            flex: '1',
                            minWidth: '200px',
                            marginBottom: 0
                        }}
                    />
                    {canCreateMembers && (
                        <button className="btn" style={{ flex: '0 0 auto', whiteSpace: 'nowrap' }} onClick={() => setIsAddModalOpen(true)}>+ Add Member</button>
                    )}
                </div>
            </div>

            <div className="table-responsive desktop-only-table">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Roles</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredMembers.map(m => (
                            <tr key={m.id}>
                                <td>{m.first_name} {m.last_name}</td>
                                <td className="truncate-cell" title={m.email}>{m.email}</td>
                                <td>{m.phone_number || 'N/A'}</td>
                                <td>
                                    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                                        {m.roles?.map(r => (
                                            <span key={r} className="status-badge" style={{ background: 'rgba(99, 102, 241, 0.2)', color: '#6366f1', fontSize: '0.75rem' }}>{r}</span>
                                        ))}
                                    </div>
                                </td>
                                <td>
                                    <span className={`status-badge ${m.email_verified || m.phone_number_verified ? 'status-manual' : 'status-nfc'}`}>
                                        {m.email_verified || m.phone_number_verified ? 'Verified' : 'Unverified'}
                                    </span>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        {canEditMembers && (
                                            <button className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => openEditModal(m)}>Edit</button>
                                        )}
                                        {canEditMembers && (
                                            <button className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.2)' }} onClick={() => openResetPasswordModal(m)}>Reset Password</button>
                                        )}
                                        {canDeleteMembers && m.id !== user?.id && (
                                            <button className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)' }} onClick={() => {
                                                if (window.confirm(`Are you sure you want to delete ${m.first_name}?`)) {
                                                    axios.delete(`/members/${m.id}`).then(() => dispatch(fetchMembers()));
                                                }
                                            }}>Delete</button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mobile-card-list">
                {filteredMembers.map(m => (
                    <div key={m.id} className="mobile-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{m.first_name} {m.last_name}</h3>
                                <p style={{ margin: '0.25rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{m.email}</p>
                                {m.phone_number && <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{m.phone_number}</p>}
                            </div>
                            <span className={`status-badge ${m.email_verified || m.phone_number_verified ? 'status-manual' : 'status-nfc'}`} style={{ fontSize: '0.65rem' }}>
                                {m.email_verified || m.phone_number_verified ? 'Verified' : 'Unverified'}
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                            {m.roles?.map(r => (
                                <span key={r} className="status-badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', fontSize: '0.65rem', border: '1px solid rgba(165, 180, 252, 0.2)' }}>{r}</span>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {canEditMembers && (
                                <button className="btn" style={{ flex: 1, padding: '0.6rem', fontSize: '0.9rem' }} onClick={() => openEditModal(m)}>Edit Details</button>
                            )}
                            {canEditMembers && (
                                <button className="btn" style={{ flex: 1, padding: '0.6rem', fontSize: '0.9rem', background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.2)' }} onClick={() => openResetPasswordModal(m)}>Reset</button>
                            )}
                            {canDeleteMembers && m.id !== user?.id && (
                                <button className="btn" style={{ flex: 1, padding: '0.6rem', fontSize: '0.9rem', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)' }} onClick={() => {
                                    if (window.confirm(`Are you sure you want to delete ${m.first_name}?`)) {
                                        axios.delete(`/members/${m.id}`).then(() => dispatch(fetchMembers()));
                                    }
                                }}>Delete</button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Member Modal */}
            <Modal title="Add New Member" isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSubmit={handleAddMember}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                    <input placeholder="First Name" value={newMember.first_name} onChange={e => setNewMember({ ...newMember, first_name: e.target.value })} style={{ marginBottom: 0 }} />
                    <input placeholder="Last Name" value={newMember.last_name} onChange={e => setNewMember({ ...newMember, last_name: e.target.value })} style={{ marginBottom: 0 }} />
                </div>
                <input placeholder="Email Address" value={newMember.email} onChange={e => setNewMember({ ...newMember, email: e.target.value })} />
                <input placeholder="Phone (e.g. +1234567890)" value={newMember.phone_number} onChange={e => setNewMember({ ...newMember, phone_number: e.target.value })} />
                <input type="password" placeholder="Password" value={newMember.password} onChange={e => setNewMember({ ...newMember, password: e.target.value })} />
                <input placeholder="NFC ID (Optional)" value={newMember.nfc_id} onChange={e => setNewMember({ ...newMember, nfc_id: e.target.value })} />

                <p style={{ margin: '1rem 0 0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Roles</p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    {availableRoles.map(role => (
                        <button
                            key={role}
                            type="button"
                            className="status-badge"
                            style={{
                                cursor: 'pointer',
                                border: 'none',
                                background: newMember.roles.includes(role) ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)',
                                color: newMember.roles.includes(role) ? 'white' : 'var(--text-secondary)'
                            }}
                            onClick={() => toggleNewMemberRole(role)}
                        >
                            {role}
                        </button>
                    ))}
                </div>

                <p style={{ margin: '1rem 0 0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Permissions</p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    {availablePermissions.map(perm => (
                        <button
                            key={perm}
                            type="button"
                            className="status-badge"
                            style={{
                                cursor: 'pointer',
                                border: 'none',
                                background: newMember.permissions.includes(perm) ? 'var(--accent-color)' : 'rgba(255,255,255,0.05)',
                                color: newMember.permissions.includes(perm) ? 'white' : 'var(--text-secondary)'
                            }}
                            onClick={() => toggleNewMemberPermission(perm)}
                        >
                            {perm}
                        </button>
                    ))}
                </div>
            </Modal>

            {/* Edit Member Modal */}
            <Modal title="Edit Member" isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setEditingMember(null); }} onSubmit={handleUpdateMember}>
                {editingMember && (
                    <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                            <input placeholder="First Name" value={editingMember.first_name} onChange={e => setEditingMember({ ...editingMember, first_name: e.target.value })} style={{ marginBottom: 0 }} />
                            <input placeholder="Last Name" value={editingMember.last_name} onChange={e => setEditingMember({ ...editingMember, last_name: e.target.value })} style={{ marginBottom: 0 }} />
                        </div>
                        <input placeholder="Email Address" value={editingMember.email} onChange={e => setEditingMember({ ...editingMember, email: e.target.value })} />
                        <input placeholder="Phone (e.g. +1234567890)" value={editingMember.phone_number} onChange={e => setEditingMember({ ...editingMember, phone_number: e.target.value })} />
                        <input placeholder="NFC ID (Optional)" value={editingMember.nfc_id} onChange={e => setEditingMember({ ...editingMember, nfc_id: e.target.value })} />

                        <p style={{ margin: '1rem 0 0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Roles</p>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                            {availableRoles.map(role => (
                                <button
                                    key={role}
                                    type="button"
                                    className="status-badge"
                                    style={{
                                        cursor: 'pointer',
                                        border: 'none',
                                        background: editingMember.roles.includes(role) ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)',
                                        color: editingMember.roles.includes(role) ? 'white' : 'var(--text-secondary)'
                                    }}
                                    onClick={() => toggleEditRole(role)}
                                >
                                    {role}
                                </button>
                            ))}
                        </div>

                        <p style={{ margin: '1rem 0 0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Permissions</p>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                            {availablePermissions.map(perm => (
                                <button
                                    key={perm}
                                    type="button"
                                    className="status-badge"
                                    style={{
                                        cursor: 'pointer',
                                        border: 'none',
                                        background: editingMember.permissions.includes(perm) ? 'var(--accent-color)' : 'rgba(255,255,255,0.05)',
                                        color: editingMember.permissions.includes(perm) ? 'white' : 'var(--text-secondary)'
                                    }}
                                    onClick={() => toggleEditPermission(perm)}
                                >
                                    {perm}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </Modal>

            {/* Reset Password Modal */}
            <Modal title={memberToReset ? `Reset Password for ${memberToReset.first_name}` : "Reset Password"} isOpen={isResetPasswordModalOpen} onClose={() => setIsResetPasswordModalOpen(false)} onSubmit={handleResetPassword} submitText="Reset Password" hideCancel>
                <input type="password" placeholder="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required style={{ marginBottom: 0 }} />
            </Modal>
        </div>
    );
}

export default MembersManagement;
