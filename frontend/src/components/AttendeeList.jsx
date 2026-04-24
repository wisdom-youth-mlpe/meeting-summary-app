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
      padding: '24px',
      color: '#9e9e9e',
      fontStyle: 'italic',
      background: 'linear-gradient(135deg, #f5f5f5, #eeeeee)',
      borderRadius: '12px',
      border: '2px dashed #e0e0e0',
    },
    attendeeCard: {
      padding: '16px',
      marginBottom: '12px',
      background: '#ffffff',
      borderRadius: '12px',
      border: '2px solid #eeeeee',
      transition: 'all 0.2s ease',
    },
    attendeeName: {
      fontWeight: '600',
      fontSize: '1rem',
      color: '#424242',
      marginBottom: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    roleTag: {
      fontSize: '0.75rem',
      padding: '4px 10px',
      background: 'linear-gradient(135deg, #a29bfe, #6c5ce7)',
      color: 'white',
      borderRadius: '20px',
      fontWeight: '500',
    },
    radioContainer: {
      display: 'flex',
      gap: '16px',
      flexWrap: 'wrap',
      alignItems: 'center',
    },
    radioLabel: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 16px',
      borderRadius: '20px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      fontSize: '0.9rem',
      fontWeight: '500',
    },
    presentLabel: (isChecked) => ({
      background: isChecked ? 'linear-gradient(135deg, #00b894, #00a884)' : '#f5f5f5',
      color: isChecked ? 'white' : '#616161',
      border: isChecked ? 'none' : '1px solid #e0e0e0',
    }),
    leaveLabel: (isChecked) => ({
      background: isChecked ? 'linear-gradient(135deg, #ff7675, #e74c3c)' : '#f5f5f5',
      color: isChecked ? 'white' : '#616161',
      border: isChecked ? 'none' : '1px solid #e0e0e0',
    }),
    hiddenRadio: {
      position: 'absolute',
      opacity: 0,
      pointerEvents: 'none',
    },
    reasonInput: {
      marginTop: '12px',
      width: '100%',
      padding: '12px 16px',
      border: '2px solid #fab1a0',
      borderRadius: '10px',
      fontSize: '0.9rem',
      background: '#fff5f5',
    },
    addSection: {
      marginTop: '20px',
      padding: '20px',
      background: 'linear-gradient(135deg, #f0f0ff, #e8e8ff)',
      borderRadius: '16px',
      border: '2px solid #a29bfe',
    },
    addTitle: {
      marginTop: 0,
      marginBottom: '16px',
      fontSize: '1rem',
      color: '#6c5ce7',
      fontWeight: '600',
    },
    inputGroup: {
      display: 'flex',
      gap: '12px',
      flexWrap: 'wrap',
      alignItems: 'flex-end',
    },
    inputWrapper: {
      flex: 1,
      minWidth: '150px',
    },
    inputLabel: {
      display: 'block',
      marginBottom: '6px',
      fontSize: '0.85rem',
      color: '#616161',
      fontWeight: '500',
    },
    input: {
      width: '100%',
      padding: '12px 16px',
      border: '2px solid #e0e0e0',
      borderRadius: '10px',
      fontSize: '0.95rem',
      transition: 'all 0.2s ease',
    },
    addButton: {
      padding: '12px 24px',
      background: 'linear-gradient(135deg, #00b894, #00a884)',
      color: 'white',
      border: 'none',
      borderRadius: '10px',
      fontSize: '0.9rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      minWidth: '120px',
      justifyContent: 'center',
    },
    addButtonDisabled: {
      background: '#bdbdbd',
      cursor: 'not-allowed',
    },
    removeButton: {
      padding: '6px',
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '6px',
      transition: 'all 0.2s ease',
      position: 'absolute',
      top: '8px',
      right: '8px',
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
                  stroke="#ff7675"
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
