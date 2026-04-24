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
      gap: '10px',
      marginBottom: '16px',
    },
    input: {
      flex: 1,
      padding: '14px 18px',
      border: '2px solid #e0e0e0',
      borderRadius: '12px',
      fontSize: '1rem',
      transition: 'all 0.2s ease',
    },
    addBtn: {
      padding: '10px 16px',
      background: 'linear-gradient(135deg, #6c5ce7, #5549c7)',
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      fontSize: '1.5rem',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      width: '48px',
      lineHeight: '1',
      flexShrink: 0,
    },
    addBtnDisabled: {
      background: '#bdbdbd',
      cursor: 'not-allowed',
    },
    agendaList: {
      marginTop: '12px',
    },
    agendaItem: {
      display: 'flex',
      alignItems: 'center',
      padding: '14px 16px',
      marginBottom: '8px',
      background: '#ffffff',
      border: '2px solid #e0e0e0',
      borderRadius: '12px',
      transition: 'all 0.2s ease',
    },
    number: {
      minWidth: '32px',
      height: '32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #6c5ce7, #5549c7)',
      color: 'white',
      borderRadius: '50%',
      fontSize: '0.85rem',
      fontWeight: '700',
      marginRight: '14px',
    },
    text: {
      flex: 1,
      fontSize: '0.95rem',
      color: '#424242',
    },
    removeBtn: {
      padding: '8px',
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '8px',
      transition: 'all 0.2s ease',
    },
    emptyState: {
      textAlign: 'center',
      padding: '24px',
      color: '#9e9e9e',
      fontStyle: 'italic',
      background: '#f5f5f5',
      borderRadius: '12px',
      border: '2px dashed #e0e0e0',
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
