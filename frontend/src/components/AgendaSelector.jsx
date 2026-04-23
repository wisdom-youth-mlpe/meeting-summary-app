import React, { useState } from 'react';

const AgendaSelector = ({ agendas, selectedAgendas, onAgendaAdd, onAgendaRemove }) => {
  const [selectedAgenda, setSelectedAgenda] = useState('');
  const [resetKey, setResetKey] = useState(0);

  const handleAddAgenda = () => {
    const agendaValue = selectedAgenda.trim();
    if (agendaValue && !selectedAgendas.includes(agendaValue)) {
      onAgendaAdd(agendaValue);
    }
    setSelectedAgenda('');
    setResetKey(prev => prev + 1); // Force input to reset
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddAgenda();
    }
  };

  const styles = {
    inputRow: {
      display: 'flex',
      gap: '12px',
      marginBottom: '16px',
    },
    input: {
      flex: 1,
      padding: '14px 18px',
      border: '1px solid var(--gray-100)',
      borderRadius: 'var(--radius-lg)',
      fontSize: '1rem',
      fontWeight: '600',
      background: 'var(--gray-50)',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    },
    addBtn: {
      padding: '10px',
      background: 'var(--accent)',
      color: 'var(--white)',
      border: 'none',
      borderRadius: 'var(--radius-full)',
      fontSize: '1.5rem',
      fontWeight: '800',
      cursor: 'pointer',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      width: '48px',
      height: '48px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      boxShadow: 'var(--shadow-sm)',
    },
    addBtnDisabled: {
      background: 'var(--gray-200)',
      color: 'var(--gray-400)',
      cursor: 'not-allowed',
      boxShadow: 'none',
    },
    agendaList: {
      marginTop: '12px',
    },
    agendaItem: {
      display: 'flex',
      alignItems: 'center',
      padding: '12px 16px',
      marginBottom: '10px',
      background: 'var(--white)',
      border: '1px solid var(--gray-100)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-sm)',
      transition: 'all 0.2s ease',
    },
    number: {
      minWidth: '28px',
      height: '28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--primary)',
      color: 'var(--accent)',
      borderRadius: '50%',
      fontSize: '0.75rem',
      fontWeight: '800',
      marginRight: '14px',
      boxShadow: 'var(--shadow-glow)',
    },
    text: {
      flex: 1,
      fontSize: '0.95rem',
      color: 'var(--accent)',
      fontWeight: '700',
    },
    removeBtn: {
      padding: '8px',
      background: 'var(--gray-50)',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 'var(--radius-full)',
      transition: 'all 0.2s ease',
      color: 'var(--danger)',
    },
    emptyState: {
      textAlign: 'center',
      padding: '24px',
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
      <label>അജണ്ടകൾ</label>

      <div style={styles.inputRow}>
        <input
          key={resetKey}
          type="text"
          value={selectedAgenda}
          onChange={(e) => setSelectedAgenda(e.target.value)}
          onKeyPress={handleKeyPress}
          list="agenda-options"
          placeholder="അജണ്ട ചേർക്കുക..."
          style={styles.input}
        />
        {agendas && agendas.length > 0 && (
          <datalist id="agenda-options">
            {agendas.map((agenda, index) => (
              <option key={`${agenda}-${index}`} value={agenda} />
            ))}
          </datalist>
        )}
        <button
          type="button"
          onClick={handleAddAgenda}
          disabled={!selectedAgenda.trim()}
          style={{
            ...styles.addBtn,
            ...(selectedAgenda.trim() ? {} : styles.addBtnDisabled),
            fontSize: window.innerWidth <= 640 ? '1.2rem' : '1.5rem',
          }}
          aria-label="അജണ്ട ചേർക്കുക"
        >
          +
        </button>
      </div>

      {selectedAgendas.length > 0 ? (
        <div style={styles.agendaList}>
          {selectedAgendas.map((agenda, index) => (
            <div key={index} style={styles.agendaItem}>
              <span style={styles.number}>{index + 1}</span>
              <span style={styles.text}>{agenda}</span>
              <button
                type="button"
                onClick={() => onAgendaRemove(index)}
                style={styles.removeBtn}
                aria-label={`${agenda} നീക്കം ചെയ്യുക`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
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
            </div>
          ))}
        </div>
      ) : (
        <div style={styles.emptyState}>
          അജണ്ടകൾ ചേർക്കുക
        </div>
      )}
    </div>
  );
};

export default AgendaSelector;
