import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats, getZones, getMeetingReport } from '../services/api';
import { getUser, hasRole } from '../services/auth';
import AttendanceSummary from './AttendanceSummary';

const Dashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filters
    const [selectedZone, setSelectedZone] = useState('All');
    const [zonesList, setZonesList] = useState([]);
    const [dateFilter, setDateFilter] = useState('week'); // week, month, custom
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [viewMode, setViewMode] = useState('dashboard'); // 'dashboard', 'attendance_sheet', 'attendance_summary'
    const [selectedReport, setSelectedReport] = useState(null);
    const [selectedMeetingData, setSelectedMeetingData] = useState(null);
    const [reportLoading, setReportLoading] = useState(false);

    useEffect(() => {
        loadZones();
        initializeDates('week');
    }, []);

    useEffect(() => {
        if (startDate && endDate) {
            fetchStats();
        }
    }, [selectedZone, startDate, endDate]);

    // Reset view mode when zone changes to 'All' while in attendance_summary view
    useEffect(() => {
        if ((!selectedZone || selectedZone === 'All') && viewMode === 'attendance_summary') {
            setViewMode('dashboard');
        }
    }, [selectedZone, viewMode]);

    const loadZones = async () => {
        try {
            const user = getUser();
            // If district_admin (not admin), filter by districtAccess
            const isDistrictAdmin = hasRole('district_admin', user) && !hasRole('admin', user);
            const districts = isDistrictAdmin ? user.districtAccess?.join(',') : null;

            const response = await getZones(districts);
            if (response.success) {
                setZonesList(response.zones.map(z => z.name));
            }
        } catch (e) {
            console.error("Failed to load zones", e);
        }
    };

    const initializeDates = (filterType) => {
        const today = new Date();
        let start = new Date();
        let end = new Date();

        if (filterType === 'week') {
            // Week runs Wednesday → Tuesday
            // day: 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat
            const day = today.getDay();
            // days since last Wednesday: Wed=0,Thu=1,Fri=2,Sat=3,Sun=4,Mon=5,Tue=6
            const daysSinceWed = (day + 4) % 7;
            start.setDate(today.getDate() - daysSinceWed);
        } else if (filterType === 'month') {
            start.setDate(1); // 1st of month
        } else if (filterType === 'custom') {
            // Keep existing or default to month
            return;
        }

        const formatDate = (d) => d.toISOString().split('T')[0];
        setStartDate(formatDate(start));
        setEndDate(formatDate(end));
    };

    const handleDateFilterChange = (filter) => {
        setDateFilter(filter);
        if (filter !== 'custom') {
            initializeDates(filter);
        }
    };

    const fetchStats = async () => {
        setLoading(true);
        try {
            const response = await getDashboardStats(startDate, endDate, selectedZone);
            if (response.success) {
                setStats(response.data);
                setError(null);
            } else {
                setError('Failed to fetch data');
            }
        } catch (err) {
            setError(err.message || 'Error fetching dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const handleViewReport = async (meetingId) => {
        setReportLoading(true);
        try {
            const response = await getMeetingReport(meetingId);
            if (response.success) {
                setSelectedMeetingData(response.meetingData);
                setSelectedReport(response.report);
                setViewMode('report_view');
            } else {
                alert('റിപ്പോർട്ട് ലഭിക്കുന്നതിൽ പിശക്');
            }
        } catch (err) {
            alert('റിപ്പോർട്ട് ലഭിക്കുന്നതിൽ പിശക്: ' + err.message);
        } finally {
            setReportLoading(false);
        }
    };

    const handlePrintReport = () => {
        window.print();
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // --- Renderers ---

    const renderControls = () => (
        <div className="dashboard-controls card">
            <div className="control-group">
                <label>Date Range:</label>
                <div className="btn-group">
                    <button
                        className={dateFilter === 'week' ? 'active' : ''}
                        onClick={() => handleDateFilterChange('week')}
                    >This Week</button>
                    <button
                        className={dateFilter === 'month' ? 'active' : ''}
                        onClick={() => handleDateFilterChange('month')}
                    >This Month</button>
                    <button
                        className={dateFilter === 'custom' ? 'active' : ''}
                        onClick={() => handleDateFilterChange('custom')}
                    >Custom</button>
                </div>
            </div>

            {dateFilter === 'custom' && (
                <div className="control-group dates">
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                    <span>to</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                    />
                </div>
            )}

            <div className="control-group">
                <label>Zone:</label>
                <select
                    value={selectedZone}
                    onChange={(e) => setSelectedZone(e.target.value)}
                    className="zone-select"
                >
                    <option value="All">All Zones</option>
                    {zonesList.map(z => <option key={z} value={z}>{z}</option>)}
                </select>
            </div>

            <div className="control-group right">
                <button className="refresh-btn" onClick={fetchStats}>Refresh</button>
            </div>
        </div>
    );

    const renderOverview = () => {
        if (!stats) return null;

        const { totalMeetings, totalMembers, attendanceRegister, noMeetingZones, zonesWithMeetings, consecutiveAbsence, latestLeaves, qhlsMissingBranches, currentWeek, meetingsList } = stats;

        // Calculate Overall Pct
        let totalPresent = 0;
        let grandTotal = 0;
        attendanceRegister.forEach(p => {
            totalPresent += p.present;
            grandTotal += p.total;
        });
        const overallPct = grandTotal > 0 ? ((totalPresent / grandTotal) * 100).toFixed(1) : 0;

        // Time period label based on filter
        const periodLabel = dateFilter === 'month' ? 'ഈ മാസം' : 'ഈ ആഴ്ച';

        // All Zones View - Show simplified dashboard
        if (selectedZone === 'All') {
            return (
                <div className="dashboard-grid">
                    {/* Zones WITHOUT meetings */}
                    <div className="card full-width">
                        <h3>{periodLabel} മീറ്റിംഗ് നടക്കാത്ത മണ്ഡലങ്ങൾ ({noMeetingZones.length})</h3>
                        {noMeetingZones.length === 0 ? (
                            <p className="empty-state success-text">എല്ലാ മണ്ഡലങ്ങളിലും മീറ്റിംഗ് നടന്നു!</p>
                        ) : (
                            <ol className="zone-list warn-list">
                                {noMeetingZones.map(z => (
                                    <li key={z.zoneName}>
                                        {z.zoneName}{z.reason ? ` (${z.reason})` : ''}
                                    </li>
                                ))}
                            </ol>
                        )}
                    </div>

                    {/* Zones WITH meetings */}
                    <div className="card full-width">
                        <h3>{periodLabel} മീറ്റിംഗ് നടന്ന മണ്ഡലങ്ങൾ ({zonesWithMeetings?.length || 0})</h3>
                        {(!zonesWithMeetings || zonesWithMeetings.length === 0) ? (
                            <p className="empty-state">ഒരു മണ്ഡലത്തിലും മീറ്റിംഗ് നടന്നിട്ടില്ല</p>
                        ) : (
                            <ol className="zone-list success-list">
                                {zonesWithMeetings.map(z => {
                                    const dateStr = z.lastMeetingDate 
                                        ? `- ${new Date(z.lastMeetingDate + 'T00:00:00').toLocaleDateString('ml-IN', { day: 'numeric', month: 'short' })} ` 
                                        : '';
                                    return (
                                        <li key={z.zoneName}>
                                            {z.zoneName} {dateStr}({z.meetingCount || 1})
                                        </li>
                                    );
                                })}
                            </ol>
                        )}
                    </div>

                    {/* WhatsApp Message Card */}
                    {(() => {
                        const withList = (zonesWithMeetings || []).map((z, i) => {
                            let dateStr = '';
                            if (z.lastMeetingDate) {
                                const d = new Date(z.lastMeetingDate + 'T00:00:00');
                                dateStr = ` - ${d.toLocaleDateString('ml-IN', { day: 'numeric', month: 'long' })}`;
                            }
                            return `${i + 1}. ${z.zoneName}${dateStr}`;
                        }).join('\n');
                        const withoutList = noMeetingZones.map((z, i) => `${i + 1}. ${z.zoneName}`).join('\n');
                        // Build human-readable date range from startDate / endDate state
                        const fmtRange = (s, e) => {
                            if (!s || !e) return '';
                            const opts = { day: 'numeric', month: 'long' };
                            const sd = new Date(s + 'T00:00:00');
                            const ed = new Date(e + 'T00:00:00');
                            return `(${sd.toLocaleDateString('ml-IN', opts)} - ${ed.toLocaleDateString('ml-IN', opts)})`;
                        };
                        const dateRange = dateFilter === 'week' ? fmtRange(startDate, endDate) : '';
                        const whatsappMsg =
                            `ഈ ആഴ്ചയിൽ മീറ്റിംഗ് കൂടിയ മണ്ഡലങ്ങൾ ${dateRange}\n${withList || 'ഒന്നുമില്ല'}\n\nഈ ആഴ്ചയിൽ മീറ്റിംഗ് കൂടാത്ത മണ്ഡലങ്ങൾ\n${withoutList || 'ഒന്നുമില്ല'}`;
                        const handleCopyWhatsApp = () => {
                            navigator.clipboard.writeText(whatsappMsg).then(() => {
                                const btn = document.getElementById('wa-copy-btn');
                                if (btn) {
                                    btn.textContent = '✅ Copied!';
                                    setTimeout(() => { btn.textContent = '📋 Copy'; }, 2000);
                                }
                            });
                        };
                        return (
                            <div className="card full-width whatsapp-card">
                                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <h3 style={{ margin: 0 }}>📲 WhatsApp Message</h3>
                                    <button id="wa-copy-btn" className="wa-copy-btn" onClick={handleCopyWhatsApp}>
                                        📋 Copy
                                    </button>
                                </div>
                                <pre className="whatsapp-preview">{whatsappMsg}</pre>
                            </div>
                        );
                    })()}

                    {/* Members with 3+ Consecutive Leaves */}
                    <div className="card full-width">
                        <h3>⚠️ തുടർച്ചയായി 3 മീറ്റിംഗിൽ ലീവ് ആയ മെമ്പർമാർ</h3>
                        {consecutiveAbsence.length === 0 ? (
                            <p className="empty-state">ആരും ഇല്ല</p>
                        ) : (
                            <div className="tags-container">
                                {consecutiveAbsence.map((p, i) => (
                                    <span key={i} className="tag warn">
                                        {p.name} ({p.zone})
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* QHLS Missing Branches - Only show for week filter */}
                    {dateFilter === 'week' && (
                        <div className="card full-width">
                            <h3>QHLS നടക്കാത്ത ശാഖകൾ</h3>
                            {(!qhlsMissingBranches || qhlsMissingBranches.length === 0) ? (
                                <p className="empty-state success-text">എല്ലാ ശാഖകളിലും QHLS നടന്നു!</p>
                            ) : (
                                <div className="tags-container">
                                    {qhlsMissingBranches.map((b, i) => (
                                        <span key={i} className="tag warn">{b.branch}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            );
        }

        // Specific Zone View - Show detailed dashboard
        // If no meetings in selected period, show message
        if (totalMeetings === 0) {
            const noMeetingMsg = dateFilter === 'month'
                ? 'ഈ മാസം മീറ്റിംഗ് നടന്നിട്ടില്ല'
                : 'ഈ ആഴ്ച മീറ്റിംഗ് നടന്നിട്ടില്ല';
            return (
                <div className="dashboard-grid">
                    <div className="card full-width no-meeting-card">
                        <h3>{noMeetingMsg}</h3>
                        <p className="empty-state">{selectedZone} മണ്ഡലത്തിൽ തിരഞ്ഞെടുത്ത കാലയളവിൽ മീറ്റിംഗ് റിപ്പോർട്ട് ലഭ്യമല്ല</p>
                    </div>
                </div>
            );
        }

        // Month view for specific zone - show meetings table
        if (dateFilter === 'month') {
            return (
                <div className="dashboard-grid">
                    {/* Meeting Count */}
                    <div className="card full-width">
                        <h3>ഈ മാസം മീറ്റിംഗുകൾ: {totalMeetings}</h3>
                    </div>

                    {/* Meetings Table */}
                    <div className="card full-width">
                        <h3>മീറ്റിംഗ് വിവരങ്ങൾ</h3>
                        <div className="table-responsive">
                            <table className="meetings-table">
                                <thead>
                                    <tr>
                                        <th>തീയതി</th>
                                        <th>Week</th>
                                        <th>റിപ്പോർട്ട്</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {meetingsList && meetingsList.map((meeting, i) => (
                                        <tr key={meeting.meetingId || i}>
                                            <td>{formatDate(meeting.date)}</td>
                                            <td>{meeting.week ? `Week ${meeting.week}` : '-'}</td>
                                            <td>
                                                <button
                                                    className="view-btn"
                                                    onClick={() => handleViewReport(meeting.meetingId)}
                                                    disabled={reportLoading}
                                                >
                                                    {reportLoading ? 'Loading...' : 'View'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            );
        }

        // Week view for specific zone - show detailed stats
        return (
            <div className="dashboard-grid">
                {/* KPI Cards */}
                <div className="card kpi-card">
                    <h3>Total Meetings</h3>
                    <div className="number">{totalMeetings}</div>
                    <div className="sub-text">in selected range</div>
                </div>
                <div className="card kpi-card">
                    <h3>Active Members</h3>
                    <div className="number">{totalMembers}</div>
                </div>
                <div className="card kpi-card">
                    <h3>Overall Attendance</h3>
                    <div className="number">{overallPct}%</div>
                    <div className="sub-text">{totalPresent} / {grandTotal} attendances</div>
                </div>

                {/* Consecutive Leave */}
                <div className="card full-width">
                    <h3>⚠️ തുടർച്ചയായി 3+ മീറ്റിംഗിൽ ലീവ്</h3>
                    {consecutiveAbsence.length === 0 ? (
                        <p className="empty-state">ആരും ഇല്ല</p>
                    ) : (
                        <div className="table-responsive">
                            <table className="warn-table">
                                <thead>
                                    <tr>
                                        <th>പേര്</th>
                                        <th>തുടർച്ച ലീവുകൾ</th>
                                        <th>അവസാനം ഹാജരായത്</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {consecutiveAbsence.map((p, i) => (
                                        <tr key={i}>
                                            <td>{p.name}</td>
                                            <td>{p.consecutiveLeaves || p.consecutiveAbsences}</td>
                                            <td>{p.lastAttendedDate || 'N/A'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Latest Leave Details */}
                <div className="card full-width">
                    <h3>അവസാന മീറ്റിംഗ് ലീവ് വിവരങ്ങൾ</h3>
                    {latestLeaves.length === 0 ? (
                        <p className="empty-state">ലീവുകൾ ഇല്ല</p>
                    ) : (
                        <div className="tags-container horizontal">
                            {latestLeaves.map((l, i) => (
                                <div key={i} className="leave-tag">
                                    <span className="name">{l.name}</span>
                                    {l.reason && <span className="reason">({l.reason})</span>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Attendance Register (Summary View) */}
                <div className="card full-width">
                    <div className="card-header">
                        <h3>ഹാജർ സംഗ്രഹം</h3>
                        <div className="header-buttons">
                            <button className="btn-link" onClick={() => setViewMode('attendance_summary')}>Attendance Register &rarr;</button>
                            <button className="btn-link" onClick={() => setViewMode('attendance_sheet')}>Stats View &rarr;</button>
                        </div>
                    </div>
                    <div className="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    <th>പേര്</th>
                                    <th>ഹാജർ</th>
                                    <th>സ്കോർ</th>
                                    <th>%</th>
                                </tr>
                            </thead>
                            <tbody>
                                {attendanceRegister.slice(0, 10).map((p, i) => (
                                    <tr key={i}>
                                        <td>{p.name}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '5px' }}>
                                                <span style={{ color: 'green' }}>✔ {p.present}</span>
                                                <span style={{ color: 'red' }}>✘ {p.total - p.present}</span>
                                            </div>
                                        </td>
                                        <td>{p.present} / {p.total}</td>
                                        <td>
                                            <span className={`badge ${parseFloat(p.percentage) < 50 ? 'bad' : 'good'}`}>
                                                {p.percentage}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {attendanceRegister.length > 10 && <div className="more-row">...and {attendanceRegister.length - 10} more</div>}
                    </div>
                </div>
            </div>
        );
    };

    const renderAttendanceSummary = () => {
        // Only render when a specific zone is selected
        if (!selectedZone || selectedZone === 'All') {
            return null;
        }

        return (
            <div className="card full-width">
                <div className="card-header">
                    <button className="back-button" onClick={() => setViewMode('dashboard')}>
                        <span className="icon">←</span> Back
                    </button>
                    <h3>Attendance Register</h3>
                </div>
                <AttendanceSummary
                    zoneId={selectedZone}
                    startDate={startDate}
                    endDate={endDate}
                />
            </div>
        );
    };

    const renderAttendanceSheet = () => {
        if (!stats) return null;

        const { attendanceRegister } = stats;

        return (
            <div className="card full-width">
                <div className="card-header">
                    <button className="back-button" onClick={() => setViewMode('dashboard')}>
                        <span className="icon">←</span> Back
                    </button>
                    <h3>Detailed Attendance Stats</h3>
                </div>
                <div className="table-responsive">
                    <table className="register-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Zone</th>
                                <th>Total</th>
                                <th>Present</th>
                                <th>Leave</th>
                                <th>Absent</th>
                                <th>%</th>
                            </tr>
                        </thead>
                        <tbody>
                            {attendanceRegister.map((p, i) => (
                                <tr key={i}>
                                    <td><strong>{p.name}</strong></td>
                                    <td>{p.zone}</td>
                                    <td>{p.total}</td>
                                    <td className="success-text">{p.present}</td>
                                    <td className="warn-text">{p.leave}</td>
                                    <td className="error-text">{p.absent}</td>
                                    <td>
                                        <strong>{p.percentage}%</strong>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderReportView = () => {
        if (!selectedReport || !selectedMeetingData) return null;

        return (
            <div className="card full-width report-view">
                <div className="card-header">
                    <button className="back-button" onClick={() => {
                        setViewMode('dashboard');
                        setSelectedReport(null);
                        setSelectedMeetingData(null);
                    }}>
                        <span className="icon">←</span> Back
                    </button>
                    <h3>മീറ്റിംഗ് റിപ്പോർട്ട്</h3>
                    <button className="print-btn" onClick={handlePrintReport}>🖨️ Print</button>
                </div>

                <div className="report-content-wrapper">
                    <div className="report-section">
                        <p><strong>മണ്ഡലം:</strong> {selectedMeetingData.zoneName}</p>
                        <p><strong>തീയതി:</strong> {selectedMeetingData.date}</p>
                        {selectedMeetingData.startTime && <p><strong>സമയം:</strong> {selectedMeetingData.startTime} - {selectedMeetingData.endTime}</p>}
                    </div>

                    <div className="report-section">
                        <h4>പങ്കെടുത്തവർ:</h4>
                        <pre>{selectedReport.attendees || 'ആരുമില്ല'}</pre>
                    </div>

                    <div className="report-section">
                        <h4>ലീവ് ആയവർ:</h4>
                        <pre>{selectedReport.leaveAayavar || 'ആരുമില്ല'}</pre>
                    </div>

                    <div className="report-section">
                        <h4>അജണ്ടകൾ:</h4>
                        <pre>{selectedReport.agenda || 'അജണ്ടകളില്ല'}</pre>
                    </div>

                    <div className="report-section">
                        <h4>തീരുമാനങ്ങൾ:</h4>
                        <pre>{selectedReport.minutes || 'തീരുമാനങ്ങളില്ല'}</pre>
                    </div>

                    <div className="report-section">
                        <h4>QHLS Status:</h4>
                        <pre>{selectedReport.qhlsStatus || 'QHLS ഡാറ്റയില്ല'}</pre>
                    </div>
                </div>
            </div>
        );
    };

    const user = getUser();
    const isDistrictAdmin = hasRole('district_admin', user) && !hasRole('admin', user);

    return (
        <div className="container dashboard-container">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                <h1 className="page-title" style={{ margin: 0 }}>Dashboard</h1>
                {isDistrictAdmin && (
                    <span style={{
                        background: 'var(--accent)',
                        color: 'var(--primary)',
                        padding: '8px 20px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.85rem',
                        fontWeight: '800',
                        boxShadow: 'var(--shadow-md)',
                        border: '1px solid rgba(163, 230, 53, 0.3)'
                    }}>
                        DISTRICT VIEW
                    </span>
                )}
            </div>
            {dateFilter === 'week' && stats?.currentWeek && (
                <h4 className="week-subtitle">WEEK {stats.currentWeek}</h4>
            )}
            {dateFilter === 'month' && (
                <h4 className="week-subtitle">
                    {new Date().toLocaleString('ml-IN', { month: 'long' }).toUpperCase()}
                </h4>
            )}

            {renderControls()}

            {error && <div className="error-msg">{error}</div>}
            {loading ? (
                <div className="loading-spinner">Loading stats...</div>
            ) : (
                <>
                    {viewMode === 'dashboard' && renderOverview()}
                    {viewMode === 'attendance_sheet' && renderAttendanceSheet()}
                    {viewMode === 'attendance_summary' && renderAttendanceSummary()}
                    {viewMode === 'report_view' && renderReportView()}
                </>
            )}

            <style>{`
                .dashboard-container {
                    padding-bottom: 120px;
                    max-width: 1200px;
                    margin: 0 auto;
                }
                .page-title {
                    margin-bottom: 20px;
                    color: var(--accent);
                    font-weight: 800;
                    letter-spacing: -0.02em;
                }
                .week-subtitle {
                    margin: -10px 0 24px 0;
                    color: var(--gray-500);
                    font-size: 0.9rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                
                .card {
                    background: var(--white);
                    border-radius: var(--radius-xl);
                    padding: var(--space-xl);
                    box-shadow: var(--shadow-md);
                    border: 1px solid rgba(0, 0, 0, 0.02);
                    margin-bottom: var(--space-lg);
                    transition: all 0.3s ease;
                }
                .card:hover {
                    box-shadow: var(--shadow-lg);
                    transform: translateY(-2px);
                }
                
                .kpi-card {
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    aspect-ratio: 1;
                    min-height: 200px;
                }
                
                .kpi-card .number {
                    font-size: 3rem;
                    font-weight: 900;
                    color: var(--accent);
                    line-height: 1;
                    margin: 12px 0;
                    letter-spacing: -0.05em;
                }
                
                .kpi-card h3 {
                    margin: 0;
                    font-size: 0.85rem;
                    color: var(--gray-500);
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                }

                .dashboard-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: var(--space-lg);
                }

                .full-width {
                    grid-column: 1 / -1;
                }

                .btn-group {
                    display: flex;
                    gap: 8px;
                    background: var(--gray-50);
                    padding: 4px;
                    border-radius: var(--radius-full);
                    border: 1px solid var(--gray-100);
                }

                .btn-group button {
                    background: transparent;
                    color: var(--gray-600);
                    border-radius: var(--radius-full);
                    padding: 8px 20px;
                    font-weight: 700;
                    font-size: 0.85rem;
                    box-shadow: none;
                    border: none;
                    cursor: pointer;
                }

                .btn-group button.active {
                    background: var(--accent);
                    color: var(--white);
                    box-shadow: var(--shadow-sm);
                }

                .zone-select {
                    background-color: var(--gray-50);
                    border: 1px solid var(--gray-100);
                    padding: 12px 24px;
                    border-radius: var(--radius-full);
                    font-weight: 700;
                    font-size: 0.95rem;
                }

                .refresh-btn {
                    background: var(--accent);
                    color: var(--white);
                    border-radius: var(--radius-full);
                    padding: 12px 24px;
                    font-weight: 700;
                    border: none;
                    cursor: pointer;
                }

                .wa-copy-btn {
                    background: var(--primary);
                    color: var(--accent);
                    border-radius: var(--radius-full);
                    padding: 10px 24px;
                    font-weight: 800;
                    box-shadow: var(--shadow-glow);
                    border: none;
                    cursor: pointer;
                }

                .whatsapp-preview {
                    background: var(--gray-50);
                    border: none;
                    border-radius: var(--radius-lg);
                    padding: 24px;
                    font-size: 0.95rem;
                    line-height: 1.6;
                    color: var(--gray-700);
                    font-family: inherit;
                    white-space: pre-wrap;
                }

                .tag {
                    padding: 8px 16px;
                    border-radius: var(--radius-full);
                    font-size: 0.85rem;
                    font-weight: 700;
                    background: var(--gray-100);
                    color: var(--gray-700);
                }

                .tag.warn {
                    background: #FEF2F2;
                    color: var(--danger);
                }

                .btn-link {
                    background: transparent;
                    color: var(--primary-dark);
                    box-shadow: none;
                    padding: 4px 12px;
                    font-weight: 800;
                    font-size: 0.85rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    border: none;
                    cursor: pointer;
                }
                .btn-link:hover {
                    background: var(--primary-light);
                    transform: none;
                }

                .badge {
                    padding: 6px 12px;
                    border-radius: var(--radius-full);
                    font-size: 0.8rem;
                    font-weight: 800;
                }
                .badge.good { background: #DCFCE7; color: #166534; }
                .badge.bad { background: #FEF2F2; color: #991B1B; }

                .table-responsive {
                    overflow-x: auto;
                    margin-top: 15px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                }
                th, td {
                    padding: 16px;
                    text-align: left;
                    border-bottom: 1px solid var(--gray-50);
                }
                th {
                    font-weight: 800;
                    color: var(--gray-400);
                    font-size: 0.7rem;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                }

                .back-button {
                    background: var(--gray-100);
                    color: var(--accent);
                    border-radius: var(--radius-full);
                    padding: 8px 20px;
                    font-weight: 700;
                    box-shadow: none;
                    border: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .back-button:hover {
                    background: var(--gray-200);
                    transform: translateX(-4px);
                }

                .view-btn {
                    background: var(--accent);
                    color: var(--white);
                    border-radius: var(--radius-full);
                    padding: 6px 16px;
                    font-weight: 700;
                    font-size: 0.8rem;
                    border: none;
                    cursor: pointer;
                }

                @media (max-width: 640px) {
                    .dashboard-grid {
                        grid-template-columns: 1fr;
                    }
                    .kpi-card {
                        min-height: 150px;
                    }
                    .kpi-card .number {
                        font-size: 2.5rem;
                    }
                }
            `}</style>
        </div>
    );
};


export default Dashboard;
