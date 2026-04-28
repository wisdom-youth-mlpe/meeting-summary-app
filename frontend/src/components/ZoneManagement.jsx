import React, { useState, useEffect } from 'react';
import { getZones } from '../services/api';
import { getToken } from '../services/auth';

const ZoneManagement = () => {
    const [zones, setZones] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [editingZone, setEditingZone] = useState(null);
    const [formData, setFormData] = useState({
        zoneId: '',
        name: '',
        districtId: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const token = getToken();
            const [zonesData, distResponse] = await Promise.all([
                getZones(),
                fetch('/api/districts', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }).then(res => res.json())
            ]);

            if (zonesData.success) setZones(zonesData.zones);
            if (distResponse.success) setDistricts(distResponse.districts || [{ districtId: 'D001', name: 'Malappuram East' }]);
            setError(null);
        } catch (err) {
            setError('Failed to load data: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = getToken();
            const url = editingZone ? `/api/zones/${editingZone.id}` : '/api/zones';
            const method = editingZone ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            if (data.success) {
                alert(editingZone ? 'Zone updated!' : 'Zone created!');
                resetForm();
                loadData();
            } else {
                alert('Error: ' + data.error);
            }
        } catch (err) {
            alert('Operation failed: ' + err.message);
        }
    };

    const handleEdit = (zone) => {
        setEditingZone(zone);
        setFormData({
            zoneId: zone.id,
            name: zone.name,
            districtId: zone.districtId || 'D001'
        });
        setShowForm(true);
    };

    const handleDelete = async (zoneId, zoneName) => {
        if (!confirm(`Delete zone "${zoneName}"?`)) return;
        try {
            const token = getToken();
            const response = await fetch(`/api/zones/${zoneId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                alert('Zone deleted');
                loadData();
            } else {
                alert('Error: ' + data.error);
            }
        } catch (err) {
            alert('Delete failed: ' + err.message);
        }
    };

    const resetForm = () => {
        setFormData({ zoneId: '', name: '', districtId: '' });
        setEditingZone(null);
        setShowForm(false);
    };

    if (loading) return <div className="loading-spinner">ലോഡ് ചെയ്യുന്നു...</div>;

    return (
        <div className="container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1>Zone Management</h1>
                <button 
                    className="btn btn-primary" 
                    onClick={() => { showForm ? resetForm() : setShowForm(true); }}
                >
                    {showForm ? 'Cancel' : '+ Add Zone'}
                </button>
            </div>

            {error && <div className="error">{error}</div>}

            {showForm && (
                <div className="card" style={{ marginBottom: '24px', padding: '24px' }}>
                    <h3 style={{ marginTop: 0 }}>{editingZone ? 'Edit Zone' : 'Add New Zone'}</h3>
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                            <div className="form-group">
                                <label>Zone ID (e.g. Z001)</label>
                                <input 
                                    type="text" 
                                    name="zoneId" 
                                    value={formData.zoneId} 
                                    onChange={handleInputChange} 
                                    required 
                                    disabled={!!editingZone}
                                />
                            </div>
                            <div className="form-group">
                                <label>Zone Name</label>
                                <input 
                                    type="text" 
                                    name="name" 
                                    value={formData.name} 
                                    onChange={handleInputChange} 
                                    required 
                                />
                            </div>
                            <div className="form-group">
                                <label>District</label>
                                <select 
                                    name="districtId" 
                                    value={formData.districtId} 
                                    onChange={handleInputChange} 
                                    required
                                >
                                    <option value="">Select District</option>
                                    {districts.map(d => (
                                        <option key={d.districtId} value={d.districtId}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button type="submit" className="btn btn-primary">
                                {editingZone ? 'Update' : 'Create'} Zone
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={resetForm}>
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: 'var(--gray-100)', textAlign: 'left' }}>
                            <th style={{ padding: '12px 20px' }}>ID</th>
                            <th style={{ padding: '12px 20px' }}>Name</th>
                            <th style={{ padding: '12px 20px' }}>District</th>
                            <th style={{ padding: '12px 20px', textAlign: 'center' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {zones.map(zone => (
                            <tr key={zone.id} style={{ borderTop: '1px solid var(--gray-100)' }}>
                                <td style={{ padding: '12px 20px' }}>{zone.id}</td>
                                <td style={{ padding: '12px 20px', fontWeight: '600' }}>{zone.name}</td>
                                <td style={{ padding: '12px 20px' }}>{zone.districtId}</td>
                                <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                                    <button 
                                        className="btn btn-secondary" 
                                        style={{ padding: '4px 12px', marginRight: '8px' }}
                                        onClick={() => handleEdit(zone)}
                                    >
                                        Edit
                                    </button>
                                    <button 
                                        className="btn btn-danger" 
                                        style={{ padding: '4px 12px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px' }}
                                        onClick={() => handleDelete(zone.id, zone.name)}
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ZoneManagement;
