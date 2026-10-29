import React, { useCallback, useRef, useEffect, useState } from 'react';

const QHLS_STATUS_OPTIONS = [
  { value: 'nadannu', label: 'നടന്നു' },
  { value: 'nadannittilla', label: 'നടന്നിട്ടില്ല' },
  { value: 'illa', label: 'QHLS ഇല്ല' },
];

const QHLSTable = React.memo(({ qhlsData, onQHLSChange }) => {
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

  useEffect(() => {
    if (hiddenRows.length === 0) setShowHidden(false);
  }, [hiddenRows.length]);

  const styles = {
    list: {
      marginTop: '12px',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--gray-100)',
      background: 'var(--white)',
      boxShadow: 'var(--shadow-sm)',
    },
    row: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      padding: '10px 14px',
      borderBottom: '1px solid var(--gray-50)',
    },
    unitName: {
      fontSize: '0.95rem',
      color: 'var(--gray-900)',
      fontWeight: '600',
      minWidth: 0,
      flex: 1,
    },
    select: {
      width: '170px',
      flexShrink: 0,
      padding: '8px 10px',
      border: '1px solid var(--gray-200)',
      borderRadius: 'var(--radius-md)',
      fontSize: '0.9rem',
      background: 'var(--gray-50)',
      color: 'var(--gray-900)',
    },
    empty: {
      padding: '14px',
      color: 'var(--gray-500)',
      fontSize: '0.9rem',
    },
    link: {
      marginTop: '12px',
      padding: 0,
      background: 'none',
      border: 'none',
      color: 'var(--primary)',
      fontWeight: '700',
      fontSize: '0.95rem',
      cursor: 'pointer',
      textDecoration: 'underline',
    },
    hiddenList: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
      marginTop: '10px',
    },
    hiddenUnit: {
      padding: '8px 12px',
      background: 'var(--gray-50)',
      color: 'var(--gray-900)',
      border: '1px dashed var(--primary)',
      borderRadius: 'var(--radius-md)',
      cursor: 'pointer',
      fontSize: '0.9rem',
    },
  };

  return (
    <div className="form-group">
      <h3>QHLS</h3>
      <div style={styles.list}>
        {visibleRows.length === 0 && (
          <div style={styles.empty}>യൂണിറ്റുകൾ ഇല്ല</div>
        )}
        {visibleRows.map(({ row, index }) => (
          <div key={row.unit} style={styles.row}>
            <label htmlFor={`qhls-status-${index}`} style={styles.unitName}>{row.unit}</label>
            <select
              id={`qhls-status-${index}`}
              value={row.status || ''}
              onChange={(e) => updateRow(index, { status: e.target.value })}
              style={styles.select}
            >
              <option value="">-- തിരഞ്ഞെടുക്കുക --</option>
              {QHLS_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {hiddenRows.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowHidden((open) => !open)}
            aria-expanded={showHidden}
            style={styles.link}
          >
            ➕ പുതിയ QHLS ചേർക്കുക ({hiddenRows.length})
          </button>
          {showHidden && (
            <div style={styles.hiddenList}>
              {hiddenRows.map(({ row, index }) => (
                <button
                  key={row.unit}
                  type="button"
                  onClick={() => updateRow(index, { status: '', carried: false, restored: true })}
                  style={styles.hiddenUnit}
                >
                  {row.unit}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
});

export default QHLSTable;
