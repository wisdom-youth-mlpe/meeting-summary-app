import React, { useState } from 'react';
import { CloseIcon, PlusIcon } from './AgendaSelector';

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

  if (!attendees || attendees.length === 0) {
    return (
      <div className="form-group">
        <label>പങ്കെടുത്തവർ</label>
        <div className="empty-note">
          ദയവായി ഒരു മണ്ഡലം തിരഞ്ഞെടുക്കുക
        </div>
      </div>
    );
  }

  const presentCount = attendees.filter((attendee) => {
    const key = `${attendee.name}_${attendee.role || ''}`;
    return (attendance[key]?.status || 'present') === 'present';
  }).length;

  return (
    <div className="form-group">
      <div className="section-head">
        <h3>പങ്കെടുത്തവർ ({attendees.length})</h3>
        <span className="count">{presentCount} / {attendees.length}</span>
      </div>

      {attendees.map((attendee, index) => {
        const attendeeKey = `${attendee.name}_${attendee.role || ''}`;
        const currentAttendance = attendance[attendeeKey] || { status: 'present', reason: '' };
        const isPresent = currentAttendance.status === 'present';
        const isLeave = currentAttendance.status === 'leave';

        return (
          <div key={index} className="row-item attendee-row">
            <div className="row-name">
              {attendee.name}
              {attendee.role && <span className="row-sub">{attendee.role}</span>}
            </div>

            <div className="toggle" role="group" aria-label={attendee.name}>
              <button
                type="button"
                className={isPresent ? 'on' : ''}
                aria-pressed={isPresent}
                onClick={() => onAttendanceChange(attendeeKey, 'present', '')}
              >
                Present
              </button>
              <button
                type="button"
                className={isLeave ? 'on warn' : ''}
                aria-pressed={isLeave}
                onClick={() => onAttendanceChange(attendeeKey, 'leave', '')}
              >
                Leave
              </button>
              {attendee.isExtra && onRemoveExtraAttendee && (
                <button
                  type="button"
                  onClick={() => onRemoveExtraAttendee(index)}
                  className="icon-btn"
                  aria-label={`${attendee.name} നീക്കം ചെയ്യുക`}
                >
                  <CloseIcon />
                </button>
              )}
            </div>

            {isLeave && (
              <div className="leave-detail">
                <label className="check" htmlFor={`leave-not-informed-${index}`}>
                  <input
                    type="checkbox"
                    id={`leave-not-informed-${index}`}
                    checked={currentAttendance.leaveNotInformed || false}
                    onChange={(e) => {
                      const isChecked = e.target.checked;
                      onAbsenceReasonChange(attendeeKey, isChecked ? '' : currentAttendance.reason, isChecked);
                    }}
                  />
                  ലീവ് അറിയിച്ചിട്ടില്ല
                </label>
                <input
                  type="text"
                  placeholder="ലീവ് കാരണം എഴുതുക..."
                  value={currentAttendance.reason || ''}
                  onChange={(e) => onAbsenceReasonChange(attendeeKey, e.target.value, currentAttendance.leaveNotInformed)}
                  disabled={currentAttendance.leaveNotInformed}
                  required={!currentAttendance.leaveNotInformed}
                  aria-label="ലീവ് കാരണം"
                />
              </div>
            )}
          </div>
        );
      })}

      <details className="add-extra">
        <summary>
          <PlusIcon />
          അധിക പങ്കെടുത്തവർ ചേർക്കുക
        </summary>
        <div className="add-extra-fields">
          <div>
            <label htmlFor="extra-name">പേര്</label>
            <input
              id="extra-name"
              type="text"
              value={extraName}
              onChange={(e) => setExtraName(e.target.value)}
              placeholder="പേര് എഴുതുക"
            />
          </div>
          <div>
            <label htmlFor="extra-role">ഭാരവാഹിത്വം</label>
            <input
              id="extra-role"
              type="text"
              value={extraRole}
              onChange={(e) => setExtraRole(e.target.value)}
              placeholder="ഭാരവാഹിത്വം എഴുതുക"
            />
          </div>
          <button
            type="button"
            onClick={handleAddExtra}
            disabled={!extraName.trim()}
          >
            + ചേർക്കുക
          </button>
        </div>
      </details>
    </div>
  );
};

export default AttendeeList;
