import React, { useState, useEffect, useRef } from 'react';
import './QHLSDashboard.css';
import api from '../services/api';

// Order and wording of the status groups shown under each zone
const GROUPS = [
    { key: 'held', label: 'നടന്നു', tone: 'held' },
    { key: 'notHeld', label: 'നടന്നിട്ടില്ല', tone: 'not-held' },
    { key: 'noQhls', label: 'QHLS ഇല്ല', tone: 'no-qhls' },
    { key: 'notReported', label: 'റിപ്പോർട്ട് ചെയ്തിട്ടില്ല', tone: 'not-reported' },
];

function QHLSDashboard() {
    const [weekOffset, setWeekOffset] = useState(0);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [zoneFilter, setZoneFilter] = useState('');
    const latestRequestRef = useRef(0);

    useEffect(() => {
        fetchWeekStatus();
    }, [weekOffset]);

    async function fetchWeekStatus() {
        // Only the newest request may update the screen when weeks are switched quickly
        const requestId = ++latestRequestRef.current;
        setLoading(true);
        setError('');

        try {
            const response = await api.get(`/api/qhls/week-status?weekOffset=${weekOffset}`);
            if (requestId !== latestRequestRef.current) return;
            if (response.data.success) {
                setData(response.data.data);
            } else {
                setError(response.data.error || 'Failed to load data');
            }
        } catch (err) {
            if (requestId !== latestRequestRef.current) return;
            setError(err.response?.data?.error || 'Failed to load data. Please refresh.');
            console.error('Error fetching QHLS week status:', err);
        } finally {
            if (requestId === latestRequestRef.current) setLoading(false);
        }
    }

    const formatDate = (key) =>
        new Date(`${key}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

    const zones = (data?.zones || []).filter(z => !zoneFilter || z.zone === zoneFilter);

    return (
        <div className="qhls-dashboard">
            <header className="qhls-header">
                <h1>QHLS Dashboard</h1>
                <div className="week-selector">
                    <select
                        value={weekOffset}
                        onChange={(e) => setWeekOffset(parseInt(e.target.value))}
                        aria-label="Week"
                    >
                        <option value="0">Current Week</option>
                        <option value="-1">Previous Week</option>
                        <option value="-2">2 Weeks Ago</option>
                        <option value="-3">3 Weeks Ago</option>
                    </select>
                </div>
            </header>

            {data && (
                <div className="week-subtitle nums">
                    {formatDate(data.weekStart)} - {formatDate(data.weekEnd)}
                </div>
            )}

            {error && <div className="qhls-error">{error}</div>}

            {loading && !data && <div className="qhls-loading">Loading...</div>}

            {data && (
                <>
                    <div className="qhls-summary">
                        {GROUPS.map(group => (
                            <div key={group.key} className={`qhls-summary-tile ${group.tone}`}>
                                <span className="qhls-summary-value nums">{data.totals[group.key]}</span>
                                <span className="qhls-summary-label">{group.label}</span>
                            </div>
                        ))}
                    </div>

                    <div className="qhls-actions-bar">
                        <select
                            aria-label="മണ്ഡലം"
                            className="qhls-zone-filter"
                            value={zoneFilter}
                            onChange={(e) => setZoneFilter(e.target.value)}
                        >
                            <option value="">എല്ലാ മണ്ഡലങ്ങളും</option>
                            {data.zones.map(z => (
                                <option key={z.zone} value={z.zone}>{z.zone}</option>
                            ))}
                        </select>
                        <button onClick={fetchWeekStatus} className="qhls-refresh-btn" disabled={loading} aria-label="Refresh">
                            {loading ? '...' : (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <polyline points="23 4 23 10 17 10" />
                                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                                </svg>
                            )}
                        </button>
                    </div>

                    <div className="qhls-zone-list">
                        {zones.map(zone => (
                            <details key={zone.zone} className="collapsible qhls-zone" open={Boolean(zone.meetingDate)}>
                                <summary>
                                    <span className="qhls-zone-title">
                                        <span className="qhls-zone-name">{zone.zone}</span>
                                        <span className="qhls-zone-meta nums">
                                            {zone.meetingDate
                                                ? `${zone.held.length} / ${zone.held.length + zone.notHeld.length + zone.notReported.length} നടന്നു`
                                                : 'മീറ്റിംഗ് റിപ്പോർട്ട് ഇല്ല'}
                                        </span>
                                    </span>
                                    <svg className="chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <polyline points="6 9 12 15 18 9" />
                                    </svg>
                                </summary>
                                <div className="collapsible-body qhls-zone-body">
                                    {GROUPS.filter(group => zone[group.key].length > 0).map(group => (
                                        <div key={group.key} className="qhls-group">
                                            <span className={`qhls-group-label ${group.tone}`}>
                                                {group.label} <span className="nums">({zone[group.key].length})</span>
                                            </span>
                                            <div className="qhls-chips">
                                                {zone[group.key].map(unit => (
                                                    <span key={unit} className={`qhls-chip ${group.tone}`}>{unit}</span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    {GROUPS.every(group => zone[group.key].length === 0) && (
                                        <div className="qhls-empty-state">യൂണിറ്റുകൾ ഇല്ല</div>
                                    )}
                                </div>
                            </details>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

export default QHLSDashboard;
