import React from 'react';
import { PlusIcon, CloseIcon } from './AgendaSelector';

const MeetingMinutes = ({ minutes, onMinutesChange, onAddMinute, onRemoveMinute }) => {
  const handleAddRow = (index) => {
    const isLastRow = index === minutes.length - 1;
    const value = (minutes[index] || '').trim();
    if (!isLastRow || !value) {
      return;
    }
    onAddMinute('');
  };

  const lastIndex = minutes.length - 1;
  const canAddAnother = minutes.length > 0 && (minutes[lastIndex] || '').trim().length > 0;

  return (
    <div className="form-group">
      <label>മീറ്റിംഗ് തീരുമാനങ്ങൾ</label>

      {minutes.map((minute, index) => {
        const hasContent = minute.trim().length > 0;

        return (
          <div key={index} className="row-item minute-row">
            <span className="row-num nums">{index + 1}</span>
            <textarea
              placeholder={`തീരുമാനം ${index + 1} എഴുതുക...`}
              value={minute}
              onChange={(e) => onMinutesChange(index, e.target.value)}
              rows="2"
              aria-label={`തീരുമാനം ${index + 1}`}
            />
            {hasContent && (
              <button
                type="button"
                onClick={() => onRemoveMinute(index)}
                className="icon-btn"
                aria-label="തീരുമാനം നീക്കം ചെയ്യുക"
              >
                <CloseIcon />
              </button>
            )}
          </div>
        );
      })}

      {minutes.length > 0 && (
        <button
          type="button"
          onClick={() => handleAddRow(lastIndex)}
          disabled={!canAddAnother}
          className="add-row"
        >
          <PlusIcon />
          തീരുമാനം ചേർക്കുക
        </button>
      )}

      {minutes.length === 0 && (
        <div className="empty-note">
          തീരുമാനങ്ങൾ ചേർക്കുക
        </div>
      )}
    </div>
  );
};

export default MeetingMinutes;
