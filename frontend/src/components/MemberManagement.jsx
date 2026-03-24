import React, { useState, useEffect } from 'react';
import { getUser, hasRole } from '../services/auth';

const MemberManagement = () => {
    const [committees, setCommittees] = useState([]);
    const [roles, setRoles] = useState([]);
    const [zones, setZones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [editingCommittee, setEditingCommittee] = useState(null);
    const [selectedZoneFilter, setSelectedZoneFilter] = useState('All');

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        roleId: '',
        zoneId: '',
        mobile: '',
        whatsapp: '',
    });

    useEffect(() => {
        loadData();
    }, [selectedZoneFilter]);

    const loadData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                loadCommittees(),
                loadRoles(),
                loadZones(),
            ]);
            setError(null);
        } catch (err) {
            setError('Failed to load data: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const loadCommittees = async () => {
        try {
            const token = localStorage.getItem('token');
            const queryParam = selectedZoneFilter !== 'All' ? `?zoneId=${selectedZoneFilter}` : '';
            const response = await fetch(`/api/committees${queryParam}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            const data = await response.json();
            if (data.success) {
                setCommittees(data.committees);
            }
        } catch (err) {
            console.error('Failed to load committees:', err);
        }
    };

    const loadRoles = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/committee-roles', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            const data = await response.json();
            if (data.success) {
                setRoles(data.roles);
            }
        } catch (err) {
            console.error('Failed to load roles:', err);
        }
    };

    const loadZones = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/zones', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            const data = await response.json();
            if (data.success) {
                setZones(data.zones);
            }
        } catch (err) {
            console.error('Failed to load zones:', err);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const token = localStorage.getItem('token');
            const url = editingCommittee
                ? `/api/committees/${editingCommittee.committeeId}`
                : '/api/committees';
            const method = editingCommittee ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (data.success) {
                alert(data.message);
                resetForm();
                loadCommittees();
            } else {
                alert('Error: ' + data.message);
            }
        } catch (err) {
            alert('Failed to save committee member: ' + err.message);
        }
    };

    const handleEdit = (committee) => {
        setEditingCommittee(committee);
        setFormData({
            name: committee.name,
            roleId: committee.roleId,
            zoneId: committee.zoneId,
            mobile: committee.mobile || '',
            whatsapp: committee.whatsapp || '',
        });
        setShowForm(true);
    };

    const handleDelete = async (committeeId) => {
        if (!confirm('Are you sure you want to delete this committee member?')) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/committees/${committeeId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (data.success) {
                alert(data.message);
                loadCommittees();
            } else {
                alert('Error: ' + data.message);
            }
        } catch (err) {
            alert('Failed to delete committee member: ' + err.message);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            roleId: '',
            zoneId: '',
            mobile: '',
            whatsapp: '',
        });
        setEditingCommittee(null);
        setShowForm(false);
    };

    if (loading) {
        return <div className="loading-spinner">Loading...</div>;
    }

    return (
        <div className="committee-management">
            <div className="header-section">
                <h2>Members Management</h2>
                <button
                    className="btn-primary"
                    onClick={() => setShowForm(!showForm)}
                >
                    {showForm ? 'Cancel' : '+ Add Member'}
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            {showForm && (
                <div className="form-card">
                    <h3>{editingCommittee ? 'Edit Member' : 'Add New Member'}</h3>
                    <form onSubmit={handleSubmit}>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="Enter member name"
                                />
                            </div>

                            <div className="form-group">
                                <label>Role *</label>
                                <select
                                    name="roleId"
                                    value={formData.roleId}
                                    onChange={handleInputChange}
                                    required
                                >
                                    <option value="">Select Role</option>
                                    {roles.map(role => (
                                        <option key={role.roleId} value={role.roleId}>
                                            {role.name} ({role.englishName})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Zone *</label>
                                <select
                                    name="zoneId"
                                    value={formData.zoneId}
                                    onChange={handleInputChange}
                                    required
                                >
                                    <option value="">Select Zone</option>
                                    {zones.map(zone => (
                                        <option key={zone.id} value={zone.id}>
                                            {zone.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Mobile</label>
                                <input
                                    type="tel"
                                    name="mobile"
                                    value={formData.mobile}
                                    onChange={handleInputChange}
                                    placeholder="Enter mobile number"
                                />
                            </div>

                            <div className="form-group">
                                <label>WhatsApp</label>
                                <input
                                    type="tel"
                                    name="whatsapp"
                                    value={formData.whatsapp}
                                    onChange={handleInputChange}
                                    placeholder="Enter WhatsApp number"
                                />
                            </div>
                        </div>

                        <div className="form-actions">
                            <button type="submit" className="btn-primary">
                                {editingCommittee ? 'Update' : 'Add'} Member
                            </button>
                            <button type="button" className="btn-secondary" onClick={resetForm}>
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="filter-section">
                <label>Filter by Zone:</label>
                <select
                    value={selectedZoneFilter}
                    onChange={(e) => setSelectedZoneFilter(e.target.value)}
                    className="zone-filter"
                >
                    <option value="All">All Zones</option>
                    {zones.map(zone => (
                        <option key={zone.id} value={zone.id}>
                            {zone.name}
                        </option>
                    ))}
                </select>
            </div>

            <div className="table-card">
                <h3>Members ({committees.length})</h3>
                <div className="table-responsive">
                    <table className="committee-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th>Role</th>
                                <th>Zone</th>
                                <th>Mobile</th>
                                <th>WhatsApp</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {committees.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="empty-state">
                                        No committee members found
                                    </td>
                                </tr>
                            ) : (
                                committees.map(committee => (
                                    <tr key={committee.committeeId}>
                                        <td>{committee.committeeId}</td>
                                        <td><strong>{committee.name}</strong></td>
                                        <td>{committee.roleName}</td>
                                        <td>{committee.zoneName}</td>
                                        <td>{committee.mobile || '-'}</td>
                                        <td>{committee.whatsapp || '-'}</td>
                                        <td>
                                            <div className="action-buttons">
                                                <button
                                                    className="btn-edit"
                                                    onClick={() => handleEdit(committee)}
                                                    title="Edit"
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    className="btn-delete"
                                                    onClick={() => handleDelete(committee.committeeId)}
                                                    title="Delete"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <style>{`
        .committee-management {
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px;
        }

        .header-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .header-section h2 {
          margin: 0;
          color: var(--primary);
        }

        .form-card, .table-card {
          background: white;
          padding: 24px;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          margin-bottom: 24px;
        }

        .form-card h3, .table-card h3 {
          margin: 0 0 20px 0;
          color: #2c3e50;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          font-weight: 600;
          color: #555;
          font-size: 0.9rem;
        }

        .form-group input,
        .form-group select {
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 1rem;
          font-family: 'Anek Malayalam', sans-serif;
          transition: border-color 0.2s;
        }

        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: var(--primary);
        }

        .form-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 20px;
        }

        .btn-primary {
          padding: 10px 24px;
          background: var(--primary);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          font-family: 'Anek Malayalam', sans-serif;
          transition: all 0.2s;
        }

        .btn-primary:hover {
          background: var(--primary-dark);
          transform: translateY(-1px);
        }

        .btn-secondary {
          padding: 10px 24px;
          background: #6c757d;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          font-family: 'Anek Malayalam', sans-serif;
          transition: all 0.2s;
        }

        .btn-secondary:hover {
          background: #5a6268;
        }

        .filter-section {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
          padding: 16px;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .filter-section label {
          font-weight: 600;
          color: #555;
        }

        .zone-filter {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 1rem;
          min-width: 200px;
        }

        .table-responsive {
          overflow-x: auto;
        }

        .committee-table {
          width: 100%;
          border-collapse: collapse;
        }

        .committee-table th,
        .committee-table td {
          padding: 12px 16px;
          text-align: left;
          border-bottom: 1px solid #eee;
        }

        .committee-table th {
          background: #f8f9fa;
          font-weight: 600;
          color: #555;
          position: sticky;
          top: 0;
        }

        .committee-table tbody tr:hover {
          background: #f8f9fa;
        }

        .action-buttons {
          display: flex;
          gap: 8px;
        }

        .btn-edit,
        .btn-delete {
          padding: 6px 10px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 1rem;
          transition: all 0.2s;
        }

        .btn-edit {
          background: #e3f2fd;
        }

        .btn-edit:hover {
          background: #bbdefb;
          transform: scale(1.1);
        }

        .btn-delete {
          background: #ffebee;
        }

        .btn-delete:hover {
          background: #ffcdd2;
          transform: scale(1.1);
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #999;
          font-style: italic;
        }

        .error-message {
          background: #ffebee;
          color: #c62828;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 20px;
          border-left: 4px solid #c62828;
        }

        .loading-spinner {
          text-align: center;
          padding: 40px;
          font-size: 1.2rem;
          color: var(--primary);
        }

        @media (max-width: 768px) {
          .form-grid {
            grid-template-columns: 1fr;
          }

          .header-section {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .table-responsive {
            overflow-x: scroll;
          }
        }
      `}</style>
        </div>
    );
};

export default MemberManagement;
