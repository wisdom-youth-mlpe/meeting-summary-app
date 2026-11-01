import React, { useState, useEffect } from 'react';
import { getAttendanceSummary } from '../services/api';

const AttendanceSummary = ({ zoneId, startDate, endDate }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (zoneId && zoneId !== 'All') {
            fetchAttendanceSummary();
        } else {
            setData(null);
        }
    }, [zoneId, startDate, endDate]);

    const fetchAttendanceSummary = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await getAttendanceSummary(zoneId, startDate, endDate);
            if (response.success) {
                setData(response.data);
            } else {
                setError(response.error || 'Failed to fetch data');
            }
        } catch (err) {
            setError(err.message || 'Error fetching attendance summary');
        } finally {
            setLoading(false);
        }
    };

    if (!zoneId || zoneId === 'All') {
        return (
            <div className="attendance-summary-placeholder">
                <p>Please select a specific zone to view the attendance summary.</p>
            </div>
        );
    }

    if (loading) {
        return <div className="loading-spinner">Loading attendance summary...</div>;
    }

    if (error) {
        return <div className="error-msg">{error}</div>;
    }

    if (!data || !data.attendees || data.attendees.length === 0) {
        return (
            <div className="attendance-summary-empty">
                <p>No attendance data available for this zone in the selected date range.</p>
            </div>
        );
    }

    const { zoneName, weeks, attendees } = data;

    const getStatusClass = (status) => {
        switch (status) {
            case 'P': return 'status-present';
            case 'L': return 'status-leave';
            case 'A': return 'status-absent';
            default: return 'status-none';
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'P': return '✓';
            case 'L': return '–';
            case 'A': return '✗';
            default: return '–';
        }
    };

    return (
        <div className="attendance-summary">
            <div className="summary-header">
                <h3>Attendance Summary - {zoneName}</h3>
                <div className="legend">
                    <span className="legend-item"><span className="legend-box status-present">✓</span> Present</span>
                    <span className="legend-item"><span className="legend-box status-leave">–</span> Leave</span>
                    <span className="legend-item"><span className="legend-box status-absent">✗</span> Absent</span>
                    <span className="legend-item"><span className="legend-box status-none">–</span> No Data</span>
                </div>
            </div>

            <div className="table-responsive">
                <table className="attendance-table">
                    <thead>
                        <tr>
                            <th className="col-slno">Sl No</th>
                            <th className="col-name">Name</th>
                            {weeks.map(week => (
                                <th key={week} className="col-week">{week}</th>
                            ))}
                            <th className="col-total">Total</th>
                            <th className="col-percent">%</th>
                        </tr>
                    </thead>
                    <tbody>
                        {attendees.map((attendee) => (
                            <tr key={attendee.slNo}>
                                <td className="col-slno">{attendee.slNo}</td>
                                <td className="col-name">
                                    <div className="attendee-name">{attendee.name}</div>
                                    {attendee.role && <div className="attendee-role">{attendee.role}</div>}
                                </td>
                                {weeks.map(week => (
                                    <td key={week} className={`col-week ${getStatusClass(attendee.weeklyStatus[week])}`}>
                                        {getStatusLabel(attendee.weeklyStatus[week])}
                                    </td>
                                ))}
                                <td className="col-total">{attendee.totalAttendance}</td>
                                <td className="col-percent">
                                    <span className={`percentage-badge ${attendee.percentage >= 75 ? 'good' : attendee.percentage >= 50 ? 'medium' : 'poor'}`}>
                                        {attendee.percentage}%
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <style>{`
                .attendance-summary {
                    background: white;
                    border-radius: 12px;
                    padding: 20px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                    border: 1px solid var(--edge);
                }

                .summary-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    flex-wrap: wrap;
                    gap: 15px;
                }

                .summary-header h3 {
                    margin: 0;
                    color: var(--slate);
                }

                .legend {
                    display: flex;
                    gap: 20px;
                    flex-wrap: wrap;
                }

                .legend-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 0.9rem;
                    color: var(--stone);
                    font-weight: 500;
                }

                .legend-box {
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 4px;
                    font-weight: bold;
                    font-size: 14px;
                }

                .attendance-summary-placeholder,
                .attendance-summary-empty {
                    background: var(--gray-50);
                    border-radius: 12px;
                    padding: 40px;
                    text-align: center;
                    color: var(--stone);
                }

                .table-responsive {
                    overflow-x: auto;
                    margin: 0 -10px;
                    padding: 0 10px;
                }

                .attendance-table {
                    width: 100%;
                    border-collapse: collapse;
                    min-width: 600px;
                }

                .attendance-table th,
                .attendance-table td {
                    padding: 12px 8px;
                    text-align: center;
                    border-bottom: 1px solid var(--edge);
                }

                .attendance-table th {
                    background: var(--gray-50);
                    font-weight: 600;
                    color: var(--stone);
                    font-size: 0.85rem;
                    text-transform: uppercase;
                    white-space: nowrap;
                }

                .col-slno {
                    width: 60px;
                }

                .col-name {
                    text-align: left !important;
                    min-width: 150px;
                }

                .col-week {
                    width: 60px;
                    font-weight: 600;
                }

                .col-total {
                    min-width: 100px;
                    font-weight: 600;
                    white-space: nowrap;
                }

                .col-percent {
                    width: 80px;
                }

                .attendee-name {
                    font-weight: 500;
                    color: var(--slate);
                }

                .attendee-role {
                    font-size: 0.75rem;
                    color: var(--stone);
                    margin-top: 2px;
                }

                .status-present {
                    background: var(--paddy-wash) !important;
                    color: var(--paddy-deep) !important;
                }

                .status-leave {
                    background: var(--clay-wash) !important;
                    color: var(--clay) !important;
                }

                .status-absent {
                    background: var(--rust-wash) !important;
                    color: var(--rust) !important;
                }

                .status-none {
                    background: var(--edge) !important;
                    color: var(--slate) !important;
                }

                .attendance-table td {
                    padding: 12px 8px;
                    text-align: center;
                    border: 1px solid var(--edge);
                    font-weight: 600;
                    font-size: 1.1rem;
                }

                .percentage-badge {
                    display: inline-block;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-weight: 600;
                    font-size: 0.85rem;
                }

                .percentage-badge.good {
                    background: var(--paddy-wash);
                    color: var(--paddy-deep);
                }

                .percentage-badge.medium {
                    background: var(--clay-wash);
                    color: var(--clay);
                }

                .percentage-badge.poor {
                    background: var(--rust-wash);
                    color: var(--rust);
                }

                @media (max-width: 768px) {
                    .summary-header {
                        flex-direction: column;
                        align-items: flex-start;
                    }

                    .legend {
                        width: 100%;
                        justify-content: flex-start;
                    }

                    .attendance-table th,
                    .attendance-table td {
                        padding: 8px 4px;
                        font-size: 0.8rem;
                    }

                    .col-week {
                        width: 45px;
                    }
                }
            `}</style>
        </div>
    );
};

export default AttendanceSummary;
