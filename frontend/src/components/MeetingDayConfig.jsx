import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getToken } from '../services/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// One day-of-week setting: loads it, lets admin pick a day, saves it
const DaySetting = ({ settingKey, defaultDay, title, description, label, savedMessage }) => {
    const [day, setDay] = useState(defaultDay);
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
            const response = await axios.get(`${API_BASE_URL}/api/settings/${settingKey}`);
            if (response.data.success && response.data.value !== null) {
                setDay(response.data.value);
            }
        } catch (error) {
            console.error(`Error fetching ${settingKey}:`, error);
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
                { key: settingKey, value: parseInt(day) },
                { headers: { 'Authorization': `Bearer ${getToken()}` } }
            );
            if (response.data.success) {
                setMessage(`✅ ${savedMessage}`);
            }
        } catch (error) {
            setMessage('❌ Could not save. Try again.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="card" style={{ maxWidth: '600px', margin: '0 auto 24px', padding: '32px' }}>Loading...</div>;

    return (
            <div className="card" style={{ maxWidth: '600px', margin: '0 auto 24px', padding: '32px' }}>
                <h1 style={{ marginBottom: '8px' }}>{title}</h1>
                <p style={{ color: 'var(--gray-600)', marginBottom: '24px' }}>
                    {description}
                </p>

                <div className="form-group">
                    <label style={{ fontWeight: '700', display: 'block', marginBottom: '12px' }}>{label}</label>
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
                                    name={settingKey}
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
                        background: message.includes('✅') ? 'var(--paddy-wash)' : 'var(--rust-wash)',
                        color: message.includes('✅') ? 'var(--paddy)' : 'var(--rust)',
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
                        fontSize: '0.95rem'
                    }}
                >
                    {saving ? 'Saving...' : 'Save'}
                </button>
            </div>
    );
};

const MeetingDayConfig = () => (
    <div className="container">
        <DaySetting
            settingKey="reporting_week_start"
            defaultDay={0}
            title="റിപ്പോർട്ടിംഗ് ആഴ്ച"
            description="The day each reporting week starts. Dashboard, Reports and QHLS show this week and last week from this day for seven days."
            label="റിപ്പോർട്ടിംഗ് ആഴ്ച തുടങ്ങുന്ന ദിവസം:"
            savedMessage="Reporting week updated"
        />
        <DaySetting
            settingKey="district_meeting_day"
            defaultDay={3}
            title="Edit District Meeting Day"
            description="The day the district meeting is held."
            label="Select Meeting Day:"
            savedMessage="Meeting day updated successfully!"
        />
    </div>
);

export default MeetingDayConfig;
