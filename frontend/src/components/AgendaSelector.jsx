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

  return (
    <div className="form-group">
      <label htmlFor="agenda-input">അജണ്ടകൾ</label>

      <div className="agenda-selector">
        <input
          id="agenda-input"
          key={resetKey}
          type="text"
          value={selectedAgenda}
          onChange={(e) => setSelectedAgenda(e.target.value)}
          onKeyPress={handleKeyPress}
          list="agenda-options"
          placeholder="അജണ്ട ചേർക്കുക..."
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
          aria-label="അജണ്ട ചേർക്കുക"
        >
          <PlusIcon />
        </button>
      </div>

      {selectedAgendas.length > 0 ? (
        <div>
          {selectedAgendas.map((agenda, index) => (
            <div key={index} className="row-item">
              <span className="row-num nums">{index + 1}</span>
              <span className="row-name" style={{ flex: 1 }}>{agenda}</span>
              <button
                type="button"
                onClick={() => onAgendaRemove(index)}
                className="icon-btn"
                aria-label={`${agenda} നീക്കം ചെയ്യുക`}
              >
                <CloseIcon />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-note">
          അജണ്ടകൾ ചേർക്കുക
        </div>
      )}
    </div>
  );
};

export const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export default AgendaSelector;
