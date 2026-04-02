import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getToken } from '../services/auth';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const apiFetch = async (path, opts = {}) => {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
  });
  return res.json();
};

const COMMITTEE_LEVELS = ['all', 'district', 'zone', 'unit'];

export default function CampaignForm() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const isEdit = !!campaignId;

  const [form, setForm] = useState({
    name: '',
    description: '',
    status: 'draft',
    filters: { roles: [], committeeLevel: 'all', districts: [], zones: [], departments: [], hasPhone: null },
    whatsappTemplate: '',
    scopeDistrictIds: [],
    scopeZoneIds: [],
    assignedCallers: [],
  });

  const [roles, setRoles] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [zones, setZones] = useState([]);
  const [allZones, setAllZones] = useState([]);
  const [estimatedCount, setEstimatedCount] = useState(null);
  const [estimating, setEstimating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(1);

  useEffect(() => { loadOptions(); }, []);
  useEffect(() => { if (isEdit) loadCampaign(); }, [campaignId]);
  // Estimate persons whenever filters change
  useEffect(() => { estimateCount(); }, [form.filters]);

  const loadOptions = async () => {
    const [rData, dData, zData] = await Promise.all([
      apiFetch('/api/committee-roles'),
      apiFetch('/api/districts').catch(() => ({ success: false })),
      apiFetch('/api/zones'),
    ]);
    if (rData.success) setRoles(rData.roles || []);
    if (dData.success) setDistricts(dData.districts || []);
    if (zData.success) { setAllZones(zData.zones || []); setZones(zData.zones || []); }
  };

  const loadCampaign = async () => {
    const data = await apiFetch(`/api/campaigns/${campaignId}`);
    if (data.success) setForm({ ...data.campaign });
  };

  const estimateCount = async () => {
    setEstimating(true);
    try {
      const data = await apiFetch('/api/campaigns/estimate', {
        method: 'POST',
        body: JSON.stringify({ filters: form.filters }),
      });
      if (data.success) setEstimatedCount(data.count);
    } catch {/* silent */} finally {
      setEstimating(false);
    }
  };

  const setFilter = (key, value) => {
    setForm((prev) => ({ ...prev, filters: { ...prev.filters, [key]: value } }));
  };

  const toggleArrayFilter = (key, value) => {
    setForm((prev) => {
      const arr = prev.filters[key] || [];
      const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
      return { ...prev, filters: { ...prev.filters, [key]: next } };
    });
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Campaign name is required'); return; }
    setSaving(true);
    setError(null);
    try {
      const url = isEdit ? `/api/campaigns/${campaignId}` : '/api/campaigns';
      const method = isEdit ? 'PUT' : 'POST';
      const data = await apiFetch(url, { method, body: JSON.stringify(form) });
      if (data.success) {
        navigate(`/campaigns/${data.campaign.campaignId}`);
      } else {
        setError(data.error || 'Save failed');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // Filter zones when districts are selected
  const filteredZones = form.filters.districts.length > 0
    ? allZones.filter((z) => form.filters.districts.includes(z.districtId))
    : allZones;

  const PLACEHOLDER_HINTS = ['{name}', '{zone}', '{role}', '{district}'];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/campaigns')}>← Campaigns</button>
        <h2 style={styles.title}>{isEdit ? 'Edit Campaign' : 'New Campaign'}</h2>
      </div>

      {/* Step tabs */}
      <div style={styles.steps}>
        {['Basic Info', 'Build Filter', 'WhatsApp Template', 'Access & Save'].map((s, i) => (
          <button
            key={i}
            onClick={() => setStep(i + 1)}
            style={{ ...styles.step, ...(step === i + 1 ? styles.stepActive : step > i + 1 ? styles.stepDone : {}) }}
          >
            {step > i + 1 ? '✓ ' : `${i + 1}. `}{s}
          </button>
        ))}
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {/* ── Step 1: Basic Info ── */}
      {step === 1 && (
        <div style={styles.stepCard}>
          <h3 style={styles.stepHead}>Basic Information</h3>
          <div style={styles.field}>
            <label style={styles.label}>Campaign Name *</label>
            <input
              style={styles.input}
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Zone Secretary April Drive"
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Description</label>
            <textarea
              style={{ ...styles.input, resize: 'vertical' }}
              rows={3}
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Brief description of the campaign purpose..."
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Status</label>
            <div style={styles.chipRow}>
              {['draft', 'active'].map((s) => (
                <button
                  key={s}
                  onClick={() => setForm((p) => ({ ...p, status: s }))}
                  style={{ ...styles.chip, ...(form.status === s ? styles.chipActive : {}) }}
                >
                  {s === 'draft' ? '📝 Draft' : '🟢 Active'}
                </button>
              ))}
            </div>
          </div>
          <div style={styles.navRow}>
            <div />
            <button style={styles.nextBtn} onClick={() => setStep(2)}>Next → Filter Builder</button>
          </div>
        </div>
      )}

      {/* ── Step 2: Filter Builder ── */}
      {step === 2 && (
        <div style={styles.stepCard}>
          <div style={styles.estimateBanner}>
            <span>Estimated persons matching:</span>
            <strong style={{ fontSize: '1.4rem', color: '#6366f1' }}>
              {estimating ? '…' : (estimatedCount ?? '—')}
            </strong>
          </div>

          <h3 style={styles.stepHead}>Filter Builder</h3>
          <p style={styles.hint}>Select any combination. Leave blank to include all.</p>

          {/* Committee Level */}
          <div style={styles.field}>
            <label style={styles.label}>Committee Level</label>
            <div style={styles.chipRow}>
              {COMMITTEE_LEVELS.map((l) => (
                <button
                  key={l}
                  onClick={() => setFilter('committeeLevel', l)}
                  style={{ ...styles.chip, ...(form.filters.committeeLevel === l ? styles.chipActive : {}) }}
                >
                  {l.charAt(0).toUpperCase() + l.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Roles */}
          <div style={styles.field}>
            <label style={styles.label}>Roles</label>
            <div style={styles.chipRow}>
              {roles.map((r) => (
                <button
                  key={r.roleId}
                  onClick={() => toggleArrayFilter('roles', r.roleId)}
                  style={{ ...styles.chip, ...(form.filters.roles.includes(r.roleId) ? styles.chipActive : {}) }}
                >
                  {r.name}
                </button>
              ))}
            </div>
          </div>

          {/* Districts */}
          {districts.length > 0 && (
            <div style={styles.field}>
              <label style={styles.label}>Districts</label>
              <div style={styles.chipRow}>
                {districts.map((d) => (
                  <button
                    key={d.districtId}
                    onClick={() => toggleArrayFilter('districts', d.districtId)}
                    style={{ ...styles.chip, ...(form.filters.districts.includes(d.districtId) ? styles.chipActive : {}) }}
                  >
                    {d.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Zones */}
          <div style={styles.field}>
            <label style={styles.label}>Zones {form.filters.districts.length > 0 && '(filtered by district)'}</label>
            <div style={styles.chipRow}>
              {filteredZones.map((z) => (
                <button
                  key={z.id}
                  onClick={() => toggleArrayFilter('zones', z.zoneId || z.id)}
                  style={{ ...styles.chip, ...(form.filters.zones.includes(z.zoneId || z.id) ? styles.chipActive : {}) }}
                >
                  {z.name}
                </button>
              ))}
            </div>
          </div>

          {/* Phone availability */}
          <div style={styles.field}>
            <label style={styles.label}>Phone Availability</label>
            <div style={styles.chipRow}>
              {[
                { label: 'Any', value: null },
                { label: 'Has Phone', value: true },
                { label: 'No Phone', value: false },
              ].map((o) => (
                <button
                  key={String(o.value)}
                  onClick={() => setFilter('hasPhone', o.value)}
                  style={{ ...styles.chip, ...(form.filters.hasPhone === o.value ? styles.chipActive : {}) }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div style={styles.navRow}>
            <button style={styles.prevBtn} onClick={() => setStep(1)}>← Back</button>
            <button style={styles.nextBtn} onClick={() => setStep(3)}>Next → WhatsApp Template</button>
          </div>
        </div>
      )}

      {/* ── Step 3: WhatsApp Template ── */}
      {step === 3 && (
        <div style={styles.stepCard}>
          <h3 style={styles.stepHead}>WhatsApp Message Template</h3>
          <p style={styles.hint}>Use placeholders to personalise the message for each person.</p>

          <div style={styles.placeholderRow}>
            {PLACEHOLDER_HINTS.map((ph) => (
              <code key={ph} style={styles.placeholderChip}>{ph}</code>
            ))}
          </div>

          <textarea
            style={{ ...styles.input, minHeight: 180, resize: 'vertical', fontFamily: 'inherit' }}
            value={form.whatsappTemplate}
            onChange={(e) => setForm((p) => ({ ...p, whatsappTemplate: e.target.value }))}
            placeholder={`സലാം {name},\nഈ ആഴ്ച നടക്കുന്ന...\n\n{zone} - {role}`}
          />

          {form.whatsappTemplate && (
            <div style={styles.previewBox}>
              <div style={styles.previewLabel}>Preview (sample data):</div>
              <pre style={styles.previewText}>
                {form.whatsappTemplate
                  .replace(/{name}/g, 'Sample Name')
                  .replace(/{zone}/g, 'Zone A')
                  .replace(/{role}/g, 'Secretary')
                  .replace(/{district}/g, 'District 1')}
              </pre>
            </div>
          )}

          <div style={styles.navRow}>
            <button style={styles.prevBtn} onClick={() => setStep(2)}>← Back</button>
            <button style={styles.nextBtn} onClick={() => setStep(4)}>Next → Access & Save</button>
          </div>
        </div>
      )}

      {/* ── Step 4: Access & Save ── */}
      {step === 4 && (
        <div style={styles.stepCard}>
          <h3 style={styles.stepHead}>Scope & Access</h3>
          <p style={styles.hint}>Choose which districts or zones can see this campaign. Leave empty for all admins.</p>

          <div style={styles.field}>
            <label style={styles.label}>Visible to Zones</label>
            <div style={styles.chipRow}>
              {allZones.map((z) => (
                <button
                  key={z.id}
                  onClick={() => {
                    const id = z.zoneId || z.id;
                    setForm((p) => ({
                      ...p,
                      scopeZoneIds: p.scopeZoneIds.includes(id)
                        ? p.scopeZoneIds.filter((v) => v !== id)
                        : [...p.scopeZoneIds, id],
                    }));
                  }}
                  style={{ ...styles.chip, ...(form.scopeZoneIds.includes(z.zoneId || z.id) ? styles.chipActive : {}) }}
                >
                  {z.name}
                </button>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div style={styles.summaryBox}>
            <div style={styles.summaryRow}><span>Name</span><strong>{form.name || '(unnamed)'}</strong></div>
            <div style={styles.summaryRow}><span>Status</span><strong>{form.status}</strong></div>
            <div style={styles.summaryRow}><span>Estimated Persons</span><strong>{estimatedCount ?? '—'}</strong></div>
            <div style={styles.summaryRow}><span>Scope Zones</span><strong>{form.scopeZoneIds.length || 'All'}</strong></div>
          </div>

          <div style={styles.navRow}>
            <button style={styles.prevBtn} onClick={() => setStep(3)}>← Back</button>
            <button style={{ ...styles.nextBtn, background: '#22c55e', boxShadow: '0 4px 12px rgba(34,197,94,0.3)' }} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : isEdit ? '💾 Update Campaign' : '🚀 Create Campaign'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { maxWidth: 700, margin: '0 auto', padding: '16px 16px 80px' },
  header: { marginBottom: 20 },
  backBtn: { background: 'none', border: 'none', color: '#6366f1', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', padding: 0, marginBottom: 8 },
  title: { margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#1e293b' },
  steps: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  step: { padding: '7px 14px', border: '1px solid #e2e8f0', borderRadius: 20, background: 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500, color: '#94a3b8' },
  stepActive: { background: '#6366f1', color: 'white', border: '1px solid #6366f1' },
  stepDone: { background: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0' },
  stepCard: { background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: '1px solid #f1f5f9' },
  stepHead: { margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' },
  hint: { margin: '-8px 0 16px', color: '#94a3b8', fontSize: '0.85rem' },
  estimateBanner: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f0f4ff', border: '1px solid #c7d2fe', borderRadius: 12, padding: '12px 18px', marginBottom: 20, fontWeight: 500 },
  field: { marginBottom: 20 },
  label: { display: 'block', fontWeight: 600, color: '#475569', fontSize: '0.88rem', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.4px' },
  input: { width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: '0.95rem', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' },
  chipRow: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  chip: { padding: '6px 14px', border: '1px solid #e2e8f0', borderRadius: 20, background: '#f8fafc', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500, color: '#475569' },
  chipActive: { background: '#6366f1', color: 'white', border: '1px solid #6366f1' },
  placeholderRow: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  placeholderChip: { padding: '4px 10px', background: '#f1f5f9', borderRadius: 6, fontSize: '0.82rem', color: '#475569', fontFamily: 'monospace' },
  previewBox: { background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 16px', marginTop: 12 },
  previewLabel: { fontSize: '0.8rem', color: '#16a34a', fontWeight: 600, marginBottom: 6 },
  previewText: { margin: 0, fontFamily: 'inherit', fontSize: '0.9rem', whiteSpace: 'pre-wrap', color: '#166534' },
  summaryBox: { background: '#f8fafc', borderRadius: 12, padding: '16px 18px', marginBottom: 20, border: '1px solid #f1f5f9' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.9rem', color: '#64748b' },
  navRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 },
  prevBtn: { padding: '10px 18px', border: '1px solid #e2e8f0', borderRadius: 10, background: 'white', cursor: 'pointer', fontWeight: 600, color: '#64748b' },
  nextBtn: { padding: '10px 22px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' },
  error: { background: '#fee2e2', color: '#dc2626', padding: '12px 16px', borderRadius: 8, marginBottom: 16 },
};
