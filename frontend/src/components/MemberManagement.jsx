import React, { useState, useEffect } from 'react';
import { getUser, hasRole, getToken } from '../services/auth';

const MemberManagement = () => {
    const [committees, setCommittees] = useState([]);
    const [roles, setRoles] = useState([]);
    const [zones, setZones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [editingCommittee, setEditingCommittee] = useState(null);
    const [selectedZoneFilter, setSelectedZoneFilter] = useState('All');
    const [selectedRoleFilter, setSelectedRoleFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        roleId: '',
        zoneId: '',
        mobile: '',
        whatsapp: '',
    });

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        loadCommittees();
    }, [selectedZoneFilter]);

    const loadInitialData = async () => {
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
            const token = getToken();
            if (!token) return;
            const queryParam = selectedZoneFilter !== 'All' ? `?zoneId=${selectedZoneFilter}` : '';
            const response = await fetch(`/api/committees${queryParam}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            const data = await response.json();
            if (data.success) {
                setCommittees(data.committees || []);
            } else {
                console.error('Failed to load committees:', data.error || data.message);
            }
        } catch (err) {
            console.error('Failed to load committees:', err);
        }
    };

    const loadRoles = async () => {
        try {
            const token = getToken();
            if (!token) return;
            const response = await fetch('/api/committee-roles', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            const data = await response.json();
            if (data.success) {
                setRoles(data.roles || []);
            }
        } catch (err) {
            console.error('Failed to load roles:', err);
        }
    };

    const loadZones = async () => {
        try {
            const token = getToken();
            if (!token) return;
            const response = await fetch('/api/zones', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            const data = await response.json();
            if (data.success) {
                setZones(data.zones || []);
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
            const token = getToken();
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
                alert('Error: ' + (data.message || data.error));
            }
        } catch (err) {
            alert('Failed to save member: ' + err.message);
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
        // Scroll to top so user can see the form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (committeeId, memberName) => {
        if (!confirm(`"${memberName}" - ഡിലീറ്റ് ചെയ്യുക?`)) {
            return;
        }

        try {
            const token = getToken();
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
                alert('Error: ' + (data.message || data.error));
            }
        } catch (err) {
            alert('Failed to delete member: ' + err.message);
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

    // Apply client-side role filter and search
    const filteredCommittees = committees.filter(c => {
        const matchesRole = selectedRoleFilter === 'All' || c.roleId === selectedRoleFilter;
        const matchesSearch = !searchQuery || 
            (c.name && c.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (c.mobile && c.mobile.includes(searchQuery)) ||
            (c.zoneName && c.zoneName.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesRole && matchesSearch;
    });

    // Get role name helper
    const getRoleName = (roleId) => {
        const role = roles.find(r => r.roleId === roleId);
        return role ? `${role.name} (${role.englishName})` : roleId;
    };

    if (loading) {
        return <div className="loading-spinner">ലോഡ് ചെയ്യുന്നു...</div>;
    }

    return (
        <div className="member-management">
            <div className="header-section">
                <h2>മെമ്പേഴ്സ് മാനേജ്മെന്റ്</h2>
                <button
                    className="btn-primary"
                    onClick={() => { showForm ? resetForm() : setShowForm(true); }}
                >
                    {showForm ? '✕ Cancel' : '+ Add Member'}
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            {showForm && (
                <div className="form-card">
                    <h3>{editingCommittee ? '✏️ Edit Member' : '➕ Add New Member'}</h3>
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

            {/* Filters Section */}
            <div className="filter-section">
                <div className="filter-group">
                    <label>Zone:</label>
                    <select
                        value={selectedZoneFilter}
                        onChange={(e) => setSelectedZoneFilter(e.target.value)}
                        className="filter-select"
                    >
                        <option value="All">All Zones</option>
                        {zones.map(zone => (
                            <option key={zone.id} value={zone.id}>
                                {zone.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label>Role:</label>
                    <select
                        value={selectedRoleFilter}
                        onChange={(e) => setSelectedRoleFilter(e.target.value)}
                        className="filter-select"
                    >
                        <option value="All">All Roles</option>
                        {roles.map(role => (
                            <option key={role.roleId} value={role.roleId}>
                                {role.name} ({role.englishName})
                            </option>
                        ))}
                    </select>
                </div>

                <div className="filter-group search-group">
                    <label>Search:</label>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="filter-select"
                        placeholder="Search name, mobile, zone..."
                    />
                </div>
            </div>

            {/* Summary Badges */}
            <div className="summary-badges">
                <span className="badge badge-total">Total: {filteredCommittees.length}</span>
                {selectedZoneFilter !== 'All' && (
                    <span className="badge badge-zone">
                        Zone: {zones.find(z => z.id === selectedZoneFilter)?.name || selectedZoneFilter}
                    </span>
                )}
                {selectedRoleFilter !== 'All' && (
                    <span className="badge badge-role">
                        Role: {getRoleName(selectedRoleFilter)}
                    </span>
                )}
            </div>

            {/* Members Table */}
            <div className="table-card">
                <div className="table-responsive">
                    <table className="member-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Name</th>
                                <th>Role</th>
                                <th>Zone</th>
                                <th>Mobile</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCommittees.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="empty-state">
                                        No members found
                                    </td>
                                </tr>
                            ) : (
                                filteredCommittees.map((committee, index) => (
                                    <tr key={committee.committeeId}>
                                        <td className="td-index">{index + 1}</td>
                                        <td>
                                            <div className="member-name">{committee.name}</div>
                                            {committee.mobile && (
                                                <div className="member-mobile">📱 {committee.mobile}</div>
                                            )}
                                        </td>
                                        <td>
                                            <span className="role-badge">{committee.roleName || committee.roleId}</span>
                                        </td>
                                        <td>
                                            <span className="zone-badge">{committee.zoneName || committee.zoneId}</span>
                                        </td>
                                        <td className="td-mobile">{committee.mobile || '-'}</td>
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
                                                    onClick={() => handleDelete(committee.committeeId, committee.name)}
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
        .member-management {
          max-width: 1400px;
          margin: 0 auto;
          padding: 16px;
        }

        .header-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .header-section h2 {
          margin: 0;
          color: var(--primary);
          font-size: 1.4rem;
        }

        .form-card, .table-card {
          background: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          margin-bottom: 20px;
        }

        .form-card h3 {
          margin: 0 0 16px 0;
          color: #2c3e50;
          font-size: 1.1rem;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
          margin-bottom: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-weight: 600;
          color: #555;
          font-size: 0.85rem;
        }

        .form-group input,
        .form-group select {
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 0.95rem;
          font-family: 'Anek Malayalam', sans-serif;
          transition: border-color 0.2s;
        }

        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(var(--primary-rgb, 46, 125, 50), 0.1);
        }

        .form-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
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
          font-size: 0.9rem;
        }

        .btn-primary:hover {
          opacity: 0.9;
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
          font-size: 0.9rem;
        }

        .btn-secondary:hover {
          background: #5a6268;
        }

        /* Filter Section */
        .filter-section {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-end;
          gap: 16px;
          margin-bottom: 16px;
          padding: 16px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 160px;
        }

        .filter-group label {
          font-weight: 600;
          color: #777;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .filter-select {
          padding: 8px 12px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          font-size: 0.9rem;
          font-family: 'Anek Malayalam', sans-serif;
          background: #fafafa;
          transition: border-color 0.2s;
        }

        .filter-select:focus {
          outline: none;
          border-color: var(--primary);
          background: white;
        }

        .search-group {
          flex: 1;
          min-width: 200px;
        }

        /* Summary Badges */
        .summary-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 12px;
        }

        .badge {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .badge-total {
          background: #e8f5e9;
          color: #2e7d32;
        }

        .badge-zone {
          background: #e3f2fd;
          color: #1565c0;
        }

        .badge-role {
          background: #fff3e0;
          color: #e65100;
        }

        /* Table */
        .table-responsive {
          overflow-x: auto;
        }

        .member-table {
          width: 100%;
          border-collapse: collapse;
        }

        .member-table th,
        .member-table td {
          padding: 10px 12px;
          text-align: left;
          border-bottom: 1px solid #f0f0f0;
        }

        .member-table th {
          background: #f8f9fa;
          font-weight: 600;
          color: #666;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          position: sticky;
          top: 0;
        }

        .member-table tbody tr:hover {
          background: #f5f9f5;
        }

        .td-index {
          color: #aaa;
          font-size: 0.85rem;
          min-width: 30px;
        }

        .member-name {
          font-weight: 600;
          color: #333;
        }

        .member-mobile {
          font-size: 0.8rem;
          color: #999;
          margin-top: 2px;
        }

        .role-badge {
          display: inline-block;
          padding: 3px 10px;
          background: #f3e5f5;
          color: #7b1fa2;
          border-radius: 12px;
          font-size: 0.82rem;
          font-weight: 500;
        }

        .zone-badge {
          display: inline-block;
          padding: 3px 10px;
          background: #e8f5e9;
          color: #2e7d32;
          border-radius: 12px;
          font-size: 0.82rem;
          font-weight: 500;
        }

        .td-mobile {
          font-size: 0.9rem;
          color: #555;
        }

        .action-buttons {
          display: flex;
          gap: 6px;
        }

        .btn-edit,
        .btn-delete {
          padding: 5px 8px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9rem;
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
          margin-bottom: 16px;
          border-left: 4px solid #c62828;
        }

        .loading-spinner {
          text-align: center;
          padding: 40px;
          font-size: 1.2rem;
          color: var(--primary);
        }

        @media (max-width: 768px) {
          .member-management {
            padding: 10px;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .header-section {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .filter-section {
            flex-direction: column;
            align-items: stretch;
          }

          .filter-group {
            min-width: unset;
          }

          .td-mobile {
            display: none;
          }

          .member-table th:nth-child(5),
          .member-table td:nth-child(5) {
            display: none;
          }
        }
      `}</style>
        </div>
    );
};

export default MemberManagement;
