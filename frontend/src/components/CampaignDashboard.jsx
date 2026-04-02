import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getToken, getUser, hasAnyRole } from '../services/auth';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const STATUS_CONFIG = {
  active:    { label: 'Active',    color: '#22c55e', bg: '#dcfce7' },
  draft:     { label: 'Draft',     color: '#94a3b8', bg: '#f1f5f9' },
  paused:    { label: 'Paused',    color: '#f59e0b', bg: '#fef3c7' },
  completed: { label: 'Completed', color: '#3b82f6', bg: '#dbeafe' },
};

const apiFetch = async (path, opts = {}) => {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
  });
  return res.json();
};

export default function CampaignDashboard() {
  const navigate = useNavigate();
  const user = getUser();
  const canManage = hasAnyRole(['admin', 'campaign_manager']);

  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCampaigns();
  }, [filter]);

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const q = filter !== 'all' ? `?status=${filter}` : '';
      const data = await apiFetch(`/api/campaigns${q}`);
      if (data.success) {
        setCampaigns(data.campaigns);
        setError(null);
      } else {
        setError(data.error || 'Failed to load campaigns');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const totalActive = campaigns.filter((c) => c.status === 'active').length;
  const totalCompleted = campaigns.filter((c) => c.status === 'completed').length;
  const totalCalls = campaigns.reduce((s, c) => s + (c.calledCount || 0), 0);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>📞 Call Campaigns</h2>
          <p style={styles.subtitle}>Manage and track your calling campaigns</p>
        </div>
        {canManage && (
          <button style={styles.newBtn} onClick={() => navigate('/campaigns/new')}>
            + New Campaign
          </button>
        )}
      </div>

      {/* Summary Stats */}
      <div style={styles.statsRow}>
        {[
          { label: 'Total',     value: campaigns.length, icon: '📋', color: '#6366f1' },
          { label: 'Active',    value: totalActive,       icon: '🟢', color: '#22c55e' },
          { label: 'Completed', value: totalCompleted,    icon: '✅', color: '#3b82f6' },
          { label: 'Calls Made',value: totalCalls,        icon: '📊', color: '#f59e0b' },
        ].map((s) => (
          <div key={s.label} style={styles.statCard}>
            <div style={{ fontSize: '1.6rem' }}>{s.icon}</div>
            <div style={{ ...styles.statNum, color: s.color }}>{s.value}</div>
            <div style={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div style={styles.tabs}>
        {['all', 'active', 'draft', 'paused', 'completed'].map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            style={{ ...styles.tab, ...(filter === t ? styles.tabActive : {}) }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {loading ? (
        <div style={styles.loading}>Loading campaigns...</div>
      ) : campaigns.length === 0 ? (
        <div style={styles.empty}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📭</div>
          <p>No campaigns found. {canManage && 'Create one to get started.'}</p>
        </div>
      ) : (
        <div style={styles.grid}>
          {campaigns.map((c) => {
            const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.draft;
            return (
              <div
                key={c.campaignId}
                style={styles.card}
                onClick={() => navigate(`/campaigns/${c.campaignId}`)}
              >
                <div style={styles.cardTop}>
                  <span style={{ ...styles.badge, color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
                  <span style={styles.cardId}>{c.campaignId}</span>
                </div>
                <h3 style={styles.cardTitle}>{c.name}</h3>
                {c.description && <p style={styles.cardDesc}>{c.description}</p>}

                {/* Progress Bar */}
                <div style={styles.progressWrap}>
                  <div style={styles.progressLabel}>
                    <span>{c.calledCount || 0} of {c.totalPersons || 0} called</span>
                    <span style={{ fontWeight: 700, color: '#6366f1' }}>{c.progressPct || 0}%</span>
                  </div>
                  <div style={styles.progressTrack}>
                    <div style={{ ...styles.progressFill, width: `${c.progressPct || 0}%` }} />
                  </div>
                </div>

                <div style={styles.cardFooter}>
                  <span style={styles.cardMeta}>
                    {c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}
                  </span>
                  <span style={styles.viewLink}>View →</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { maxWidth: 1100, margin: '0 auto', padding: '16px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  title: { margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' },
  subtitle: { margin: '4px 0 0', color: '#64748b', fontSize: '0.9rem' },
  newBtn: { padding: '10px 22px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, marginBottom: 24 },
  statCard: { background: 'white', borderRadius: 12, padding: '18px 16px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' },
  statNum: { fontSize: '2rem', fontWeight: 800, lineHeight: 1.1, margin: '4px 0' },
  statLabel: { fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 },
  tabs: { display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  tab: { padding: '7px 18px', border: '1px solid #e2e8f0', borderRadius: 20, background: 'white', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500, color: '#64748b' },
  tabActive: { background: '#6366f1', color: 'white', border: '1px solid #6366f1' },
  error: { background: '#fee2e2', color: '#dc2626', padding: '12px 16px', borderRadius: 8, marginBottom: 16 },
  loading: { textAlign: 'center', padding: 40, color: '#94a3b8' },
  empty: { textAlign: 'center', padding: '60px 20px', color: '#94a3b8' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 18 },
  card: { background: 'white', borderRadius: 14, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: '1px solid #f1f5f9', cursor: 'pointer', transition: 'all 0.2s', position: 'relative' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  badge: { padding: '3px 10px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 700 },
  cardId: { fontSize: '0.75rem', color: '#94a3b8' },
  cardTitle: { margin: '0 0 6px', fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' },
  cardDesc: { margin: '0 0 14px', fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  progressWrap: { marginBottom: 14 },
  progressLabel: { display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b', marginBottom: 6 },
  progressTrack: { height: 8, background: '#f1f5f9', borderRadius: 8, overflow: 'hidden' },
  progressFill: { height: '100%', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', borderRadius: 8, transition: 'width 0.3s' },
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f8fafc', paddingTop: 12 },
  cardMeta: { fontSize: '0.78rem', color: '#94a3b8' },
  viewLink: { fontSize: '0.85rem', color: '#6366f1', fontWeight: 600 },
};
