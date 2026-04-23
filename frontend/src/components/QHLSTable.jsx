import React, { useCallback, useRef, useEffect } from 'react';

const QHLSTable = React.memo(({ qhlsData, onQHLSChange, availableUnits = [] }) => {
  const filteredUnits = Array.isArray(availableUnits)
    ? Array.from(new Set(availableUnits.filter((unit) => unit && unit.trim() !== '')))
    : [];

  const malayalamDays = ['ഞായർ', 'തിങ്കൾ', 'ചൊവ്വ', 'ബുധൻ', 'വ്യാഴം', 'വെള്ളി', 'ശനി'];

  // Use ref to store current qhlsData without triggering re-creation of handleFieldChange
  const qhlsDataRef = useRef(qhlsData);
  useEffect(() => {
    qhlsDataRef.current = qhlsData;
  }, [qhlsData]);

  const handleFieldChange = useCallback((index, field, value) => {
    // Use ref to get current data without adding qhlsData to dependencies
    const updatedData = [...qhlsDataRef.current];
    updatedData[index] = {
      ...updatedData[index],
      [field]: value,
    };
    // If toggling hasQhls, clear other fields when unchecked
    if (field === 'hasQhls' && !value) {
      updatedData[index].day = '';
      updatedData[index].faculty = '';
      updatedData[index].male = '';
      updatedData[index].female = '';
    }
    onQHLSChange(updatedData);
  }, [onQHLSChange]); // Only depends on onQHLSChange, NOT qhlsData!

  const styles = {
    wrapper: {
      overflowX: 'auto',
      marginTop: '12px',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--gray-100)',
      background: 'var(--white)',
      boxShadow: 'var(--shadow-sm)',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      minWidth: '600px',
    },
    th: {
      padding: '16px 12px',
      textAlign: 'left',
      background: 'var(--gray-50)',
      color: 'var(--gray-500)',
      fontWeight: '700',
      fontSize: '0.75rem',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      borderBottom: '1px solid var(--gray-100)',
    },
    td: {
      padding: '12px 8px',
      borderBottom: '1px solid var(--gray-50)',
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      border: '1px solid var(--gray-200)',
      borderRadius: 'var(--radius-md)',
      fontSize: '0.9rem',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      background: 'var(--gray-50)',
      color: 'var(--gray-900)',
    },
    inputDisabled: {
      background: 'var(--gray-100)',
      color: 'var(--gray-400)',
      cursor: 'not-allowed',
      border: '1px solid var(--gray-200)',
    },
    inputNumber: {
      textAlign: 'center',
      width: '70px',
    },
    mobileCard: {
      padding: '24px',
      marginBottom: '16px',
      background: 'var(--white)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--gray-100)',
      boxShadow: 'var(--shadow-sm)',
    },
    mobileLabel: {
      fontSize: '0.7rem',
      color: 'var(--gray-400)',
      marginBottom: '6px',
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    },
    mobileValue: {
      fontSize: '1rem',
      color: 'var(--accent)',
      fontWeight: '800',
      marginBottom: '16px',
    },
    mobileInputGroup: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '16px',
    },
    mobileInputWrapper: {
      display: 'flex',
      flexDirection: 'column',
    },
  };

  // Mobile card view for smaller screens
  const MobileView = () => (
    <div style={{ display: 'block' }}>
      {qhlsData.map((row, index) => {
        const hasQhls = row.hasQhls !== false; // Default to true if not set
        return (
          <div key={index} style={styles.mobileCard}>
            <div style={styles.mobileLabel}>യൂണിറ്റ്</div>
            <div style={styles.mobileValue}>
              {row.unit || filteredUnits[index] || `യൂണിറ്റ് ${index + 1}`}
            </div>

            <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id={`qhls-mobile-${index}`}
                checked={hasQhls}
                onChange={(e) => handleFieldChange(index, 'hasQhls', e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <label htmlFor={`qhls-mobile-${index}`} style={{ fontSize: '0.9rem', cursor: 'pointer' }}>
                QHLS ഉണ്ട്
              </label>
            </div>

            {hasQhls && (
              <div style={styles.mobileInputGroup}>
                <div style={styles.mobileInputWrapper}>
                  <label style={styles.mobileLabel}>ദിവസം</label>
                  <select
                    value={row.day || ''}
                    onChange={(e) => handleFieldChange(index, 'day', e.target.value)}
                    style={styles.input}
                  >
                    <option value="">-- തിരഞ്ഞെടുക്കുക --</option>
                    {malayalamDays.map((day, idx) => (
                      <option key={idx} value={day}>{day}</option>
                    ))}
                  </select>
                </div>
                <div style={styles.mobileInputWrapper}>
                  <label style={styles.mobileLabel}>ഫാക്കൽറ്റി</label>
                  <input
                    key={`faculty-${index}-${row.faculty}`}
                    type="text"
                    defaultValue={row.faculty || ''}
                    onBlur={(e) => handleFieldChange(index, 'faculty', e.target.value)}
                    placeholder="ഫാക്കൽറ്റി"
                    style={styles.input}
                  />
                </div>
                <div style={styles.mobileInputWrapper}>
                  <label style={styles.mobileLabel}>പുരുഷന്മാർ</label>
                  <input
                    key={`male-${index}-${row.male}`}
                    type="number"
                    defaultValue={row.male || ''}
                    onBlur={(e) => {
                      const val = e.target.value;
                      if (val === '' || (!isNaN(val) && parseInt(val) >= 0 && parseInt(val) <= 1000)) {
                        handleFieldChange(index, 'male', val);
                      }
                    }}
                    placeholder="0"
                    min="0"
                    max="1000"
                    style={{ ...styles.input, textAlign: 'center' }}
                  />
                </div>
                <div style={styles.mobileInputWrapper}>
                  <label style={styles.mobileLabel}>സ്ത്രീകൾ</label>
                  <input
                    key={`female-${index}-${row.female}`}
                    type="number"
                    defaultValue={row.female || ''}
                    onBlur={(e) => {
                      const val = e.target.value;
                      if (val === '' || (!isNaN(val) && parseInt(val) >= 0 && parseInt(val) <= 1000)) {
                        handleFieldChange(index, 'female', val);
                      }
                    }}
                    placeholder="0"
                    min="0"
                    max="1000"
                    style={{ ...styles.input, textAlign: 'center' }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // Desktop table view
  const DesktopView = () => (
    <div style={styles.wrapper}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>യൂണിറ്റ്</th>
            <th style={{ ...styles.th, textAlign: 'center' }}>QHLS</th>
            <th style={styles.th}>ദിവസം</th>
            <th style={styles.th}>ഫാക്കൽറ്റി</th>
            <th style={styles.th}>പുരുഷന്മാർ</th>
            <th style={styles.th}>സ്ത്രീകൾ</th>
          </tr>
        </thead>
        <tbody>
          {qhlsData.map((row, index) => {
            const hasQhls = row.hasQhls !== false; // Default to true if not set
            return (
              <tr key={index}>
                <td style={styles.td}>
                  <input
                    type="text"
                    value={row.unit || filteredUnits[index] || ''}
                    disabled
                    style={{ ...styles.input, ...styles.inputDisabled, minWidth: '150px' }}
                  />
                </td>
                <td style={{ ...styles.td, textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    id={`qhls-${index}`}
                    checked={hasQhls}
                    onChange={(e) => handleFieldChange(index, 'hasQhls', e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                </td>
                <td style={styles.td}>
                  <select
                    value={row.day || ''}
                    onChange={(e) => handleFieldChange(index, 'day', e.target.value)}
                    disabled={!hasQhls}
                    style={{
                      ...styles.input,
                      ...(hasQhls ? {} : styles.inputDisabled),
                    }}
                  >
                    <option value="">-- തിരഞ്ഞെടുക്കുക --</option>
                    {malayalamDays.map((day, idx) => (
                      <option key={idx} value={day}>{day}</option>
                    ))}
                  </select>
                </td>
                <td style={styles.td}>
                  <input
                    key={`faculty-desktop-${index}-${row.faculty}`}
                    type="text"
                    defaultValue={row.faculty || ''}
                    onBlur={(e) => handleFieldChange(index, 'faculty', e.target.value)}
                    placeholder="ഫാക്കൽറ്റി"
                    disabled={!hasQhls}
                    style={{
                      ...styles.input,
                      ...(hasQhls ? {} : styles.inputDisabled),
                    }}
                  />
                </td>
                <td style={styles.td}>
                  <input
                    key={`male-desktop-${index}-${row.male}`}
                    type="number"
                    defaultValue={row.male || ''}
                    onBlur={(e) => {
                      const val = e.target.value;
                      if (val === '' || (!isNaN(val) && parseInt(val) >= 0 && parseInt(val) <= 1000)) {
                        handleFieldChange(index, 'male', val);
                      }
                    }}
                    placeholder="0"
                    min="0"
                    max="1000"
                    disabled={!hasQhls}
                    style={{
                      ...styles.input,
                      ...styles.inputNumber,
                      ...(hasQhls ? {} : styles.inputDisabled),
                    }}
                  />
                </td>
                <td style={styles.td}>
                  <input
                    key={`female-desktop-${index}-${row.female}`}
                    type="number"
                    defaultValue={row.female || ''}
                    onBlur={(e) => {
                      const val = e.target.value;
                      if (val === '' || (!isNaN(val) && parseInt(val) >= 0 && parseInt(val) <= 1000)) {
                        handleFieldChange(index, 'female', val);
                      }
                    }}
                    placeholder="0"
                    min="0"
                    max="1000"
                    disabled={!hasQhls}
                    style={{
                      ...styles.input,
                      ...styles.inputNumber,
                      ...(hasQhls ? {} : styles.inputDisabled),
                    }}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="form-group">
      <h3>QHLS</h3>
      {/* Show mobile view on smaller screens, desktop on larger */}
      <div className="qhls-mobile-view" style={{ display: 'none' }}>
        <MobileView />
      </div>
      <div className="qhls-desktop-view">
        <DesktopView />
      </div>
      <style>{`
        @media (max-width: 640px) {
          .qhls-mobile-view { display: block !important; }
          .qhls-desktop-view { display: none !important; }
        }
      `}</style>
    </div>
  );
});

export default QHLSTable;
