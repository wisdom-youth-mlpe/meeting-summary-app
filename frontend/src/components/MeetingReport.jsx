import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAllMeetings, getMeetingReport, deleteMeeting, getSetting } from '../services/api';
import { getAccessibleZones, canEditMeetings, hasAnyRole, getUser, hasRole } from '../services/auth';
import { filterMeetingsByZoneAccess } from '../services/zoneHelper';

const MeetingReport = () => {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedMeetingData, setSelectedMeetingData] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [meetingDay, setMeetingDay] = useState(3); // Default to Wednesday
  const [weekRange, setWeekRange] = useState({ start: null, end: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const user = getUser();
  const accessibleZones = getAccessibleZones();

  const canEdit = (meeting) => {
    if (!user || !meeting) return false;
    if (hasRole('admin', user)) return true;
    if (hasRole('zone_admin', user)) {
      const userZoneAccess = user.zoneAccess || [];
      return userZoneAccess.includes(meeting.zoneId) || userZoneAccess.includes(meeting.zoneName);
    }
    return false;
  };

  useEffect(() => {
    fetchMeetingDay();
    fetchMeetings();
  }, []);

  const fetchMeetingDay = async () => {
    try {
      const response = await getSetting('district_meeting_day');
      if (response.success && response.value !== null) {
        const mDay = parseInt(response.value);
        setMeetingDay(mDay);
        calculateWeekRange(mDay);
      } else {
        calculateWeekRange(3);
      }
    } catch (e) {
      calculateWeekRange(3);
    }
  };

  const calculateWeekRange = (mDay) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const day = today.getDay();
    let start = new Date(today);
    let end = new Date(today);

    if (day === mDay) {
      // If today is the meeting day, we are analyzing the week that just finished
      start.setDate(today.getDate() - 7);
      end.setDate(today.getDate() - 1);
    } else {
      // Otherwise, we are in the current cycle starting from the most recent meeting day
      const diff = (day - mDay + 7) % 7;
      start.setDate(today.getDate() - diff);
      end.setDate(start.getDate() + 6);
    }
    
    setWeekRange({ start, end });
  };

  useEffect(() => {
    if (location.state?.viewMeetingId) {
      handleView(location.state.viewMeetingId);
      // Clear state to avoid reopening on refresh, but careful not to trigger re-renders loop if not needed.
      // Actually navigate replace is safer but might interrupt current view if it depends on meeting loaded.
      // For now, duplicate call protection isn't strictly necessary as it's just a fetch.
    }
  }, [location.state]);

  const fetchMeetings = async (pageNum = 1, isLoadMore = false) => {
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      // If district_admin (not admin), filter by districtAccess
      const isDistrictAdmin = hasRole('district_admin', user) && !hasRole('admin', user);
      const districts = isDistrictAdmin ? user.districtAccess?.join(',') : null;

      const limit = 20;
      const response = await getAllMeetings(districts, pageNum, limit);
      
      if (response.success) {
        const newMeetings = response.meetings || [];
        
        if (isLoadMore) {
          setMeetings(prev => [...prev, ...newMeetings]);
        } else {
          setMeetings(newMeetings);
        }
        
        // Check if there are more pages
        if (response.pagination) {
          setHasMore(pageNum < response.pagination.pages);
        } else {
          setHasMore(newMeetings.length === limit);
        }
        
        setPage(pageNum);
      } else {
        setError('മീറ്റിംഗ് ലിസ്റ്റ് ലഭിക്കുന്നതിൽ പിശക്');
      }
    } catch (err) {
      setError('മീറ്റിംഗ് ലിസ്റ്റ് ലഭിക്കുന്നതിൽ പിശക്: ' + err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchMeetings(page + 1, true);
    }
  };

  const handleView = async (meetingId) => {
    try {
      const response = await getMeetingReport(meetingId);
      if (response.success) {
        setSelectedMeetingData(response.meetingData);
        setSelectedReport(response.report);
      } else {
        alert('റിപ്പോർട്ട് ലഭിക്കുന്നതിൽ പിശക് (Error fetching report)');
      }
    } catch (err) {
      alert('റിപ്പോർട്ട് ലഭിക്കുന്നതിൽ പിശക് (Error fetching report): ' + err.message);
    }
  };

  const handleEdit = async (meetingId) => {
    try {
      const response = await getMeetingReport(meetingId);
      if (response.success) {
        // Navigate to form with meeting data
        // Store meeting data in sessionStorage or pass via state
        sessionStorage.setItem('editMeetingData', JSON.stringify({
          meetingId,
          ...response.meetingData,
        }));
        navigate('/form', {
          state: {
            editMeetingData: {
              meetingId,
              ...response.meetingData,
            },
          },
        });
        // The form component will need to check for editMeetingData on mount
      } else {
        alert('മീറ്റിംഗ് ഡാറ്റ ലഭിക്കുന്നതിൽ പിശക് (Error fetching meeting data)');
      }
    } catch (err) {
      alert('മീറ്റിംഗ് ഡാറ്റ ലഭിക്കുന്നതിൽ പിശക് (Error fetching meeting data): ' + err.message);
    }
  };

  const handleDelete = async (meetingId) => {
    if (!window.confirm('ഈ മീറ്റിംഗ് ഇല്ലാതാക്കണോ? (Are you sure you want to delete this meeting?)')) {
      return;
    }

    setDeletingId(meetingId);
    try {
      const response = await deleteMeeting(meetingId);
      if (response.success) {
        // Remove from list
        setMeetings(meetings.filter(m => m.meetingId !== meetingId));
        // Clear selected report if it was the deleted one
        if (selectedMeetingData && selectedMeetingData.meetingId === meetingId) {
          setSelectedReport(null);
          setSelectedMeetingData(null);
        }
        alert('മീറ്റിംഗ് ഇല്ലാതാക്കി');
      } else {
        alert('മീറ്റിംഗ് ഇല്ലാതാക്കുന്നതിൽ പിശക്');
      }
    } catch (err) {
      alert('മീറ്റിംഗ് ഇല്ലാതാക്കുന്നതിൽ പിശക് : ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const formatTime12h = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    let h = parseInt(hours, 10);
    const m = parseInt(minutes, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    return `${h}:${m < 10 ? '0' + m : m} ${ampm}`;
  };

  const handleCopyReport = () => {
    if (!selectedReport || !selectedMeetingData) return;

    let qhlsFormatted = selectedReport.qhlsStatus || 'QHLS ഡാറ്റയില്ല';

    // Format QHLS as a text table if data exists
    if (qhlsFormatted !== 'QHLS ഡാറ്റയില്ല' && qhlsFormatted.includes(',')) {
      const lines = qhlsFormatted.split('\n').filter(line => line.trim());
      if (lines.length > 0) {
        const rows = lines.map(line => line.split(',').map(cell => cell.trim()));
        const colWidths = [0, 0, 0, 0, 0];
        rows.forEach(row => {
          row.forEach((cell, i) => {
            if (i < 5 && cell.length > colWidths[i]) {
              colWidths[i] = cell.length;
            }
          });
        });

        const pad = (str, width) => (str || '').padEnd(width);
        const separator = ' | ';
        const header = rows[0];
        const dataRows = rows.slice(1);

        const headerLine = header.map((cell, i) => pad(cell, colWidths[i])).join(separator);
        const dividerLine = colWidths.map(w => '-'.repeat(w)).join('-|-');

        const bodyLines = dataRows.map(row =>
          row.map((cell, i) => pad(cell, colWidths[i])).join(separator)
        );

        qhlsFormatted = '```\n' + [headerLine, dividerLine, ...bodyLines].join('\n') + '\n```';
      }
    }

    const formatNameWithoutInitials = (fullName) => {
      if (!fullName) return '';
      const malayalamInitials = new Set([
        'എ', 'ബി', 'സി', 'ഡി', 'ഇ', 'എഫ്', 'ജി', 'എച്ച്', 'ഐ', 'ജെ', 
        'കെ', 'എൽ', 'എം', 'എൻ', 'ഒ', 'പി', 'ക്യു', 'ആർ', 'എസ്', 'ടി', 
        'യു', 'വി', 'ഡബ്ല്യു', 'എക്സ്', 'വൈ', 'ഇസഡ്',
        'ക', 'ഖ', 'ഗ', 'ഘ', 'ങ', 
        'ച', 'ഛ', 'ജ', 'ഝ', 'ഞ', 
        'ട', 'ഠ', 'ഡ', 'ഢ', 'ണ', 
        'ത', 'ഥ', 'ദ', 'ധ', 'ന', 
        'പ', 'ഫ', 'ബ', 'ഭ', 'മ', 
        'യ', 'ര', 'ല', 'വ', 'ശ', 'ഷ', 'സ', 'ഹ', 'ള', 'ഴ', 'റ',
        // Common combinations typed without space
        'പികെ', 'കെപി', 'വികെ', 'എംകെ', 'സിഎച്ച്', 'ടിയു',
        'വിപി', 'പിഎം', 'എകെ', 'പിടി', 'കെഎം', 'എംപി',
        'കെകെ', 'എഎ', 'ബിബി', 'സിസി', 'പിസി', 'ടിപി', 'വിവി'
      ]);
      
      // Split by space, dot, or comma to handle "name, p.k" or "name p k"
      return fullName.split(/[\s,]+/).filter(part => {
        // Remove dots, Zero Width Joiners, non-break spaces, and common invisible chars
        const cleanPart = part.replace(/[\.\u200B-\u200D\uFEFF]/g, '').trim();
        if (!cleanPart) return false;
        
        // Handle lower/upper case English initials (1-4 chars)
        // Check if character is strictly alphabetical and 1-2 chars long
        if (/^[a-zA-Z]{1,2}$/.test(cleanPart)) return false;
        // Check if it's all uppercase or exactly "pk", "kp", etc.
        if (/^[A-Z]{1,4}$/.test(cleanPart)) return false;
        if (/^[a-zA-Z]{1,4}$/.test(cleanPart) && cleanPart.toLowerCase().includes('pk')) return false; 
        if (/^[a-zA-Z]{1,4}$/.test(cleanPart) && cleanPart.toLowerCase().includes('kp')) return false;
        if (/^[a-zA-Z]{1,4}$/.test(cleanPart) && cleanPart.toLowerCase().includes('ch')) return false;

        if (malayalamInitials.has(cleanPart)) return false;
        return true;
      }).join(' ').trim();
    };

    // Look up role from attendance data
    const getRoleByName = (name) => {
      if (!name || !selectedMeetingData.attendance) return '';
      const person = selectedMeetingData.attendance.find(a => a.name === name);
      return person?.role || '';
    };

    const adhyakshanRole = getRoleByName(selectedMeetingData.adhyakshan);
    const formattedAdhyakshan = formatNameWithoutInitials(selectedMeetingData.adhyakshan);
    const adhyakshanLine = formattedAdhyakshan
      ? `മീറ്റിംഗിൽ ${adhyakshanRole} ${formattedAdhyakshan} അധ്യക്ഷനായിരുന്നു.`
      : '';

    let welcomeVoteLine = '';
    const sName = formatNameWithoutInitials(selectedMeetingData.swagatham);
    const nName = formatNameWithoutInitials(selectedMeetingData.nandhi);

    const sRole = getRoleByName(selectedMeetingData.swagatham);
    const nRole = getRoleByName(selectedMeetingData.nandhi);

    if (sName && nName) {
      welcomeVoteLine = `${sRole} ${sName} സ്വാഗതവും ${nRole} ${nName} നന്ദിയും പറഞ്ഞു.`;
    } else if (sName) {
      welcomeVoteLine = `${sRole} ${sName} സ്വാഗതം പറഞ്ഞു.`;
    } else if (nName) {
      welcomeVoteLine = `${nRole} ${nName} നന്ദി പറഞ്ഞു.`;
    }

    // Only include QHLS section if there's valid data
    const qhlsSection = qhlsFormatted && qhlsFormatted !== 'QHLS ഡാറ്റയില്ല' && qhlsFormatted.trim()
      ? `\nQHLS Status:\n${qhlsFormatted}`
      : '';

    const reportText = `*മീറ്റിംഗ് റിപ്പോർട്ട്*
━━━━━━━━━━━━━━━━
*മണ്ഡലം:* *${selectedMeetingData.zoneName}*

*തീയതി:* ${selectedMeetingData.date}
${selectedMeetingData.startTime ? `*തുടങ്ങിയ സമയം:* ${formatTime12h(selectedMeetingData.startTime)}` : ''}
${selectedMeetingData.endTime ? `*അവസാനിച്ച സമയം:* ${formatTime12h(selectedMeetingData.endTime)}` : ''}

*പങ്കെടുത്തവർ:*
${selectedReport.attendees || 'ആരുമില്ല'}

*ലീവ് ആയവർ:*
${selectedReport.leaveAayavar || 'ആരുമില്ല'}

*അജണ്ടകൾ:*
${selectedReport.agenda || 'അജണ്ടകളില്ല'}

*തീരുമാനങ്ങൾ:*
${selectedReport.minutes || 'തീരുമാനങ്ങളില്ല'}${qhlsSection}

${welcomeVoteLine ? welcomeVoteLine + '\n' : ''}
${adhyakshanLine ? adhyakshanLine + '\n' : ''}
`;



    navigator.clipboard.writeText(reportText).then(() => {
      alert('റിപ്പോർട്ട് കോപ്പി ചെയ്തു! (Report copied!)');
    }).catch(() => {
      alert('കോപ്പി ചെയ്യുന്നതിൽ പിശക് (Error copying)');
    });
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

  if (loading) {
    return (
      <div className="container">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          ലോഡ് ചെയ്യുന്നു... (Loading...)
        </div>
      </div>
    );
  }

  const filteredMeetings = meetings.filter(m => {
    const matchesSearch = !searchTerm || 
      (m.zoneName && m.zoneName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (m.date && m.date.includes(searchTerm));
    
    const matchesDate = !filterDate || m.date === filterDate;
    
    return matchesSearch && matchesDate;
  });

  const weekMeetings = filteredMeetings.filter(m => {
    if (!weekRange.start || !weekRange.end) return true;
    const mDate = new Date(m.date + 'T00:00:00');
    return mDate >= weekRange.start && mDate <= weekRange.end;
  });

  const olderMeetings = filteredMeetings.filter(m => {
    if (!weekRange.start || !weekRange.end) return false;
    const mDate = new Date(m.date + 'T00:00:00');
    return mDate < weekRange.start;
  });

  const formatDateShort = (d) => {
    if (!d) return '';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const renderMeetingsTable = (meetingList) => (
    <div style={{ overflowX: 'auto', marginBottom: '32px' }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        backgroundColor: '#fff',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <thead>
          <tr style={{ backgroundColor: '#3498db', color: '#fff' }}>
            <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>S.No</th>
            <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Saved Date</th>
            <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>മണ്ഡലം (Zone)</th>
            <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Meeting Date</th>
            <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #ddd' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {meetingList.map((meeting, index) => (
            <tr key={meeting.meetingId} style={{
              backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9'
            }}>
              <td style={{ padding: '12px', border: '1px solid #ddd' }}>{index + 1}</td>
              <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                {formatDate(meeting.savedDate)}
              </td>
              <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                {meeting.zoneName || '-'}
              </td>
              <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                {meeting.date || '-'}
              </td>
              <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  <button
                    onClick={() => handleView(meeting.meetingId)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#3498db',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    View
                  </button>
                  {canEdit(meeting) && (
                    <>
                      <button
                        onClick={() => handleEdit(meeting.meetingId)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#f39c12',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(meeting.meetingId)}
                        disabled={deletingId === meeting.meetingId}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#e74c3c',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: deletingId === meeting.meetingId ? 'not-allowed' : 'pointer',
                          opacity: deletingId === meeting.meetingId ? 0.6 : 1,
                          fontSize: '14px'
                        }}
                      >
                        {deletingId === meeting.meetingId ? 'Deleting...' : 'Delete'}
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="container" style={{ paddingBottom: '30px' }}>
      <div style={{ marginBottom: '24px', textAlign: 'center' }}>
        <h1 style={{ marginBottom: '4px' }}>മീറ്റിംഗ് റിപ്പോർട്ടുകൾ (Meeting Reports)</h1>
        {weekRange.start && weekRange.end && (
          <div style={{ 
            fontSize: '0.95rem', 
            color: 'var(--primary)', 
            fontWeight: '700',
            background: 'var(--primary-light)',
            display: 'inline-block',
            padding: '6px 16px',
            borderRadius: '20px',
            marginTop: '8px'
          }}>
            📅 Reporting Week: {formatDateShort(weekRange.start)} - {formatDateShort(weekRange.end)}
          </div>
        )}
      </div>

      {error && <div className="error" style={{ marginBottom: '20px', textAlign: 'center' }}>{error}</div>}

      {!selectedReport ? (
        <>
          {/* Filters */}
          <div style={{ 
            display: 'flex', 
            gap: '15px', 
            marginBottom: '30px', 
            flexWrap: 'wrap',
            alignItems: 'center',
            background: 'var(--white)',
            padding: '20px',
            borderRadius: '16px',
            boxShadow: 'var(--shadow-md)',
            border: '1px solid var(--gray-100)'
          }}>
            <div style={{ flex: '2', minWidth: '250px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--gray-500)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Search Zone or Date
              </label>
              <input
                type="text"
                placeholder="🔎 മണ്ഡലം അല്ലെങ്കിൽ തീയതി തിരയുക..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1px solid var(--gray-200)',
                  fontSize: '1rem',
                  background: 'var(--gray-50)'
                }}
              />
            </div>
            
            <div style={{ flex: '1', minWidth: '180px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--gray-500)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Pick Specific Date
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--gray-200)',
                    fontSize: '1rem',
                    background: 'var(--gray-50)'
                  }}
                />
              </div>
            </div>

            {(searchTerm || filterDate) && (
              <button 
                onClick={() => {
                  setSearchTerm('');
                  setFilterDate('');
                }}
                style={{
                  marginTop: '22px',
                  padding: '10px 20px',
                  background: 'var(--gray-100)',
                  color: 'var(--gray-700)',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'var(--gray-200)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'var(--gray-100)'}
              >
                ✕ Clear All
              </button>
            )}
          </div>

          {filteredMeetings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
              ഒരു മീറ്റിംഗും കണ്ടെത്തിയില്ല (No meetings found)
            </div>
          ) : (
            <div>
              {weekMeetings.length > 0 && (
                <>
                  <h2 style={{ fontSize: '1.2rem', color: 'var(--primary)', marginBottom: '12px' }}>
                    ഈ ആഴ്ചയിലെ റിപ്പോർട്ടുകൾ (This Week)
                  </h2>
                  {renderMeetingsTable(weekMeetings)}
                </>
              )}

              {olderMeetings.length > 0 && (
                <>
                  <h2 style={{ fontSize: '1.2rem', color: 'var(--gray-600)', marginBottom: '12px', marginTop: '40px' }}>
                    പഴയ റിപ്പോർട്ടുകൾ (Older Reports)
                  </h2>
                  {renderMeetingsTable(olderMeetings)}
                </>
              )}

              {hasMore && (
                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                  <button 
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="btn btn-secondary"
                    style={{ padding: '10px 24px', fontSize: '1rem' }}
                  >
                    {loadingMore ? 'ലോഡ് ചെയ്യുന്നു...' : 'കൂടുതൽ റിപ്പോർട്ടുകൾ കാണുക (Load More)'}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div>
          <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
            <button
              onClick={() => {
                setSelectedReport(null);
                setSelectedMeetingData(null);
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#95a5a6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              ← Back to List
            </button>
            <button
              onClick={handleCopyReport}
              style={{
                padding: '8px 16px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Copy Report
            </button>
          </div>

          <div className="report-container">
            <div className="report-section">
              <h2>മീറ്റിംഗ് വിവരങ്ങൾ (Meeting Details)</h2>
              <p><strong>മണ്ഡലം (Zone):</strong> {selectedMeetingData.zoneName}</p>
              <p><strong>തീയതി (Date):</strong> {selectedMeetingData.date}</p>
              {selectedMeetingData.startTime && (
                <p><strong>തുടങ്ങിയ സമയം (Start Time):</strong> {formatTime12h(selectedMeetingData.startTime)}</p>
              )}
              {selectedMeetingData.endTime && (
                <p><strong>അവസാനിച്ച സമയം (End Time):</strong> {formatTime12h(selectedMeetingData.endTime)}</p>
              )}
            </div>

            <div className="report-section">
              <h2>പങ്കെടുത്തവർ:</h2>
              <pre className="report-content">{selectedReport.attendees || 'ആരുമില്ല'}</pre>
            </div>

            <div className="report-section">
              <h2>ലീവ് ആയവർ:</h2>
              <pre className="report-content">{selectedReport.leaveAayavar || 'ആരുമില്ല'}</pre>
            </div>

            <div className="report-section">
              <h2>അജണ്ടകൾ:</h2>
              <pre className="report-content">{selectedReport.agenda || 'അജണ്ടകളില്ല'}</pre>
            </div>

            <div className="report-section">
              <h2>തീരുമാനങ്ങൾ:</h2>
              <pre className="report-content">{selectedReport.minutes || 'തീരുമാനങ്ങളില്ല'}</pre>
            </div>

            {selectedReport.qhlsStatus && selectedReport.qhlsStatus.trim() && (
              <div className="report-section">
                <h2>QHLS Status:</h2>
                <pre className="report-content">{selectedReport.qhlsStatus}</pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingReport;
