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
      const response = await getAllMeetings(districts, pageNum, limit, searchTerm, filterDate);
      
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

  // Trigger search on term/date change with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page === 1) {
        fetchMeetings(1);
      } else {
        setPage(1);
        setMeetings([]);
        fetchMeetings(1);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, filterDate]);

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
        <div className="loading">
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

  const formatDateDisplay = (dateString) => {
    if (!dateString) return '-';
    // dateString is YYYY-MM-DD
    const date = new Date(dateString + 'T00:00:00');
    const day = String(date.getDate()).padStart(2, '0');
    const month = date.toLocaleDateString('en-IN', { month: 'short' });
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const renderActions = (meeting) => (
    <div className="meeting-actions">
      <button type="button" onClick={() => handleView(meeting.meetingId)}>
        റിപ്പോർട്ട്
      </button>
      {canEdit(meeting) && (
        <>
          <button type="button" className="btn-secondary" onClick={() => handleEdit(meeting.meetingId)}>
            Edit
          </button>
          <button
            type="button"
            className="btn-quiet danger"
            onClick={() => handleDelete(meeting.meetingId)}
            disabled={deletingId === meeting.meetingId}
          >
            {deletingId === meeting.meetingId ? 'Deleting...' : 'Delete'}
          </button>
        </>
      )}
    </div>
  );

  // One collapsed card per meeting; the actions open on tap
  const renderMeetingsTable = (meetingList) => (
    <ol className="report-cards">
      {meetingList.map((meeting) => (
        <li key={meeting.meetingId}>
          <details className="report-card">
            <summary>
              <span className="report-card-text">
                <span className="report-card-date nums">{formatDateDisplay(meeting.date)}</span>
                <span className="report-card-meta">
                  <span className="nums">Saved {formatDate(meeting.savedDate)}</span>
                  {meeting.zoneName && <span> · {meeting.zoneName}</span>}
                </span>
              </span>
              <svg className="chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </summary>
            {renderActions(meeting)}
          </details>
        </li>
      ))}
    </ol>
  );

  const CollapsibleSection = ({ title, children, defaultExpanded = true }) => (
    <details className="report-section collapsible" open={defaultExpanded}>
      <summary>
        <h2>{title}</h2>
        <svg className="chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </summary>
      <div className="collapsible-body">{children}</div>
    </details>
  );

  return (
    <div className="container">
      <div className="page-head">
        <h1>മീറ്റിംഗ് റിപ്പോർട്ടുകൾ (Meeting Reports)</h1>
        {weekRange.start && weekRange.end && (
          <span className="week-tag nums">
            Reporting Week: {formatDateShort(weekRange.start)} - {formatDateShort(weekRange.end)}
          </span>
        )}
      </div>

      {error && <div className="error">{error}</div>}

      {!selectedReport ? (
        <>
          <details className="filter-panel" open={Boolean(searchTerm || filterDate)}>
            <summary>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              Filter
              {(searchTerm || filterDate) && <span className="filter-dot" aria-label="Filter on" />}
              <svg className="chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </summary>
            <div className="filter-bar">
              <div className="filter-search">
                <label htmlFor="report-search">Search Zone or Date</label>
                <input
                  id="report-search"
                  type="text"
                  placeholder="മണ്ഡലം അല്ലെങ്കിൽ തീയതി തിരയുക..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="filter-date">
                <label htmlFor="report-date">Pick Specific Date</label>
                <input
                  id="report-date"
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                />
              </div>

              {(searchTerm || filterDate) && (
                <button
                  type="button"
                  className="btn-quiet"
                  onClick={() => {
                    setSearchTerm('');
                    setFilterDate('');
                  }}
                >
                  ✕ Clear All
                </button>
              )}
            </div>
          </details>

          {filteredMeetings.length === 0 ? (
            <div className="empty-note">
              ഒരു മീറ്റിംഗും കണ്ടെത്തിയില്ല (No meetings found)
            </div>
          ) : (
            <div>
              {weekMeetings.length > 0 && (
                <section className="report-group">
                  <h2>ഈ ആഴ്ചയിലെ റിപ്പോർട്ടുകൾ (This Week)</h2>
                  {renderMeetingsTable(weekMeetings)}
                </section>
              )}

              {olderMeetings.length > 0 && (
                <section className="report-group">
                  <h2 className="muted">പഴയ റിപ്പോർട്ടുകൾ (Older Reports)</h2>
                  {renderMeetingsTable(olderMeetings)}
                </section>
              )}

              {hasMore && (
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="btn-secondary load-more"
                >
                  {loadingMore ? 'ലോഡ് ചെയ്യുന്നു...' : 'കൂടുതൽ റിപ്പോർട്ടുകൾ കാണുക (Load More)'}
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        <div>
          <div className="report-toolbar">
            <button
              type="button"
              className="btn-quiet"
              onClick={() => {
                setSelectedReport(null);
                setSelectedMeetingData(null);
              }}
            >
              ← Back to List
            </button>
            <button type="button" onClick={handleCopyReport}>
              Copy Report
            </button>
          </div>

          <div className="report-container">
            <CollapsibleSection title="മീറ്റിംഗ് വിവരങ്ങൾ (Meeting Details)">
              <dl className="detail-list">
                <dt>മണ്ഡലം (Zone)</dt><dd>{selectedMeetingData.zoneName}</dd>
                <dt>തീയതി (Date)</dt><dd className="nums">{selectedMeetingData.date}</dd>
                {selectedMeetingData.startTime && (
                  <><dt>തുടങ്ങിയ സമയം (Start Time)</dt><dd className="nums">{formatTime12h(selectedMeetingData.startTime)}</dd></>
                )}
                {selectedMeetingData.endTime && (
                  <><dt>അവസാനിച്ച സമയം (End Time)</dt><dd className="nums">{formatTime12h(selectedMeetingData.endTime)}</dd></>
                )}
              </dl>
            </CollapsibleSection>

            <CollapsibleSection title="പങ്കെടുത്തവർ (Attendees)">
              <pre className="report-content">{selectedReport.attendees || 'ആരുമില്ല'}</pre>
            </CollapsibleSection>

            <CollapsibleSection title="ലീവ് ആയവർ (Leave)">
              <pre className="report-content">{selectedReport.leaveAayavar || 'ആരുമില്ല'}</pre>
            </CollapsibleSection>

            <CollapsibleSection title="അജണ്ടകൾ (Agendas)">
              <pre className="report-content">{selectedReport.agenda || 'അജണ്ടകളില്ല'}</pre>
            </CollapsibleSection>

            <CollapsibleSection title="തീരുമാനങ്ങൾ (Minutes)">
              <pre className="report-content">{selectedReport.minutes || 'തീരുമാനങ്ങളില്ല'}</pre>
            </CollapsibleSection>

            {selectedReport.qhlsStatus && selectedReport.qhlsStatus.trim() && (
              <CollapsibleSection title="QHLS Status">
                <pre className="report-content">{selectedReport.qhlsStatus}</pre>
              </CollapsibleSection>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingReport;
