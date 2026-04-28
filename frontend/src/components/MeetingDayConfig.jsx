import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getToken } from '../services/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const MeetingDayConfig = () => {
    const [day, setDay] = useState(3); // Default to Wednesday
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    const days = [
        { value: 0, name: 'Sunday (ഞായർ)' },
        { value: 1, name: 'Monday (തിങ്കൾ)' },
        { value: 2, name: 'Tuesday (ചൊവ്വ)' },
        { value: 3, name: 'Wednesday (ബുധൻ)' },
        { value: 4, name: 'Thursday (വ്യാഴം)' },
        { value: 5, name: 'Friday (വെള്ളി)' },
        { value: 6, name: 'Saturday (ശനി)' }
    ];

    useEffect(() => {
        fetchDay();
    }, []);

    const fetchDay = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/settings/district_meeting_day`);
            if (response.data.success && response.data.value !== null) {
                setDay(response.data.value);
            }
        } catch (error) {
            console.error('Error fetching meeting day:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage('');
        try {
            const response = await axios.post(
                `${API_BASE_URL}/api/settings`,
                { key: 'district_meeting_day', value: parseInt(day) },
                { headers: { 'Authorization': `Bearer ${getToken()}` } }
            );
            if (response.data.success) {
                setMessage('✅ Meeting day updated successfully!');
            }
        } catch (error) {
            setMessage('❌ Error updating meeting day');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="container">Loading...</div>;

    return (
        <div className="container">
            <div className="card" style={{ maxWidth: '600px', margin: '0 auto', padding: '32px' }}>
                <h1 style={{ marginBottom: '8px' }}>Edit District Meeting Day</h1>
                <p style={{ color: 'var(--gray-600)', marginBottom: '24px' }}>
                    This setting defines the start of the weekly reporting cycle. The dashboard will use this day to calculate "This Week".
                </p>

                <div className="form-group">
                    <label style={{ fontWeight: '700', display: 'block', marginBottom: '12px' }}>Select Meeting Day:</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {days.map((d) => (
                            <label key={d.value} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '12px 16px',
                                background: day === d.value ? 'var(--primary-light)' : 'var(--gray-50)',
                                border: day === d.value ? '2px solid var(--primary)' : '1px solid var(--gray-200)',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}>
                                <input
                                    type="radio"
                                    name="meetingDay"
                                    value={d.value}
                                    checked={day === d.value}
                                    onChange={(e) => setDay(parseInt(e.target.value))}
                                    style={{ width: '18px', height: '18px' }}
                                />
                                <span style={{ 
                                    fontWeight: day === d.value ? '700' : '500',
                                    color: day === d.value ? 'var(--primary)' : 'inherit'
                                }}>{d.name}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {message && (
                    <div style={{ 
                        marginTop: '20px', 
                        padding: '12px', 
                        borderRadius: '8px', 
                        background: message.includes('✅') ? '#e6fffa' : '#fff5f5',
                        color: message.includes('✅') ? '#2c7a7b' : '#c53030',
                        fontWeight: '600',
                        textAlign: 'center'
                    }}>
                        {message}
                    </div>
                )}

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn btn-primary"
                    style={{ 
                        marginTop: '32px', 
                        width: '100%', 
                        padding: '16px',
                        fontSize: '1rem'
                    }}
                >
                    {saving ? 'Saving...' : 'Save Settings'}
                </button>
            </div>
        </div>
    );
};

export default MeetingDayConfig;
