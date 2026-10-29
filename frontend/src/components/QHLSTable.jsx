import React, { useCallback, useRef, useEffect, useState } from 'react';
import { PlusIcon } from './AgendaSelector';

const QHLS_STATUS_OPTIONS = [
  { value: 'nadannu', label: 'നടന്നു', tone: '' },
  { value: 'nadannittilla', label: 'നടന്നിട്ടില്ല', tone: 'warn' },
  { value: 'illa', label: 'QHLS ഇല്ല', tone: 'off' },
];

const QHLSTable = React.memo(({ qhlsData, onQHLSChange, highlightMissing = false }) => {
  const [showHidden, setShowHidden] = useState(false);

  // Use ref to store current qhlsData without triggering re-creation of updateRow
  const qhlsDataRef = useRef(qhlsData);
  useEffect(() => {
    qhlsDataRef.current = qhlsData;
  }, [qhlsData]);

  const updateRow = useCallback((index, changes) => {
    const updatedData = [...qhlsDataRef.current];
    updatedData[index] = { ...updatedData[index], ...changes };
    onQHLSChange(updatedData);
  }, [onQHLSChange]);

  // Units saved as QHLS ഇല്ല in the last meeting stay out of the list; the restore link brings them back
  const visibleRows = [];
  const hiddenRows = [];
  qhlsData.forEach((row, index) => {
    if (!row.unit) return;
    (row.carried && row.status === 'illa' ? hiddenRows : visibleRows).push({ row, index });
  });

  const answered = visibleRows.filter(({ row }) => row.status).length;

  useEffect(() => {
    if (hiddenRows.length === 0) setShowHidden(false);
  }, [hiddenRows.length]);

  return (
    <div className="form-group" id="qhls-section">
      <div className="section-head">
        <h3>QHLS</h3>
        {visibleRows.length > 0 && (
          <span className={`count${answered < visibleRows.length ? ' incomplete' : ''}`}>
            {answered} / {visibleRows.length}
          </span>
        )}
      </div>

      {visibleRows.length === 0 && (
        <div className="empty-note">യൂണിറ്റുകൾ ഇല്ല</div>
      )}

      {visibleRows.map(({ row, index }) => (
        <div
          key={row.unit}
          className={`row-item qhls-row${highlightMissing && !row.status ? ' missing' : ''}`}
        >
          <span className="row-name">{row.unit}</span>
          <div className="toggle" role="group" aria-label={row.unit}>
            {QHLS_STATUS_OPTIONS.map((option) => {
              const selected = row.status === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={selected ? `on ${option.tone}` : ''}
                  aria-pressed={selected}
                  onClick={() => updateRow(index, { status: option.value })}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {hiddenRows.length > 0 && (
        <div className="qhls-hidden">
          <button
            type="button"
            onClick={() => setShowHidden((open) => !open)}
            aria-expanded={showHidden}
            className="add-row"
          >
            <PlusIcon />
            പുതിയ QHLS ചേർക്കുക ({hiddenRows.length})
          </button>
          {showHidden && (
            <div className="qhls-hidden-list">
              {hiddenRows.map(({ row, index }) => (
                <button
                  key={row.unit}
                  type="button"
                  onClick={() => updateRow(index, { status: '', carried: false, restored: true })}
                >
                  {row.unit}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default QHLSTable;
