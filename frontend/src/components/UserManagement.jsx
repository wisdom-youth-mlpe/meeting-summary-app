import React, { useState, useEffect } from 'react';
import { getUser, getToken, isAntiGravityUser as checkIsAntiGravity } from '../services/auth';
import { getZones } from '../services/api';
import * as userApi from '../services/userApi';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [zones, setZones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [zoneSearch, setZoneSearch] = useState('');
    const [isZoneDropdownOpen, setIsZoneDropdownOpen] = useState(false);
    const [fetchError, setFetchError] = useState(null);
    const formRef = React.useRef(null);

    // Role priority: 1 = highest, 0 = Anti-Gravity (highest)
    const ROLE_PRIORITY = {
        antigravity: 0,
        admin: 1,
        district_admin: 2,
        zone_admin: 3,
    };

    const ROLE_LABELS = {
        admin: 'Admin',
        district_admin: 'District Admin',
        zone_admin: 'Zone Admin',
    };

    const ROLE_COLORS = {
        admin: { bg: 'var(--rust)', color: 'white' }, // Red
        district_admin: { bg: 'var(--slate)', color: 'white' }, // Blue
        zone_admin: { bg: 'var(--paddy)', color: 'white' }, // Green
        antigravity: { bg: 'var(--slate)', color: 'white' }, // Purple gradient
    };

    // Check if a user is Anti-Gravity
    const isAntiGravity = (user) => {
        if (!user) return false;
        if (user.isAntiGravity) return true;
        const roles = user.roles || [];
        return roles.includes('admin') && roles.includes('district_admin') && roles.includes('zone_admin');
    };

    // Get highest priority role for a user (Anti-Gravity is highest)
    const getHighestRole = (user) => {
        if (isAntiGravity(user)) return 'antigravity';
        const roles = user?.roles || [];
        if (roles.length === 0) return null;
        return roles.reduce((highest, role) => {
            if (!highest) return role;
            return ROLE_PRIORITY[role] < ROLE_PRIORITY[highest] ? role : highest;
        }, null);
    };

    // Sort users by role priority (Anti-Gravity first, then by role priority)
    const sortedUsers = [...users].sort((a, b) => {
        const aIsAntiGravity = isAntiGravity(a);
        const bIsAntiGravity = isAntiGravity(b);
        if (aIsAntiGravity && !bIsAntiGravity) return -1;
        if (!aIsAntiGravity && bIsAntiGravity) return 1;
        const aHighest = getHighestRole(a);
        const bHighest = getHighestRole(b);
        return (ROLE_PRIORITY[aHighest] || 99) - (ROLE_PRIORITY[bHighest] || 99);
    });

    const [formData, setFormData] = useState({
        username: '',
        password: '',
        roles: [],
        zoneAccess: [],
    });

    // Helper to get axios config with auth headers
    const getAuthConfig = () => ({
        headers: {
            'Authorization': `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
        },
    });

    useEffect(() => {
        fetchUsers();
        fetchZones();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await userApi.getAllUsers();
            if (response.success) {
                setUsers(response.users);
            } else {
                console.error('Failed to fetch users:', response.message);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchZones = async () => {
        try {
            const response = await getZones();
            if (response.success) {
                setZones(response.zones);
                console.log('Zones loaded:', response.zones.length);
                if (response.zones.length === 0) {
                    console.warn('No zones returned from API');
                }
            } else {
                console.error('Zone fetch failed:', response);
                setFetchError(response.message || 'Failed to load zones');
            }
        } catch (error) {
            console.error('Error fetching zones:', error);
            setFetchError(error.message || 'Error loading zones');
        }
    };

    const handleRoleToggle = (role) => {
        setFormData(prev => ({
            ...prev,
            roles: prev.roles.includes(role)
                ? prev.roles.filter(r => r !== role)
                : [...prev.roles, role]
        }));
    };

    const handleZoneToggle = (zoneId) => {
        setFormData(prev => ({
            ...prev,
            zoneAccess: prev.zoneAccess.includes(zoneId)
                ? prev.zoneAccess.filter(z => z !== zoneId)
                : [...prev.zoneAccess, zoneId]
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const response = editingUser ? await userApi.updateUser(editingUser.username, formData) : await userApi.createUser(formData);

            if (response.success) {
                alert(editingUser ? 'User updated successfully!' : 'User created successfully!');
                handleCancel();
                fetchUsers();
            } else {
                alert('Error: ' + response.message);
            }
        } catch (error) {
            console.error('Error saving user:', error);
            alert('An error occurred: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleEdit = (user) => {
        setEditingUser(user);
        setFormData({
            username: user.username,
            password: '',
            roles: user.roles || [],
            zoneAccess: user.zoneAccess || [],
        });
        setShowAddForm(true);
        // Reset Dropdown state
        setZoneSearch('');
        setIsZoneDropdownOpen(false);

        // Scroll to form after a short delay to ensure it's rendered
        setTimeout(() => {
            formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    };

    const handleCancel = () => {
        setShowAddForm(false);
        setEditingUser(null);
        setFormData({
            username: '',
            password: '',
            roles: [],
            zoneAccess: [],
        });
        setZoneSearch('');
        setIsZoneDropdownOpen(false);
    };

    const handleDelete = async (username) => {
        if (!confirm(`Are you sure you want to delete ${username}?`)) {
            return;
        }

        try {
            const response = await userApi.deleteUser(username);

            if (response.success) {
                alert('User deleted successfully!');
                fetchUsers();
            } else {
                alert('Error: ' + response.message);
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('An error occurred: ' + (error.response?.data?.message || error.message));
        }
    };

    if (loading) {
        return <div className="container">Loading...</div>;
    }

    return (
        <div className="container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1>User Management</h1>
                {!showAddForm && (
                    <button
                        onClick={() => setShowAddForm(true)}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: 'var(--primary-blue)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontFamily: 'Anek Malayalam',
                            fontSize: '16px',
                        }}
                    >
                        + New User
                    </button>
                )}
            </div>

            {showAddForm && (
                <div ref={formRef} style={{
                    backgroundColor: 'white',
                    padding: '24px',
                    borderRadius: '12px',
                    marginBottom: '24px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}>
                    <h2>{editingUser ? 'Edit User' : 'Add New User'}</h2>

                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                                Username
                            </label>
                            <input
                                type="text"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                disabled={!!editingUser}
                                required
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--edge)',
                                    fontSize: '16px',
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                                Password {editingUser && '(Leave blank to keep current)'}
                            </label>
                            <input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required={!editingUser}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--edge)',
                                    fontSize: '16px',
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                                Roles <span style={{ fontSize: '12px', color: 'var(--stone)', fontWeight: 'normal' }}>(Priority: Admin &gt; District Admin &gt; Zone Admin)</span>
                            </label>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                {['admin', 'district_admin', 'zone_admin'].map(role => (
                                    <label key={role} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '8px 16px',
                                        backgroundColor: formData.roles.includes(role) ? ROLE_COLORS[role].bg : 'var(--gray-50)',
                                        color: formData.roles.includes(role) ? ROLE_COLORS[role].color : 'var(--slate)',
                                        border: formData.roles.includes(role) ? '2px solid transparent' : '2px solid var(--edge)',
                                        borderRadius: '20px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        fontWeight: formData.roles.includes(role) ? '600' : 'normal',
                                    }}>
                                        <input
                                            type="checkbox"
                                            checked={formData.roles.includes(role)}
                                            onChange={() => handleRoleToggle(role)}
                                            style={{ cursor: 'pointer', display: 'none' }}
                                        />
                                        {ROLE_LABELS[role]}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {formData.roles.includes('zone_admin') && (
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                                    Zone Access
                                </label>

                                <div style={{ position: 'relative' }}>
                                    {/* Dropdown Header */}
                                    <div
                                        onClick={() => setIsZoneDropdownOpen(!isZoneDropdownOpen)}
                                        style={{
                                            padding: '10px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--edge)',
                                            backgroundColor: 'white',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <span style={{
                                            color: formData.zoneAccess.length > 0 ? 'var(--slate)' : 'var(--stone)',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            maxWidth: '90%'
                                        }}>
                                            {formData.zoneAccess.length === 0
                                                ? 'Select Zones...'
                                                : zones
                                                    .filter(z => formData.zoneAccess.includes(z.id))
                                                    .map(z => z.name)
                                                    .join(', ')}
                                        </span>
                                        <span>{isZoneDropdownOpen ? '▲' : '▼'}</span>
                                    </div>

                                    {/* Dropdown Content */}
                                    {isZoneDropdownOpen && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '100%',
                                            left: 0,
                                            right: 0,
                                            zIndex: 9999,
                                            backgroundColor: 'white',
                                            border: '1px solid var(--edge)',
                                            borderRadius: '8px',
                                            marginTop: '4px',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                            padding: '12px'
                                        }}>
                                            {fetchError && (
                                                <div style={{ color: 'red', marginBottom: '8px', fontSize: '14px' }}>
                                                    {fetchError}. Refresh page?
                                                </div>
                                            )}
                                            <div style={{ marginBottom: '8px', display: 'flex', gap: '8px' }}>
                                                <input
                                                    type="text"
                                                    placeholder="Search..."
                                                    value={zoneSearch}
                                                    onChange={(e) => setZoneSearch(e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    style={{
                                                        flex: 1,
                                                        padding: '8px',
                                                        borderRadius: '6px',
                                                        border: '1px solid var(--edge)',
                                                    }}
                                                />
                                            </div>

                                            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const allZoneIds = zones.map(z => z.id);
                                                        setFormData(prev => ({ ...prev, zoneAccess: allZoneIds }));
                                                    }}
                                                    style={{
                                                        flex: 1,
                                                        padding: '6px',
                                                        backgroundColor: 'var(--gray-50)',
                                                        border: '1px solid var(--primary-blue)',
                                                        color: 'var(--primary-blue)',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer',
                                                        fontSize: '12px',
                                                    }}
                                                >
                                                    Select All
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData(prev => ({ ...prev, zoneAccess: [] }));
                                                    }}
                                                    style={{
                                                        flex: 1,
                                                        padding: '6px',
                                                        backgroundColor: 'var(--rust-wash)',
                                                        border: '1px solid var(--rust)',
                                                        color: 'var(--rust)',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer',
                                                        fontSize: '12px',
                                                    }}
                                                >
                                                    Deselect All
                                                </button>
                                            </div>

                                            <div style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '4px',
                                                maxHeight: '200px',
                                                overflowY: 'auto',
                                            }}>
                                                {zones
                                                    .filter(zone => zone.name.toLowerCase().includes(zoneSearch.toLowerCase()))
                                                    .map(zone => (
                                                        <label key={zone.id} style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '8px',
                                                            padding: '8px',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            fontSize: '14px',
                                                            backgroundColor: formData.zoneAccess.includes(zone.id) ? 'var(--gray-50)' : 'transparent',
                                                        }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={formData.zoneAccess.includes(zone.id)}
                                                                onChange={() => handleZoneToggle(zone.id)}
                                                                style={{ cursor: 'pointer' }}
                                                            />
                                                            {zone.name}
                                                        </label>
                                                    ))}
                                                {zones.filter(zone => zone.name.toLowerCase().includes(zoneSearch.toLowerCase())).length === 0 && (
                                                    <div style={{ color: 'var(--stone)', fontStyle: 'italic', padding: '8px', textAlign: 'center' }}>
                                                        No zones match "{zoneSearch}"
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                            <button
                                type="submit"
                                style={{
                                    padding: '10px 24px',
                                    backgroundColor: 'var(--primary-green)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontFamily: 'Anek Malayalam',
                                    fontSize: '16px',
                                    fontWeight: '600',
                                }}
                            >
                                {editingUser ? 'Update' : 'Save'}
                            </button>
                            <button
                                type="button"
                                onClick={handleCancel}
                                style={{
                                    padding: '10px 24px',
                                    backgroundColor: 'var(--slate)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontFamily: 'Anek Malayalam',
                                    fontSize: '16px',
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ backgroundColor: 'var(--primary-blue)', color: 'white' }}>
                            <th style={{ padding: '12px', textAlign: 'left' }}>Username</th>
                            <th style={{ padding: '12px', textAlign: 'left' }}>Roles</th>
                            <th style={{ padding: '12px', textAlign: 'left' }}>Zone Access</th>
                            <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedUsers.length === 0 ? (
                            <tr>
                                <td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: 'var(--stone)' }}>
                                    No users found. Add new user from above.
                                </td>
                            </tr>
                        ) : (
                            sortedUsers.map((user, index) => (
                                <tr key={user.username} style={{
                                    backgroundColor: isAntiGravity(user) ? 'rgba(52, 66, 74, 0.05)' : (index % 2 === 0 ? 'white' : 'var(--gray-50)'),
                                    borderBottom: '1px solid var(--edge)',
                                    borderLeft: isAntiGravity(user) ? '3px solid var(--slate)' : 'none',
                                }}>
                                    <td style={{ padding: '12px', fontWeight: '600' }}>
                                        {user.username}
                                        {isAntiGravity(user) && (
                                            <span style={{
                                                marginLeft: '8px',
                                                fontSize: '10px',
                                                fontWeight: '700',
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                background: 'var(--slate)',
                                                color: 'white',
                                            }}>
                                                ⚡
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                            {isAntiGravity(user) && (
                                                <span
                                                    style={{
                                                        padding: '4px 10px',
                                                        background: 'var(--slate)',
                                                        color: 'white',
                                                        borderRadius: '12px',
                                                        fontSize: '12px',
                                                        fontWeight: '700',
                                                    }}
                                                >
                                                    Anti-Gravity
                                                </span>
                                            )}
                                            {!isAntiGravity(user) && user.roles?.sort((a, b) => ROLE_PRIORITY[a] - ROLE_PRIORITY[b]).map(role => (
                                                <span
                                                    key={role}
                                                    style={{
                                                        padding: '4px 10px',
                                                        backgroundColor: ROLE_COLORS[role]?.bg || 'var(--stone)',
                                                        color: ROLE_COLORS[role]?.color || 'white',
                                                        borderRadius: '12px',
                                                        fontSize: '12px',
                                                        fontWeight: '600',
                                                    }}
                                                >
                                                    {ROLE_LABELS[role] || role}
                                                </span>
                                            ))}
                                            {!isAntiGravity(user) && (!user.roles || user.roles.length === 0) && '-'}
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        {isAntiGravity(user) || user.zoneAccess?.includes('ALL') ? (
                                            <span style={{
                                                padding: '4px 10px',
                                                background: 'linear-gradient(135deg, rgba(52, 66, 74, 0.2), rgba(52, 66, 74, 0.2))',
                                                borderRadius: '12px',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                color: 'var(--slate)',
                                            }}>
                                                ✓ All Zones
                                            </span>
                                        ) : user.zoneAccess?.length > 0 ? (
                                            <span style={{
                                                padding: '4px 10px',
                                                backgroundColor: 'var(--edge)',
                                                borderRadius: '12px',
                                                fontSize: '12px',
                                            }}>
                                                {user.zoneAccess.length} zone{user.zoneAccess.length > 1 ? 's' : ''}
                                            </span>
                                        ) : '-'}
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'center' }}>
                                        <button
                                            onClick={() => handleEdit(user)}
                                            style={{
                                                padding: '6px 16px',
                                                backgroundColor: 'var(--primary-green)',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                fontSize: '14px',
                                                marginRight: '8px',
                                            }}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(user.username)}
                                            style={{
                                                padding: '6px 16px',
                                                backgroundColor: 'var(--rust)',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                fontSize: '14px',
                                            }}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default UserManagement;

