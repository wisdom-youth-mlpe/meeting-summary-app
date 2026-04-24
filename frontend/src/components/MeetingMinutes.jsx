import React from 'react';

const MeetingMinutes = ({ minutes, onMinutesChange, onAddMinute, onRemoveMinute }) => {
  const handleAddRow = (index) => {
    const isLastRow = index === minutes.length - 1;
    const value = (minutes[index] || '').trim();
    if (!isLastRow || !value) {
      return;
    }
    onAddMinute('');
  };

  const styles = {
    minuteCard: {
      marginBottom: '12px',
      padding: '16px',
      background: '#ffffff',
      border: '2px solid #e0e0e0',
      borderRadius: '14px',
      display: 'flex',
      gap: '12px',
      alignItems: 'flex-start',
      transition: 'all 0.2s ease',
    },
    number: {
      minWidth: '36px',
      height: '36px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #00b894, #00a884)',
      color: 'white',
      borderRadius: '50%',
      fontSize: '0.9rem',
      fontWeight: '700',
      flexShrink: 0,
    },
    textareaWrapper: {
      flex: 1,
      minWidth: 0,
    },
    textarea: {
      width: '100%',
      padding: '12px 16px',
      border: '2px solid #e0e0e0',
      borderRadius: '12px',
      fontSize: '0.95rem',
      fontFamily: 'inherit',
      resize: 'vertical',
      minHeight: '80px',
      transition: 'all 0.2s ease',
    },
    buttonGroup: {
      display: 'flex',
      gap: '8px',
      flexShrink: 0,
    },
    addBtn: {
      width: '40px',
      height: '40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #00b894, #00a884)',
      color: 'white',
      border: 'none',
      borderRadius: '50%',
      fontSize: '1.3rem',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      boxShadow: '0 2px 8px rgba(0, 184, 148, 0.3)',
    },
    addBtnDisabled: {
      background: '#b7e1c3',
      cursor: 'not-allowed',
      boxShadow: 'none',
    },
    removeBtn: {
      width: '40px',
      height: '40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'transparent',
      color: '#ff7675',
      border: '2px solid #ff7675',
      borderRadius: '50%',
      fontSize: '1.3rem',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    },
    emptyState: {
      textAlign: 'center',
      padding: '32px',
      color: '#9e9e9e',
      fontStyle: 'italic',
      background: 'linear-gradient(135deg, #f5f5f5, #eeeeee)',
      borderRadius: '14px',
      border: '2px dashed #e0e0e0',
    },
  };

  return (
    <div className="form-group">
      <label>മീറ്റിംഗ് തീരുമാനങ്ങൾ</label>

      {minutes.map((minute, index) => {
        const isLastRow = index === minutes.length - 1;
        const canAddAnother = isLastRow && minute.trim().length > 0;
        const hasContent = minute.trim().length > 0;

        return (
          <div
            key={index}
            style={{
              ...styles.minuteCard,
              borderColor: hasContent ? '#55efc4' : '#e0e0e0',
            }}
          >
            <span style={styles.number}>{index + 1}</span>

            <div style={styles.textareaWrapper}>
              <textarea
                placeholder={`തീരുമാനം ${index + 1} എഴുതുക...`}
                value={minute}
                onChange={(e) => onMinutesChange(index, e.target.value)}
                rows="3"
                style={styles.textarea}
              />
            </div>

            <div style={styles.buttonGroup}>
              {isLastRow && (
                <button
                  type="button"
                  onClick={() => handleAddRow(index)}
                  disabled={!canAddAnother}
                  style={{
                    ...styles.addBtn,
                    ...(canAddAnother ? {} : styles.addBtnDisabled),
                  }}
                  aria-label="തീരുമാനം ചേർക്കുക"
                >
                  +
                </button>
              )}
              {hasContent && (
                <button
                  type="button"
                  onClick={() => onRemoveMinute(index)}
                  style={styles.removeBtn}
                  aria-label="തീരുമാനം നീക്കം ചെയ്യുക"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        );
      })}

      {minutes.length === 0 && (
        <div style={styles.emptyState}>
          തീരുമാനങ്ങൾ ചേർക്കുക
        </div>
      )}
    </div>
  );
};

export default MeetingMinutes;
