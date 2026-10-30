import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats, getZones, getMeetingReport } from '../services/api';
import { loadMeetingDay, getReportingWeek, toDateKey } from '../services/week';
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
    const [dateFilter, setDateFilter] = useState('week'); // 7days, week, month, custom
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [viewMode, setViewMode] = useState('dashboard'); // 'dashboard', 'attendance_sheet', 'attendance_summary'
    const [selectedReport, setSelectedReport] = useState(null);
    const [selectedMeetingData, setSelectedMeetingData] = useState(null);
    const [reportLoading, setReportLoading] = useState(false);
    const [meetingDay, setMeetingDay] = useState(null);
    const latestRequestRef = useRef(0);

    useEffect(() => {
        loadZones();
        fetchMeetingDay();
    }, []);

    const fetchMeetingDay = async () => {
        const day = await loadMeetingDay();
        setMeetingDay(day);
        initializeDates('week', day);
    };

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

    const initializeDates = (filterType, targetDay = null) => {
        const today = new Date();
        let start = new Date(today);
        let end = new Date(today);

        if (filterType === '7days') {
            start.setDate(today.getDate() - 7);
        } else if (filterType === 'week') {
            const day = targetDay !== null ? targetDay : meetingDay;
            if (day === null) return; // meeting day still loading; fetchMeetingDay sets the week
            // Same reporting week as the Reports tab
            ({ start, end } = getReportingWeek(day, today));
        } else if (filterType === 'month') {
            start.setDate(1); // 1st of month
        } else if (filterType === 'custom') {
            // Keep existing dates
            return;
        }

        setStartDate(toDateKey(start));
        setEndDate(toDateKey(end));
    };

    const handleDateFilterChange = (filter) => {
        setDateFilter(filter);
        if (filter !== 'custom') {
            initializeDates(filter);
        }
    };

    const fetchStats = async () => {
        // Only the newest request may update the screen; quick filter taps would otherwise race
        const requestId = ++latestRequestRef.current;
        setLoading(true);
        try {
            const response = await getDashboardStats(startDate, endDate, selectedZone);
            if (requestId !== latestRequestRef.current) return;
            if (response.success) {
                setStats(response.data);
                setError(null);
            } else {
                setError('Failed to fetch data');
            }
        } catch (err) {
            if (requestId !== latestRequestRef.current) return;
            setError(err.message || 'Error fetching dashboard data');
        } finally {
            if (requestId === latestRequestRef.current) setLoading(false);
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

    const formatDateShort = (d) => {
        if (!d) return '';
        const date = typeof d === 'string' ? new Date(d) : d;
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    };

    // --- Renderers ---

    const CollapsibleCard = ({ id, title, children, defaultExpanded = true, className = "" }) => (
        <details id={id} className={`card dash-collapsible collapsible ${className}`} open={defaultExpanded}>
            <summary>
                <h3>{title}</h3>
                <svg className="chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </summary>
            <div className="dash-collapsible-body">{children}</div>
        </details>
    );

    const filterActive = dateFilter !== 'week' || selectedZone !== 'All';

    const renderControls = () => (
        <details className="filter-panel">
            <summary>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
                Filter
                {filterActive && <span className="filter-dot" aria-label="Filter on" />}
                <svg className="chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </summary>
        <div className="dashboard-controls">
            <div className="control-group">
                <label>Date Range:</label>
                <div className="btn-group">
                    <button
                        className={dateFilter === '7days' ? 'active' : ''}
                        onClick={() => handleDateFilterChange('7days')}
                    >7 Days</button>
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
        </details>
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
        const periodLabel = dateFilter === 'month' ? 'ഈ മാസം' : (dateFilter === '7days' ? 'കഴിഞ്ഞ 7 ദിവസം' : 'ഈ ആഴ്ച');

        // All Zones View - Show simplified dashboard
        if (selectedZone === 'All') {
            const zonesMet = zonesWithMeetings?.length || 0;
            const zoneTotal = zonesMet + noMeetingZones.length;
            const showQhls = dateFilter === 'week' || dateFilter === '7days';
            // Tapping a number opens its card below and brings it into view
            const openCard = (cardId) => {
                const card = document.getElementById(cardId);
                if (!card) return;
                card.open = true;
                card.scrollIntoView({ behavior: 'smooth', block: 'start' });
            };

            return (
                <div className="dashboard-grid">
                    <div className="dash-summary full-width">
                        <button type="button" className="dash-stat" onClick={() => openCard('card-no-meeting')}>
                            <span className="dash-stat-value nums">
                                {zonesMet}<span className="dash-stat-of"> / {zoneTotal}</span>
                            </span>
                            <span className="dash-stat-label">മീറ്റിംഗ് നടന്ന മണ്ഡലങ്ങൾ</span>
                        </button>
                        {showQhls && (
                            <button type="button" className={`dash-stat${qhlsMissingBranches?.length ? ' warn' : ''}`} onClick={() => openCard('card-qhls')}>
                                <span className="dash-stat-value nums">{qhlsMissingBranches?.length || 0}</span>
                                <span className="dash-stat-label">QHLS നടക്കാത്ത ശാഖകൾ</span>
                            </button>
                        )}
                        <button type="button" className={`dash-stat${consecutiveAbsence.length ? ' warn' : ''}`} onClick={() => openCard('card-leaves')}>
                            <span className="dash-stat-value nums">{consecutiveAbsence.length}</span>
                            <span className="dash-stat-label">തുടർച്ചയായി 3 ലീവ്</span>
                        </button>
                    </div>

                    {/* Zones WITHOUT meetings */}
                    <CollapsibleCard 
                        id="card-no-meeting"
                        className="full-width"
                        title={`${periodLabel} മീറ്റിംഗ് നടക്കാത്ത മണ്ഡലങ്ങൾ (${noMeetingZones.length})`}
                    >
                        {noMeetingZones.length === 0 ? (
                            <p className="empty-state success-text">എല്ലാ മണ്ഡലങ്ങളിലും മീറ്റിംഗ് നടന്നു!</p>
                        ) : (
                            <div className="tags-container">
                                {noMeetingZones.map(z => (
                                    <span key={z.zoneName} className="tag warn">
                                        {z.zoneName}{z.reason ? ` (${z.reason})` : ''}
                                    </span>
                                ))}
                            </div>
                        )}
                    </CollapsibleCard>

                    {/* Zones WITH meetings */}
                    <CollapsibleCard 
                        className="full-width"
                        title={`${periodLabel} മീറ്റിംഗ് നടന്ന മണ്ഡലങ്ങൾ (${zonesWithMeetings?.length || 0})`}
                        defaultExpanded={false}
                    >
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
                    </CollapsibleCard>

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
                        const dateRange = (dateFilter === 'week' || dateFilter === '7days') ? fmtRange(startDate, endDate) : '';
                        const whatsappMsg =
                            `ഈ ആഴ്ചയിൽ മീറ്റിംഗ് കൂടിയ മണ്ഡലങ്ങൾ ${dateRange}\n${withList || 'ഒന്നുമില്ല'}\n\nഈ ആഴ്ചയിൽ മീറ്റിംഗ് കൂടാത്ത മണ്ഡലങ്ങൾ\n${withoutList || 'ഒന്നുമില്ല'}`;
                        const handleCopyWhatsApp = () => {
                            navigator.clipboard.writeText(whatsappMsg).then(() => {
                                const btn = document.getElementById('wa-copy-btn');
                                if (btn) {
                                    btn.textContent = 'Copied!';
                                    setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
                                }
                            });
                        };
                        return (
                            <CollapsibleCard 
                                className="full-width whatsapp-card"
                                title="WhatsApp Message"
                                defaultExpanded={false}
                            >
                                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <h3 style={{ margin: 0, display: 'none' }}>WhatsApp Message</h3>
                                    <button id="wa-copy-btn" className="wa-copy-btn" onClick={handleCopyWhatsApp}>
                                        Copy
                                    </button>
                                </div>
                                <pre className="whatsapp-preview">{whatsappMsg}</pre>
                            </CollapsibleCard>
                        );
                    })()}

                    {/* Members with 3+ Consecutive Leaves */}
                    <CollapsibleCard 
                        id="card-leaves"
                        className="full-width"
                        title="തുടർച്ചയായി 3 മീറ്റിംഗിൽ ലീവ് ആയ മെമ്പർമാർ"
                        defaultExpanded={false}
                    >
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
                    </CollapsibleCard>

                    {/* QHLS Missing Branches - Only show for week/7days filter */}
                    {(dateFilter === 'week' || dateFilter === '7days') && (
                        <CollapsibleCard 
                            id="card-qhls"
                            className="full-width"
                            title="QHLS നടക്കാത്ത ശാഖകൾ"
                            defaultExpanded={false}
                        >
                            {(!qhlsMissingBranches || qhlsMissingBranches.length === 0) ? (
                                <p className="empty-state success-text">എല്ലാ ശാഖകളിലും QHLS നടന്നു!</p>
                            ) : (
                                <div className="tags-container">
                                    {qhlsMissingBranches.map((b, i) => (
                                        <span key={i} className="tag warn">{b.branch}{b.zone ? <span className="tag-sub"> · {b.zone}</span> : null}</span>
                                    ))}
                                </div>
                            )}
                        </CollapsibleCard>
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
                                                    {reportLoading ? 'Loading...' : 'റിപ്പോർട്ട്'}
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
                    <h3>Attendees in range</h3>
                    <div className="number">{totalMembers}</div>
                </div>
                <div className="card kpi-card">
                    <h3>Overall Attendance</h3>
                    <div className="number">{overallPct}%</div>
                    <div className="sub-text">{totalPresent} / {grandTotal} attendances</div>
                </div>

                {/* Consecutive Leave */}
                <div className="card full-width">
                    <h3>തുടർച്ചയായി 3+ മീറ്റിംഗിൽ ലീവ്</h3>
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
                    <button className="print-btn" onClick={handlePrintReport}>Print</button>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <h2 className="page-title" style={{ margin: 0 }}>Dashboard</h2>
                {isDistrictAdmin && (
                    <span className="app-user-badge" style={{ background: 'var(--slate)', color: 'var(--surface)' }}>
                        District View
                    </span>
                )}
            </div>
            {(dateFilter === 'week' || dateFilter === '7days') && (
                <div style={{ marginBottom: 'var(--space-lg)' }}>
                    <div className="week-tag nums">
                        Reporting Week: {formatDateShort(startDate)} - {formatDateShort(endDate)}
                    </div>
                </div>
            )}
            {dateFilter === 'month' && (
                <h4 className="week-subtitle">
                    {new Date().toLocaleString('ml-IN', { month: 'long' })}
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
                    padding-bottom: 50px;
                    max-width: 1200px;
                    margin: 0 auto;
                }
                .page-title {
                    margin-bottom: 20px;
                    color: var(--slate);
                }
                .week-subtitle {
                    margin: -10px 0 15px 0;
                    color: var(--slate);
                    font-size: 1rem;
                    font-weight: 600;
                }
                .no-meeting-card {
                    text-align: center;
                    padding: 40px 20px;
                    background: var(--clay-wash);
                    border: 1px solid var(--clay-wash);
                }
                .no-meeting-card h3 {
                    color: var(--clay);
                    margin-bottom: 10px;
                }
                .meetings-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .meetings-table th,
                .meetings-table td {
                    padding: 12px 15px;
                    text-align: left;
                    border-bottom: 1px solid var(--edge);
                }
                .meetings-table th {
                    background: var(--gray-50);
                    font-weight: 600;
                    color: var(--stone);
                }
                .view-btn {
                    padding: 6px 16px;
                    background: var(--slate);
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 0.9rem;
                }
                .view-btn:hover {
                    background: var(--slate);
                }
                .view-btn:disabled {
                    background: var(--edge);
                    cursor: not-allowed;
                }
                .print-btn {
                    padding: 8px 16px;
                    background: var(--paddy);
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 0.9rem;
                }
                .print-btn:hover {
                    background: var(--paddy-deep);
                }
                .whatsapp-card {
                    background: var(--paddy-wash);
                }
                .whatsapp-card h3 {
                    color: var(--paddy-deep);
                }
                .wa-copy-btn {
                    padding: 0 20px;
                }
                .whatsapp-preview {
                    background: #ffffff;
                    border-radius: var(--radius-md);
                    padding: 16px 20px;
                    font-family: inherit;
                    font-size: 0.97rem;
                    color: var(--slate);
                    white-space: pre-wrap;
                    line-height: 1.7;
                    margin: 0;
                }
                .report-view .card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 15px;
                    margin-bottom: 20px;
                    flex-wrap: wrap;
                }
                .report-content-wrapper {
                    background: var(--gray-50);
                    padding: 20px;
                    border-radius: 8px;
                }
                .report-section {
                    margin-bottom: 20px;
                    padding-bottom: 15px;
                    border-bottom: 1px solid var(--edge);
                }
                .report-section:last-child {
                    border-bottom: none;
                    margin-bottom: 0;
                }
                .report-section h4 {
                    margin: 0 0 10px 0;
                    color: var(--slate);
                }
                .report-section pre {
                    margin: 0;
                    white-space: pre-wrap;
                    font-family: inherit;
                    font-size: 0.95rem;
                    color: var(--slate);
                }
                @media print {
                    .dashboard-controls,
                    .btn-back,
                    .print-btn,
                    nav {
                        display: none !important;
                    }
                    .report-view {
                        box-shadow: none;
                        border: none;
                    }
                }
                .dash-summary {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
                    gap: 6px;
                }
                .dash-stat {
                    flex-direction: column;
                    align-items: flex-start;
                    justify-content: flex-start;
                    gap: 2px;
                    padding: var(--space-md);
                    background: var(--surface);
                    color: var(--slate);
                    text-align: left;
                    font-weight: 400;
                }
                .dash-stat:hover {
                    background: var(--gray-50);
                }
                .dash-stat-value {
                    font-size: 1.9rem;
                    font-weight: 700;
                    font-variation-settings: 'wdth' 80;
                    line-height: 1.1;
                    color: var(--paddy-deep);
                }
                .dash-stat.warn .dash-stat-value {
                    color: var(--clay);
                }
                .dash-stat-of {
                    font-size: 1.1rem;
                    color: var(--stone);
                }
                .dash-stat-label {
                    font-size: 0.85rem;
                    color: var(--stone);
                }
                .tag-sub {
                    color: var(--stone);
                    font-size: 0.85em;
                }
                .card.dash-collapsible {
                    padding: 0;
                    margin-bottom: 6px;
                }
                .dash-collapsible summary {
                    padding: 4px var(--space-lg);
                }
                .dash-collapsible summary h3 {
                    margin: 0;
                    font-size: 1.05rem;
                }
                .dash-collapsible-body {
                    padding: 0 var(--space-lg) var(--space-lg);
                }
                .card {
                    background: var(--surface);
                    padding: var(--space-lg);
                    border-radius: var(--radius-md);
                }
                .dashboard-controls {
                    display: flex;
                    flex-wrap: wrap;
                    gap: var(--space-md) var(--space-lg);
                    align-items: flex-end;
                    margin-bottom: var(--space-xl);
                    background: transparent;
                    padding: 0;
                }
                .control-group {
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }
                .control-group.right {
                    margin-left: auto;
                }
                .control-group label {
                    font-size: 0.9rem;
                    color: var(--stone);
                    font-weight: 500;
                }
                .btn-group {
                    display: flex;
                    gap: 6px;
                }
                .btn-group button {
                    flex: 1;
                    background: var(--surface);
                    color: var(--slate);
                    padding: 0 14px;
                    font-size: 0.95rem;
                    font-weight: 500;
                    white-space: nowrap;
                }
                .btn-group button:hover {
                    background: var(--gray-50);
                }
                .btn-group button.active {
                    background: var(--slate);
                    color: white;
                }
                .dates {
                    flex-direction: row;
                    align-items: center;
                    gap: 10px;
                }
                .dates input {
                    padding: 8px;
                    border: 1px solid var(--edge);
                    border-radius: 4px;
                }
                .zone-select {
                    padding: 8px 12px;
                    border-radius: 4px;
                    border: 1px solid var(--edge);
                    min-width: 150px;
                    font-size: 0.95rem;
                }
                .dashboard-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 6px;
                }
                .full-width {
                    grid-column: 1 / -1;
                }
                .kpi-card {
                    text-align: center;
                    padding: 25px;
                }
                .kpi-card .number {
                    font-size: 2.5rem;
                    font-weight: 700;
                    font-variation-settings: 'wdth' 80;
                    font-variant-numeric: tabular-nums;
                    color: var(--slate);
                    margin: 10px 0;
                }
                .kpi-card.warn .number {
                    color: var(--clay);
                }
                .sub-text {
                    color: var(--stone);
                    font-size: 0.9rem;
                }
                .tags-container {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 10px;
                    margin-top: 15px;
                }
                .tag {
                    padding: 4px 10px;
                    background: var(--mist);
                    border-radius: var(--radius-sm);
                    font-size: 0.9rem;
                }
                .tag.warn {
                    background: var(--clay-wash);
                    color: var(--clay);
                    border: 1px solid var(--clay-wash);
                }
                .tag.success {
                    background: var(--paddy-wash);
                    color: var(--paddy-deep);
                    border: 1px solid var(--paddy-wash);
                }
                .zone-list {
                    margin: 15px 0 0 0;
                    padding-left: 25px;
                }
                .zone-list li {
                    padding: 4px 0;
                    font-size: 0.95rem;
                    color: var(--slate);
                }
                .leave-tag {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: var(--gray-50);
                    padding: 8px 12px;
                    border-radius: var(--radius-md);
                }
                .leave-tag .name {
                    font-weight: 600;
                }
                .leave-tag .reason {
                    color: var(--rust);
                    font-style: italic;
                }
                .zone-badge {
                    font-size: 0.75rem;
                    background: var(--edge);
                    color: var(--slate);
                    padding: 2px 6px;
                    border-radius: 4px;
                }
                .table-responsive {
                    overflow-x: auto;
                    margin-top: 15px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                }
                th, td {
                    padding: 12px 15px;
                    text-align: left;
                    border-bottom: 1px solid var(--edge);
                }
                th {
                    font-weight: 600;
                    color: var(--stone);
                    font-size: 0.9rem;
                    background: var(--gray-50);
                }
                .warn-table th {
                    color: var(--clay);
                    background: var(--clay-wash);
                }
                .badge {
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-weight: bold;
                    font-size: 0.85rem;
                }
                .badge.good {
                    background: var(--paddy-wash);
                    color: var(--paddy-deep);
                }
                .badge.bad {
                    background: var(--rust-wash);
                    color: var(--rust);
                }
                .card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .header-buttons {
                    display: flex;
                    gap: 15px;
                }
                .btn-link {
                    background: none;
                    border: none;
                    color: var(--slate);
                    cursor: pointer;
                    font-weight: 600;
                }
                .back-button {
                  color: var(--slate);
                  font-size: 0.95rem;
                  font-weight: 600;
                  background: transparent;
                  border: none;
                  padding: 0 12px;
                  border-radius: 6px;
                  cursor: pointer;
                  display: flex;
                  align-items: center;
                  gap: 8px;
                  transition: all 0.2s ease;
                }
                .back-button:hover {
                  background: var(--slate);
                  color: white;
                }
                .back-button .icon {
                    font-size: 20px;
                }
                .error-msg {
                    background: var(--rust-wash);
                    color: var(--rust);
                    padding: 15px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                }
                .loading-spinner {
                    text-align: center;
                    padding: 40px;
                    color: var(--stone);
                    font-size: 1.1rem;
                }
                .success-text { color: var(--paddy); font-weight: bold; }
                .warn-text { color: var(--clay); font-weight: bold; }
                .error-text { color: var(--rust); font-weight: bold; }
                .more-row {
                    text-align: center;
                    padding: 10px;
                    color: var(--stone);
                    font-style: italic;
                }
                .refresh-btn {
                    padding: 10px 20px;
                    background: var(--paddy);
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 600;
                }
                @media (max-width: 768px) {
                    .dashboard-controls {
                        flex-direction: column;
                        align-items: stretch;
                    }
                    .control-group.right {
                        margin-left: 0;
                    }
                    .dates {
                        flex-direction: column;
                    }
                    .dates input {
                        width: 100%;
                    }
                }
            `}</style>
        </div>
    );
};

export default Dashboard;
