import React from 'react';

const ZoneSelector = ({ zones, selectedZone, onZoneChange, loading, disabled }) => {
  const isDisabled = disabled || loading || !zones.length;
  const isSingleZone = zones.length === 1;

  return (
    <div className="form-group">
      <label htmlFor="zone">
        മണ്ഡലം തിരഞ്ഞെടുക്കുക
      </label>
      <select
        id="zone"
        value={selectedZone || ''}
        onChange={(e) => onZoneChange(e.target.value)}
        disabled={isDisabled}
      >
        {!isSingleZone && <option value="">-- മണ്ഡലം തിരഞ്ഞെടുക്കുക --</option>}
        {zones.map((zone) => (
          <option key={zone.id} value={zone.id}>
            {zone.name}
          </option>
        ))}
      </select>
      {loading && (
        <p className="field-note loading-note">
          ലോഡ് ചെയ്യുന്നു...
        </p>
      )}
      {isSingleZone && !loading && (
        <p className="field-note">
          നിങ്ങൾക്ക് ഈ മണ്ഡലത്തിലേക്ക് മാത്രമേ പ്രവേശനമുള്ളൂ
        </p>
      )}
    </div>
  );
};

export default ZoneSelector;
