import React, { useState, useEffect } from 'react';
import './QHLSDashboard.css';
import api from '../services/api';

function QHLSDashboard() {
    const [weekOffset, setWeekOffset] = useState(0);
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Filter and view state
    const [zoneFilter, setZoneFilter] = useState('');
    const [activeTab, setActiveTab] = useState('responses'); // 'responses' or 'missing'
    const [expandedZones, setExpandedZones] = useState({}); // Tracking expanded zones

    // Fetch dashboard data
    useEffect(() => {
        fetchDashboardData();
    }, [weekOffset]);

    async function fetchDashboardData() {
        setLoading(true);
        setError('');

        try {
            const response = await api.get(`/api/qhls/dashboard?weekOffset=${weekOffset}`);
            
            if (response.data.success) {
                setDashboardData(response.data.data);
            } else {
                setError(response.data.error || 'Failed to load data');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load data. Please refresh.');
            console.error('Error fetching QHLS dashboard:', err);
        } finally {
            setLoading(false);
        }
    }

    // Get unique zones for filter
    const uniqueZones = dashboardData?.responses
        ? [...new Set(dashboardData.responses.map(r => r.zone))].sort()
        : [];

    // Filter responses by zone
    const filteredResponses = zoneFilter && dashboardData?.responses
        ? dashboardData.responses.filter(r => r.zone === zoneFilter)
        : dashboardData?.responses || [];

    // Format date range
    const formatDateRange = () => {
        if (!dashboardData) return '';
        const start = new Date(dashboardData.weekStart).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        const end = new Date(dashboardData.weekEnd).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        return `${start} - ${end}`;
    };

    return (
        <div className="qhls-dashboard">
            <header className="qhls-header">
                <h1>QHLS Dashboard</h1>
                <div className="week-selector">
                    <select
                        value={weekOffset}
                        onChange={(e) => setWeekOffset(parseInt(e.target.value))}
                    >
                        <option value="0">Current Week</option>
                        <option value="-1">Previous Week</option>
                        <option value="-2">2 Weeks Ago</option>
                        <option value="-3">3 Weeks Ago</option>
                    </select>
                </div>
            </header>

            {error && <div className="qhls-error">{error}</div>}

            {loading && <div className="qhls-loading">Loading...</div>}

            {!loading && dashboardData && (
                <>
                    {/* Week Info */}
                    <div style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center' }}>
                        {formatDateRange()}
                    </div>

                    {/* Stats Cards */}
                    {dashboardData.stats && (
                        <div className="qhls-stats-grid">
                            <div className="qhls-stat-card">
                                <div className="qhls-stat-value">{dashboardData.stats.totalResponses}</div>
                                <div className="qhls-stat-label">യൂണിറ്റുകൾ</div>
                            </div>
                            <div className="qhls-stat-card">
                                <div className="qhls-stat-value">{dashboardData.stats.totalMales}</div>
                                <div className="qhls-stat-label">പുരുഷന്മാർ</div>
                            </div>
                            <div className="qhls-stat-card">
                                <div className="qhls-stat-value">{dashboardData.stats.totalFemales}</div>
                                <div className="qhls-stat-label">സ്ത്രീകൾ</div>
                            </div>
                            <div className="qhls-stat-card highlight">
                                <div className="qhls-stat-value">{dashboardData.stats.totalParticipants}</div>
                                <div className="qhls-stat-label">ആകെ പങ്കാളികൾ</div>
                            </div>
                        </div>
                    )}

                    {/* Missing Units Summary */}
                    {dashboardData.missing && (
                        <div className="qhls-missing-summary">
                            <span className="qhls-missing-count">{dashboardData.missing.totalMissing}</span>
                            <span className="qhls-missing-text">/{dashboardData.missing.totalUnits} ശാഖകൾ QHLS റിപ്പോർട്ട് ചെയ്തിട്ടില്ല</span>
                        </div>
                    )}

                    {/* Tab Navigation */}
                    <div className="qhls-tab-nav">
                        <button
                            className={`qhls-tab-btn ${activeTab === 'responses' ? 'active' : ''}`}
                            onClick={() => setActiveTab('responses')}
                        >
                            QHLS ഉള്ളവ ({dashboardData.responses.filter(r => r.hasQhls).length})
                        </button>
                        <button
                            className={`qhls-tab-btn ${activeTab === 'missing' ? 'active' : ''}`}
                            onClick={() => setActiveTab('missing')}
                        >
                            QHLS ഇല്ലാത്തവ ({dashboardData.missing?.totalMissing || 0})
                        </button>
                    </div>

                    {/* Responses Tab */}
                    {activeTab === 'responses' && (
                        <>
                            {/* Filter and Refresh Bar */}
                            <div className="qhls-actions-bar">
                                <select
                                    className="qhls-zone-filter"
                                    value={zoneFilter}
                                    onChange={(e) => setZoneFilter(e.target.value)}
                                >
                                    <option value="">എല്ലാ മണ്ഡലങ്ങളും</option>
                                    {uniqueZones.map(zone => (
                                        <option key={zone} value={zone}>{zone}</option>
                                    ))}
                                </select>
                                <button onClick={fetchDashboardData} className="qhls-refresh-btn" disabled={loading}>
                                    {loading ? '...' : '🔄'}
                                </button>
                            </div>

                            {/* Response Groups by Zone */}
                            <div className="qhls-cards-container">
                                {(!dashboardData?.groupedResponses || Object.keys(dashboardData.groupedResponses).length === 0) ? (
                                    <div className="qhls-empty-state">
                                        {loading ? 'Loading...' : 'No QHLS data available'}
                                    </div>
                                ) : (
                                    Object.entries(dashboardData.groupedResponses)
                                        .filter(([zone]) => !zoneFilter || zone === zoneFilter)
                                        .map(([zone, units]) => (
                                            <div key={zone} className="qhls-zone-group">
                                                <div 
                                                    className={`qhls-zone-header-card ${expandedZones[zone] ? 'expanded' : ''}`}
                                                    onClick={() => setExpandedZones(prev => ({ ...prev, [zone]: !prev[zone] }))}
                                                >
                                                    <div className="qhls-zone-info">
                                                        <span className="qhls-zone-name">{zone}</span>
                                                        <span className="qhls-zone-count">{units.length} ശാഖകൾ</span>
                                                    </div>
                                                    <div className="qhls-zone-toggle">
                                                        {expandedZones[zone] ? '🔼' : '🔽'}
                                                    </div>
                                                </div>

                                                {expandedZones[zone] && (
                                                    <div className="qhls-units-grid">
                                                        {units.map((row, idx) => (
                                                            <div key={idx} className="qhls-unit-row-card">
                                                                <div className="qhls-unit-top">
                                                                    <div className="qhls-unit-name">{row.unit}</div>
                                                                    <div className="qhls-unit-date">📅 {row.date} ({row.day})</div>
                                                                </div>
                                                                
                                                                <div className="qhls-metrics-grid">
                                                                    <div className="qhls-metric">
                                                                        <div className="qhls-metric-label">പുരുഷൻ</div>
                                                                        <div className="qhls-metric-row">
                                                                            <span className="qhls-metric-value">{row.male}</span>
                                                                            <VariationBadge val={row.variation?.male} isFirst={row.variation?.isFirst} />
                                                                        </div>
                                                                    </div>
                                                                    <div className="qhls-metric">
                                                                        <div className="qhls-metric-label">സ്ത്രീ</div>
                                                                        <div className="qhls-metric-row">
                                                                            <span className="qhls-metric-value">{row.female}</span>
                                                                            <VariationBadge val={row.variation?.female} isFirst={row.variation?.isFirst} />
                                                                        </div>
                                                                    </div>
                                                                    <div className="qhls-metric total">
                                                                        <div className="qhls-metric-label">ആകെ</div>
                                                                        <div className="qhls-metric-row">
                                                                            <span className="qhls-metric-value">{row.male + row.female}</span>
                                                                            <VariationBadge val={row.variation?.total} isFirst={row.variation?.isFirst} />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                )}
                            </div>
                        </>
                    )}

                    {/* Missing Units Tab */}
                    {activeTab === 'missing' && dashboardData.missing && (
                        <div className="qhls-missing-container">
                            {Object.keys(dashboardData.missing.byZone).length === 0 ? (
                                <div className="qhls-empty-state success">
                                    🎉 എല്ലാ ശാഖകളും QHLS റിപ്പോർട്ട് ചെയ്തു!
                                </div>
                            ) : (
                                Object.entries(dashboardData.missing.byZone).map(([zone, units]) => (
                                    <div key={zone} className="qhls-missing-zone-card">
                                        <div className="qhls-missing-zone-header">
                                            <span className="qhls-missing-zone-name">{zone}</span>
                                            <span className="qhls-missing-zone-count">{units.length} ശാഖകൾ</span>
                                        </div>
                                        <div className="qhls-missing-units-list">
                                            {units.map((unit, idx) => (
                                                <div key={idx} className="qhls-missing-unit-item">
                                                    {unit}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

function VariationBadge({ val, isFirst }) {
    if (isFirst) return <span className="qhls-variation first">+</span>;
    if (val === null || val === undefined || val === 0) return null;
    
    const isPositive = val > 0;
    return (
        <span className={`qhls-variation ${isPositive ? 'positive' : 'negative'}`}>
            {isPositive ? '+' : ''}{val}
        </span>
    );
}

export default QHLSDashboard;
