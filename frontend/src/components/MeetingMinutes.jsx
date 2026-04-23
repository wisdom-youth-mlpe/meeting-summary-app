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
      marginBottom: '16px',
      padding: '20px',
      background: 'var(--white)',
      border: '1px solid var(--gray-100)',
      borderRadius: 'var(--radius-lg)',
      display: 'flex',
      gap: '16px',
      alignItems: 'flex-start',
      boxShadow: 'var(--shadow-sm)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    },
    number: {
      minWidth: '32px',
      height: '32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--primary)',
      color: 'var(--accent)',
      borderRadius: '50%',
      fontSize: '0.85rem',
      fontWeight: '800',
      flexShrink: 0,
      boxShadow: 'var(--shadow-glow)',
    },
    textareaWrapper: {
      flex: 1,
      minWidth: 0,
    },
    textarea: {
      width: '100%',
      padding: '14px 18px',
      border: '1px solid var(--gray-100)',
      borderRadius: 'var(--radius-md)',
      fontSize: '1rem',
      fontFamily: 'inherit',
      fontWeight: '600',
      background: 'var(--gray-50)',
      resize: 'vertical',
      minHeight: '100px',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
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
      background: 'var(--accent)',
      color: 'var(--white)',
      border: 'none',
      borderRadius: '50%',
      fontSize: '1.3rem',
      fontWeight: '800',
      cursor: 'pointer',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      boxShadow: 'var(--shadow-sm)',
    },
    addBtnDisabled: {
      background: 'var(--gray-200)',
      color: 'var(--gray-400)',
      cursor: 'not-allowed',
      boxShadow: 'none',
    },
    removeBtn: {
      width: '40px',
      height: '40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--gray-50)',
      color: 'var(--danger)',
      border: 'none',
      borderRadius: '50%',
      fontSize: '1.3rem',
      fontWeight: '800',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    },
    emptyState: {
      textAlign: 'center',
      padding: '32px',
      color: 'var(--gray-400)',
      fontStyle: 'italic',
      background: 'var(--gray-50)',
      borderRadius: 'var(--radius-lg)',
      border: '2px dashed var(--gray-100)',
      fontWeight: '600',
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
              borderColor: hasContent ? 'var(--primary)' : 'var(--gray-100)',
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
