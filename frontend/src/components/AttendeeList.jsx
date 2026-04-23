import React, { useState } from 'react';

const AttendeeList = ({ attendees, attendance, onAttendanceChange, onAbsenceReasonChange, onAddExtraAttendee, onRemoveExtraAttendee }) => {
  const [extraName, setExtraName] = useState('');
  const [extraRole, setExtraRole] = useState('');

  const handleAddExtra = () => {
    if (extraName.trim()) {
      onAddExtraAttendee({ name: extraName.trim(), role: extraRole.trim() });
      setExtraName('');
      setExtraRole('');
    }
  };

  const styles = {
    emptyState: {
      textAlign: 'center',
      padding: '32px 24px',
      color: 'var(--gray-400)',
      fontStyle: 'italic',
      background: 'var(--gray-50)',
      borderRadius: 'var(--radius-lg)',
      border: '2px dashed var(--gray-100)',
      fontWeight: '600',
    },
    attendeeCard: {
      padding: '20px',
      marginBottom: '16px',
      background: 'var(--white)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--gray-100)',
      boxShadow: 'var(--shadow-sm)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    },
    attendeeName: {
      fontWeight: '800',
      fontSize: '1rem',
      color: 'var(--accent)',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      letterSpacing: '-0.01em',
    },
    roleTag: {
      fontSize: '0.7rem',
      padding: '4px 12px',
      background: 'var(--gray-100)',
      color: 'var(--gray-600)',
      borderRadius: 'var(--radius-full)',
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    },
    radioContainer: {
      display: 'flex',
      gap: '12px',
      flexWrap: 'wrap',
      alignItems: 'center',
    },
    radioLabel: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      padding: '10px 24px',
      borderRadius: 'var(--radius-full)',
      cursor: 'pointer',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      fontSize: '0.85rem',
      fontWeight: '800',
      letterSpacing: '0.02em',
      textTransform: 'uppercase',
      border: '1px solid var(--gray-100)',
      background: 'var(--gray-50)',
      color: 'var(--gray-500)',
    },
    presentLabel: (isChecked) => ({
      background: isChecked ? 'var(--primary)' : 'var(--gray-50)',
      color: isChecked ? 'var(--accent)' : 'var(--gray-500)',
      borderColor: isChecked ? 'var(--primary)' : 'var(--gray-100)',
      boxShadow: isChecked ? 'var(--shadow-glow)' : 'none',
    }),
    leaveLabel: (isChecked) => ({
      background: isChecked ? 'var(--danger)' : 'var(--gray-50)',
      color: isChecked ? 'var(--white)' : 'var(--gray-500)',
      borderColor: isChecked ? 'var(--danger)' : 'var(--gray-100)',
    }),
    hiddenRadio: {
      position: 'absolute',
      opacity: 0,
      pointerEvents: 'none',
    },
    reasonInput: {
      marginTop: '16px',
      width: '100%',
      padding: '14px 18px',
      border: '1px solid var(--gray-100)',
      borderRadius: 'var(--radius-md)',
      fontSize: '0.9rem',
      background: 'var(--gray-50)',
      fontWeight: '600',
    },
    addSection: {
      marginTop: '32px',
      padding: '24px',
      background: 'var(--white)',
      borderRadius: 'var(--radius-xl)',
      border: '1px solid var(--gray-100)',
      boxShadow: 'var(--shadow-md)',
    },
    addTitle: {
      marginTop: 0,
      marginBottom: '20px',
      fontSize: '0.9rem',
      color: 'var(--accent)',
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    },
    inputGroup: {
      display: 'flex',
      gap: '16px',
      flexWrap: 'wrap',
      alignItems: 'flex-end',
    },
    inputWrapper: {
      flex: 1,
      minWidth: '200px',
    },
    inputLabel: {
      display: 'block',
      marginBottom: '8px',
      fontSize: '0.7rem',
      color: 'var(--gray-400)',
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    },
    input: {
      width: '100%',
      padding: '12px 18px',
      border: '1px solid var(--gray-100)',
      borderRadius: 'var(--radius-md)',
      fontSize: '0.95rem',
      background: 'var(--gray-50)',
      fontWeight: '600',
      transition: 'all 0.2s ease',
    },
    addButton: {
      padding: '14px 32px',
      background: 'var(--accent)',
      color: 'var(--white)',
      border: 'none',
      borderRadius: 'var(--radius-full)',
      fontSize: '0.9rem',
      fontWeight: '800',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    },
    addButtonDisabled: {
      background: 'var(--gray-200)',
      color: 'var(--gray-400)',
      cursor: 'not-allowed',
    },
    removeButton: {
      padding: '8px',
      background: 'var(--gray-50)',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 'var(--radius-full)',
      transition: 'all 0.2s ease',
      position: 'absolute',
      top: '12px',
      right: '12px',
      color: 'var(--danger)',
    },
  };

  if (!attendees || attendees.length === 0) {
    return (
      <div className="form-group">
        <label>പങ്കെടുത്തവർ</label>
        <div style={styles.emptyState}>
          ദയവായി ഒരു മണ്ഡലം തിരഞ്ഞെടുക്കുക
        </div>
      </div>
    );
  }

  return (
    <div className="form-group">
      <label>പങ്കെടുത്തവർ ({attendees.length})</label>

      {attendees.map((attendee, index) => {
        const attendeeKey = `${attendee.name}_${attendee.role || ''}`;
        const currentAttendance = attendance[attendeeKey] || { status: 'present', reason: '' };
        const isPresent = currentAttendance.status === 'present';
        const isLeave = currentAttendance.status === 'leave';

        return (
          <div
            key={index}
            style={{
              ...styles.attendeeCard,
              borderColor: isPresent ? '#55efc4' : isLeave ? '#fab1a0' : '#eeeeee',
              position: 'relative',
            }}
          >
            {attendee.isExtra && onRemoveExtraAttendee && (
              <button
                type="button"
                onClick={() => onRemoveExtraAttendee(index)}
                style={styles.removeButton}
                aria-label={`${attendee.name} നീക്കം ചെയ്യുക`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </button>
            )}
            <div style={styles.attendeeName}>
              <span>{attendee.name}</span>
              {attendee.role && (
                <span style={styles.roleTag}>{attendee.role}</span>
              )}
            </div>

            <div style={styles.radioContainer}>
              <label
                style={{
                  ...styles.radioLabel,
                  ...styles.presentLabel(isPresent),
                }}
              >
                <input
                  type="radio"
                  name={`attendance-${index}`}
                  value="present"
                  checked={isPresent}
                  onChange={() => onAttendanceChange(attendeeKey, 'present', '')}
                  style={styles.hiddenRadio}
                />
                Present
              </label>

              <label
                style={{
                  ...styles.radioLabel,
                  ...styles.leaveLabel(isLeave),
                }}
              >
                <input
                  type="radio"
                  name={`attendance-${index}`}
                  value="leave"
                  checked={isLeave}
                  onChange={() => onAttendanceChange(attendeeKey, 'leave', '')}
                  style={styles.hiddenRadio}
                />
                Leave
              </label>
            </div>

            {isLeave && (
              <div style={{ marginTop: '12px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '8px',
                }}>
                  <input
                    type="checkbox"
                    id={`leave-not-informed-${index}`}
                    checked={currentAttendance.leaveNotInformed || false}
                    onChange={(e) => {
                      const isChecked = e.target.checked;
                      onAbsenceReasonChange(attendeeKey, isChecked ? '' : currentAttendance.reason, isChecked);
                    }}
                    style={{
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer',
                      accentColor: '#ff7675',
                    }}
                  />
                  <label
                    htmlFor={`leave-not-informed-${index}`}
                    style={{
                      fontSize: '0.9rem',
                      color: '#616161',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    ലീവ് അറിയിച്ചിട്ടില്ല
                  </label>
                </div>
                <input
                  type="text"
                  placeholder="ലീവ് കാരണം എഴുതുക..."
                  value={currentAttendance.reason || ''}
                  onChange={(e) => onAbsenceReasonChange(attendeeKey, e.target.value, currentAttendance.leaveNotInformed)}
                  disabled={currentAttendance.leaveNotInformed}
                  required={!currentAttendance.leaveNotInformed}
                  style={{
                    ...styles.reasonInput,
                    opacity: currentAttendance.leaveNotInformed ? 0.5 : 1,
                    cursor: currentAttendance.leaveNotInformed ? 'not-allowed' : 'text',
                  }}
                />
              </div>
            )}
          </div>
        );
      })}

      <div style={styles.addSection}>
        <h4 style={styles.addTitle}>അധിക പങ്കെടുത്തവർ ചേർക്കുക</h4>
        <div style={styles.inputGroup}>
          <div style={styles.inputWrapper}>
            <label style={styles.inputLabel}>പേര്</label>
            <input
              type="text"
              value={extraName}
              onChange={(e) => setExtraName(e.target.value)}
              placeholder="പേര് എഴുതുക"
              style={styles.input}
            />
          </div>
          <div style={styles.inputWrapper}>
            <label style={styles.inputLabel}>റോൾ</label>
            <input
              type="text"
              value={extraRole}
              onChange={(e) => setExtraRole(e.target.value)}
              placeholder="റോൾ എഴുതുക"
              style={styles.input}
            />
          </div>
          <button
            type="button"
            onClick={handleAddExtra}
            disabled={!extraName.trim()}
            style={{
              ...styles.addButton,
              ...(extraName.trim() ? {} : styles.addButtonDisabled),
            }}
          >
            + ചേർക്കുക
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttendeeList;
