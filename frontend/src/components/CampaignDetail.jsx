import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getToken, getUser, hasAnyRole } from '../services/auth';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const apiFetch = async (path, opts = {}) => {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
  });
  return res.json();
};

const STATUS_OPTIONS = [
  { value: 'pending',            label: '⏳ Pending',                  color: '#94a3b8' },
  { value: 'will_participate',   label: '✅ Will Participate',          color: '#22c55e' },
  { value: 'will_not',           label: '❌ Will Not Participate',      color: '#ef4444' },
  { value: 'no_answer',          label: '📵 Didn\'t Pick Up',          color: '#f97316' },
  { value: 'unreachable',        label: '🔇 Unreachable',              color: '#6b7280' },
  { value: 'callback',           label: '🔄 Call Back Later',           color: '#8b5cf6' },
  { value: 'whatsapp_responded', label: '💬 Responded via WhatsApp',   color: '#25d366' },
];

const STATUS_FILTER_TABS = [
  { value: 'all',              label: 'All' },
  { value: 'pending',          label: '⏳ Pending' },
  { value: 'callback',         label: '🔄 Callback' },
  { value: 'no_answer',        label: '📵 Missed' },
  { value: 'will_participate', label: '✅ Will Join' },
  { value: 'will_not',         label: '❌ Won\'t Join' },
];

function fillTemplate(template, person) {
  if (!template) return '';
  return template
    .replace(/{name}/g, person.name || '')
    .replace(/{zone}/g, person.zoneName || '')
    .replace(/{role}/g, person.roleName || '')
    .replace(/{district}/g, person.districtName || '');
}

// Debounce hook
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function CampaignDetail() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const user = getUser();
  const canManage = hasAnyRole(['admin', 'campaign_manager']);

  const [campaign, setCampaign] = useState(null);
  const [persons, setPersons] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [templateOpen, setTemplateOpen] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [zones, setZones] = useState([]);

  const searchDebounced = useDebounce(searchInput, 350);

  // Saving state per person
  const [saving, setSaving] = useState({});
  const [notifications, setNotifications] = useState({});

  useEffect(() => { loadCampaign(); }, [campaignId]);
  useEffect(() => { loadPersons(); }, [statusFilter, searchDebounced, zoneFilter]);

  const loadCampaign = async () => {
    const data = await apiFetch(`/api/campaigns/${campaignId}`);
    if (data.success) {
      setCampaign(data.campaign);
      // Extract unique zones from persons for zone filter
      const pData = await apiFetch(`/api/campaigns/${campaignId}/persons?limit=1000`);
      if (pData.success) {
        const uniqueZones = [...new Map(pData.persons.map((p) => [p.zoneId, { id: p.zoneId, name: p.zoneName }])).values()];
        setZones(uniqueZones);
      }
    } else {
      setError(data.error);
    }
  };

  const loadPersons = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (searchDebounced)        params.set('search', searchDebounced);
      if (zoneFilter !== 'all')   params.set('zone', zoneFilter);
      const data = await apiFetch(`/api/campaigns/${campaignId}/persons?${params}`);
      if (data.success) {
        setPersons(data.persons);
        setTotal(data.total);
        setError(null);
      } else {
        setError(data.error);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const updateCallStatus = async (committeeId, field, value) => {
    setSaving((prev) => ({ ...prev, [committeeId]: true }));
    try {
      const data = await apiFetch(`/api/campaigns/${campaignId}/calls/${committeeId}`, {
        method: 'PUT',
        body: JSON.stringify({ [field]: value }),
      });
      if (data.success) {
        setPersons((prev) =>
          prev.map((p) =>
            p.committeeId === committeeId ? { ...p, [field === 'status' ? 'callStatus' : field]: value } : p
          )
        );
        // Reload campaign stats silently
        apiFetch(`/api/campaigns/${campaignId}`).then((d) => { if (d.success) setCampaign(d.campaign); });
        // Show brief notification
        setNotifications((prev) => ({ ...prev, [committeeId]: '✅' }));
        setTimeout(() => setNotifications((prev) => { const n = { ...prev }; delete n[committeeId]; return n; }), 1200);
      }
    } finally {
      setSaving((prev) => { const n = { ...prev }; delete n[committeeId]; return n; });
    }
  };

  const statusColor = (s) => STATUS_OPTIONS.find((o) => o.value === s)?.color || '#94a3b8';
  const statusLabel = (s) => STATUS_OPTIONS.find((o) => o.value === s)?.label || s;

  if (error && !campaign) return <div style={{ padding: 20, color: '#ef4444' }}>Error: {error}</div>;
  if (!campaign) return <div style={styles.loading}>Loading...</div>;

  const progressPct = campaign.progressPct || 0;

  return (
    <div style={styles.container}>
      {/* Back + Title */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/campaigns')}>← Back</button>
        {canManage && (
          <button style={styles.editBtn} onClick={() => navigate(`/campaigns/${campaignId}/edit`)}>✏️ Edit</button>
        )}
      </div>
      <h2 style={styles.title}>{campaign.name}</h2>
      {campaign.description && <p style={styles.desc}>{campaign.description}</p>}

      {/* Progress Overview */}
      <div style={styles.progressCard}>
        <div style={styles.progressLabel}>
          <span style={{ fontWeight: 600 }}>{campaign.calledCount || 0} of {campaign.totalPersons || 0} called</span>
          <span style={{ fontWeight: 800, color: '#6366f1', fontSize: '1.1rem' }}>{progressPct}%</span>
        </div>
        <div style={styles.progressTrack}>
          <div style={{ ...styles.progressFill, width: `${progressPct}%` }} />
        </div>

        {/* Status breakdown chips */}
        <div style={styles.breakdown}>
          {Object.entries(campaign.statusBreakdown || {}).map(([k, v]) => (
            <span key={k} style={{ ...styles.breakdownChip, color: statusColor(k) }}>
              {statusLabel(k).split(' ')[0]} {v}
            </span>
          ))}
        </div>
      </div>

      {/* WhatsApp Template Preview */}
      {campaign.whatsappTemplate && (
        <div style={styles.templateCard}>
          <button style={styles.templateToggle} onClick={() => setTemplateOpen((o) => !o)}>
            💬 WhatsApp Template {templateOpen ? '▲' : '▼'}
          </button>
          {templateOpen && (
            <pre style={styles.templateText}>{campaign.whatsappTemplate}</pre>
          )}
        </div>
      )}

      {/* Filter Bar */}
      <div style={styles.filterBar}>
        {/* Status tabs */}
        <div style={styles.statusTabs}>
          {STATUS_FILTER_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setStatusFilter(t.value)}
              style={{ ...styles.tabBtn, ...(statusFilter === t.value ? styles.tabBtnActive : {}) }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={styles.filterRow}>
          {/* Search */}
          <div style={styles.searchWrap}>
            <span style={styles.searchIcon}>🔍</span>
            <input
              type="text"
              placeholder="Search by name..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          {/* Zone filter */}
          {zones.length > 1 && (
            <select value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)} style={styles.select}>
              <option value="all">All Zones</option>
              {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          )}
        </div>
      </div>

      <div style={styles.resultCount}>{total} persons</div>

      {/* Person Cards */}
      {loading ? (
        <div style={styles.loading}>Loading persons...</div>
      ) : persons.length === 0 ? (
        <div style={styles.empty}>No persons found for this filter.</div>
      ) : (
        <div style={styles.personList}>
          {persons.map((p) => {
            const waMessage = fillTemplate(campaign.whatsappTemplate, p);
            const waPhone = (p.whatsapp || p.mobile || '').replace(/\D/g, '');
            const waUrl = waPhone
              ? `https://wa.me/91${waPhone}?text=${encodeURIComponent(waMessage)}`
              : null;
            const callUrl = p.mobile ? `tel:${p.mobile}` : null;
            const isSaving = saving[p.committeeId];
            const notification = notifications[p.committeeId];

            return (
              <div key={p.committeeId} style={styles.personCard}>
                <div style={styles.personTop}>
                  <div>
                    <div style={styles.personName}>{p.name}</div>
                    <div style={styles.personMeta}>
                      <span style={styles.roleBadge}>{p.roleName}</span>
                      <span style={styles.zoneBadge}>{p.zoneName}</span>
                      {p.committeeLevel !== 'zone' && (
                        <span style={styles.levelBadge}>{p.committeeLevel}</span>
                      )}
                    </div>
                    {p.departments && p.departments.length > 0 && (
                      <div style={styles.deptRow}>
                        {p.departments.map((d) => <span key={d} style={styles.deptTag}>{d}</span>)}
                      </div>
                    )}
                  </div>
                  {notification && <span style={styles.savedTick}>{notification}</span>}
                </div>

                {/* Action buttons */}
                <div style={styles.actions}>
                  <a
                    href={callUrl}
                    style={{ ...styles.actionBtn, ...styles.callBtn, pointerEvents: callUrl ? 'auto' : 'none', opacity: callUrl ? 1 : 0.4 }}
                  >
                    📞 Call
                  </a>
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ ...styles.actionBtn, ...styles.waBtn, pointerEvents: waUrl ? 'auto' : 'none', opacity: waUrl ? 1 : 0.4 }}
                  >
                    💬 WhatsApp
                  </a>

                  {/* Status dropdown — auto-save */}
                  <select
                    value={p.callStatus}
                    onChange={(e) => updateCallStatus(p.committeeId, 'status', e.target.value)}
                    disabled={isSaving}
                    style={{
                      ...styles.statusSelect,
                      borderColor: statusColor(p.callStatus),
                      color: statusColor(p.callStatus),
                    }}
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                {/* Notes — auto-save on blur */}
                <NotesField
                  committeeId={p.committeeId}
                  defaultValue={p.notes}
                  onSave={(val) => updateCallStatus(p.committeeId, 'notes', val)}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Isolated notes component to avoid re-renders on each keypress
function NotesField({ committeeId, defaultValue, onSave }) {
  const [val, setVal] = useState(defaultValue);
  const [expanded, setExpanded] = useState(!!defaultValue);

  return (
    <div style={{ marginTop: 8 }}>
      {!expanded && !val ? (
        <button style={styles.addNoteBtn} onClick={() => setExpanded(true)}>+ Add note</button>
      ) : (
        <textarea
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={() => onSave(val)}
          placeholder="Notes..."
          rows={2}
          style={styles.notesInput}
        />
      )}
    </div>
  );
}

const styles = {
  container: { maxWidth: 860, margin: '0 auto', padding: '16px 16px 80px' },
  header: { display: 'flex', justifyContent: 'space-between', marginBottom: 12 },
  backBtn: { background: 'none', border: 'none', color: '#6366f1', fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem', padding: 0 },
  editBtn: { padding: '6px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
  title: { margin: '0 0 4px', fontSize: '1.4rem', fontWeight: 800, color: '#1e293b' },
  desc: { margin: '0 0 18px', color: '#64748b', fontSize: '0.9rem' },
  progressCard: { background: 'white', borderRadius: 14, padding: 18, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', marginBottom: 16, border: '1px solid #f1f5f9' },
  progressLabel: { display: 'flex', justifyContent: 'space-between', marginBottom: 8 },
  progressTrack: { height: 10, background: '#f1f5f9', borderRadius: 8, overflow: 'hidden', marginBottom: 12 },
  progressFill: { height: '100%', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', borderRadius: 8, transition: 'width 0.4s' },
  breakdown: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  breakdownChip: { padding: '3px 10px', background: '#f8fafc', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600 },
  templateCard: { background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 14, marginBottom: 16 },
  templateToggle: { background: 'none', border: 'none', color: '#16a34a', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem', padding: 0 },
  templateText: { margin: '10px 0 0', fontFamily: 'inherit', fontSize: '0.9rem', whiteSpace: 'pre-wrap', color: '#166534' },
  filterBar: { background: 'white', borderRadius: 12, padding: 14, marginBottom: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' },
  statusTabs: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  tabBtn: { padding: '5px 13px', border: '1px solid #e2e8f0', borderRadius: 20, background: 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500, color: '#64748b' },
  tabBtnActive: { background: '#6366f1', color: 'white', border: '1px solid #6366f1' },
  filterRow: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  searchWrap: { display: 'flex', alignItems: 'center', gap: 6, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 12px', flex: 1 },
  searchIcon: { fontSize: '0.9rem' },
  searchInput: { border: 'none', background: 'none', outline: 'none', flex: 1, fontSize: '0.9rem', fontFamily: 'inherit' },
  select: { padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.85rem', background: '#f8fafc' },
  resultCount: { fontSize: '0.82rem', color: '#94a3b8', marginBottom: 12 },
  loading: { textAlign: 'center', padding: 40, color: '#94a3b8' },
  empty: { textAlign: 'center', padding: '40px 20px', color: '#94a3b8' },
  personList: { display: 'flex', flexDirection: 'column', gap: 12 },
  personCard: { background: 'white', borderRadius: 14, padding: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' },
  personTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  personName: { fontWeight: 700, fontSize: '1.05rem', color: '#1e293b', marginBottom: 6 },
  personMeta: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  roleBadge: { padding: '2px 9px', background: '#f3e8ff', color: '#7c3aed', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600 },
  zoneBadge: { padding: '2px 9px', background: '#dcfce7', color: '#16a34a', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600 },
  levelBadge: { padding: '2px 9px', background: '#e0f2fe', color: '#0284c7', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600 },
  deptRow: { display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 },
  deptTag: { padding: '1px 8px', background: '#fff7ed', color: '#c2410c', borderRadius: 20, fontSize: '0.72rem', fontWeight: 500 },
  savedTick: { fontSize: '1.2rem', color: '#22c55e' },
  actions: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  actionBtn: { padding: '7px 14px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none', display: 'inline-block', transition: 'opacity 0.2s' },
  callBtn: { background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' },
  waBtn: { background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' },
  statusSelect: { padding: '7px 10px', border: '2px solid', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600, background: 'white', cursor: 'pointer', flex: 1, minWidth: 180 },
  addNoteBtn: { background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.82rem', padding: 0 },
  notesInput: { width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.85rem', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' },
};
