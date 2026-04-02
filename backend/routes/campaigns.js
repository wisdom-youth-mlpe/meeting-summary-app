const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticate } = require('../middleware/auth');
const Campaign = require('../models/Campaign');
const { CampaignCall, CALL_STATUSES } = require('../models/CampaignCall');
const Committee = require('../models/Committee');
const CommitteeRole = require('../models/CommitteeRole');
const Zone = require('../models/Zone');
const District = require('../models/District');

// Apply authentication to all routes
router.use(authenticate);

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Check if a user can manage campaigns (create/edit)
 */
const canManageCampaigns = (roles) =>
  roles.includes('admin') || roles.includes('campaign_manager');

/**
 * Check if a user can call in a campaign (view + update status)
 */
const canCallInCampaign = (roles) =>
  roles.includes('admin') ||
  roles.includes('campaign_manager') ||
  roles.includes('caller') ||
  roles.includes('district_admin') ||
  roles.includes('zone_admin');

/**
 * Filter campaigns visible to a user based on hierarchical scope:
 *   admin → all campaigns
 *   district_admin → campaigns with their districtId in scopeDistrictIds
 *   zone_admin → campaigns with their zoneId in scopeZoneIds
 *   campaign_manager/caller → campaigns they are assigned to (or all if no assignedCallers set)
 */
const getScopedCampaignQuery = (user) => {
  if (!user) return null;
  const { roles, districtAccess, zoneAccess, username, isAntiGravity } = user;

  // Admins and anti-gravity see everything
  if (isAntiGravity || roles.includes('admin')) return {};

  // District admins see campaigns in their districts
  if (roles.includes('district_admin')) {
    const districts = districtAccess || [];
    return {
      $or: [
        { scopeDistrictIds: { $in: districts } },
        { scopeZoneIds: { $exists: true, $size: 0 }, scopeDistrictIds: { $exists: true, $size: 0 } }, // unscoped
      ],
    };
  }

  // Zone admins see campaigns in their zones
  if (roles.includes('zone_admin')) {
    const zones = zoneAccess || [];
    return { $or: [{ scopeZoneIds: { $in: zones } }, { scopeDistrictIds: { $exists: true, $size: 0 }, scopeZoneIds: { $exists: true, $size: 0 } }] };
  }

  // callers/campaign_managers see campaigns assigned to them or with no specific assignment
  return {
    $or: [
      { assignedCallers: username },
      { assignedCallers: { $size: 0 } },
    ],
  };
};

/**
 * Build MongoDB query from campaign filters
 */
const buildCommitteeQuery = (filters, user) => {
  const query = {};

  if (filters.roles && filters.roles.length > 0) {
    query.roleId = { $in: filters.roles };
  }
  if (filters.committeeLevel && filters.committeeLevel !== 'all') {
    query.committeeLevel = filters.committeeLevel;
  }
  if (filters.districts && filters.districts.length > 0) {
    // Committees don't directly have districtId — filter via zone lookup done separately
    // Store districtId mapping for post-fetch filtering support too
    query._districtFilter = filters.districts;
  }
  if (filters.zones && filters.zones.length > 0) {
    query.zoneId = { $in: filters.zones };
  }
  if (filters.departments && filters.departments.length > 0) {
    query.departments = { $in: filters.departments };
  }
  if (filters.hasPhone === true) {
    query.mobile = { $exists: true, $ne: '' };
  } else if (filters.hasPhone === false) {
    query.$or = [{ mobile: { $exists: false } }, { mobile: '' }];
  }

  return query;
};

/**
 * Auto-generate next campaignId
 */
const nextCampaignId = async () => {
  const last = await Campaign.findOne().sort({ campaignId: -1 }).lean();
  if (!last) return 'CMP0001';
  const num = parseInt(last.campaignId.replace('CMP', ''), 10) + 1;
  return `CMP${String(num).padStart(4, '0')}`;
};

/**
 * Resolve person list for a campaign, merging call statuses
 */
const resolvePersons = async (campaign, { search, status, zone, skip = 0, limit = 200 } = {}) => {
  const committeeQuery = buildCommitteeQuery(campaign.filters || {});
  delete committeeQuery._districtFilter; // remove helper key

  // District filter: get zone IDs for those districts first
  if ((campaign.filters?.districts || []).length > 0 && !(campaign.filters?.zones || []).length) {
    const zones = await Zone.find({ districtId: { $in: campaign.filters.districts } }).lean();
    committeeQuery.zoneId = { $in: zones.map((z) => z.zoneId) };
  }

  if (zone && zone !== 'all') {
    committeeQuery.zoneId = zone;
  }
  if (search) {
    committeeQuery.name = { $regex: search, $options: 'i' };
  }

  const persons = await Committee.find(committeeQuery).lean();

  // Get call statuses for these persons in this campaign
  const committeeIds = persons.map((p) => p.committeeId);
  const callRecords = await CampaignCall.find({
    campaignId: campaign.campaignId,
    committeeId: { $in: committeeIds },
  }).lean();

  const callMap = {};
  callRecords.forEach((r) => { callMap[r.committeeId] = r; });

  // Fetch zone & role names for display
  const zoneIds = [...new Set(persons.map((p) => p.zoneId).filter(Boolean))];
  const roleIds = [...new Set(persons.map((p) => p.roleId).filter(Boolean))];
  const zones = await Zone.find({ zoneId: { $in: zoneIds } }).lean();
  const roles = await CommitteeRole.find({ roleId: { $in: roleIds } }).lean();
  const zoneMap = Object.fromEntries(zones.map((z) => [z.zoneId, z.name]));
  const roleMap = Object.fromEntries(roles.map((r) => [r.roleId, r.name]));

  let merged = persons.map((p) => {
    const callRecord = callMap[p.committeeId] || null;
    return {
      committeeId: p.committeeId,
      name: p.name,
      roleId: p.roleId,
      roleName: roleMap[p.roleId] || p.roleId,
      zoneId: p.zoneId,
      zoneName: zoneMap[p.zoneId] || p.zoneId,
      committeeLevel: p.committeeLevel,
      departments: p.departments || [],
      mobile: p.mobile || '',
      whatsapp: p.whatsapp || '',
      callStatus: callRecord?.status || 'pending',
      notes: callRecord?.notes || '',
      lastUpdated: callRecord?.lastUpdated || null,
      callerUsername: callRecord?.callerUsername || '',
    };
  });

  // Filter by status if requested
  if (status && status !== 'all') {
    merged = merged.filter((p) => p.callStatus === status);
  }

  // Sort: pending first, then others
  const statusOrder = { pending: 0, callback: 1, no_answer: 2, will_participate: 3, whatsapp_responded: 4, will_not: 5, unreachable: 6 };
  merged.sort((a, b) => (statusOrder[a.callStatus] ?? 9) - (statusOrder[b.callStatus] ?? 9));

  return { persons: merged.slice(skip, skip + limit), total: merged.length };
};

// ─── Routes ─────────────────────────────────────────────────────────────────

/**
 * GET /api/campaigns
 * List campaigns visible to the current user
 */
router.get('/', async (req, res) => {
  try {
    const scopeQuery = getScopedCampaignQuery(req.user);
    if (scopeQuery === null) return res.json({ success: true, campaigns: [] });

    const { status } = req.query;
    const query = { ...scopeQuery };
    if (status && status !== 'all') query.status = status;

    const campaigns = await Campaign.find(query).sort({ createdAt: -1 }).lean();

    // Attach progress stats to each campaign
    const withStats = await Promise.all(
      campaigns.map(async (c) => {
        const totalPersons = await Committee.countDocuments(buildCommitteeQuery(c.filters || {}));
        const calledCount = await CampaignCall.countDocuments({
          campaignId: c.campaignId,
          status: { $ne: 'pending' },
        });
        return {
          ...c,
          totalPersons,
          calledCount,
          progressPct: totalPersons > 0 ? Math.round((calledCount / totalPersons) * 100) : 0,
        };
      })
    );

    res.json({ success: true, campaigns: withStats });
  } catch (err) {
    console.error('[campaigns] GET /', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/campaigns
 * Create a new campaign
 */
router.post('/', express.json(), async (req, res) => {
  try {
    if (!canManageCampaigns(req.user.roles)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const {
      name, description, status, filters,
      whatsappTemplate, scopeDistrictIds, scopeZoneIds, assignedCallers,
    } = req.body;

    if (!name) return res.status(400).json({ success: false, error: 'Campaign name is required' });

    const campaignId = await nextCampaignId();
    const campaign = new Campaign({
      campaignId,
      name,
      description: description || '',
      status: status || 'draft',
      filters: filters || {},
      whatsappTemplate: whatsappTemplate || '',
      scopeDistrictIds: scopeDistrictIds || [],
      scopeZoneIds: scopeZoneIds || [],
      assignedCallers: assignedCallers || [],
      createdBy: req.user.username,
    });

    await campaign.save();
    res.json({ success: true, campaign: campaign.toObject() });
  } catch (err) {
    console.error('[campaigns] POST /', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/campaigns/:campaignId
 * Get campaign detail with stats
 */
router.get('/:campaignId', async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ campaignId: req.params.campaignId }).lean();
    if (!campaign) return res.status(404).json({ success: false, error: 'Campaign not found' });

    // Check access
    const scopeQuery = getScopedCampaignQuery(req.user);
    if (scopeQuery && Object.keys(scopeQuery).length > 0) {
      const accessible = await Campaign.findOne({ ...scopeQuery, campaignId: req.params.campaignId }).lean();
      if (!accessible) return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const totalPersons = (await resolvePersons(campaign)).total;
    const calledCount = await CampaignCall.countDocuments({
      campaignId: campaign.campaignId,
      status: { $ne: 'pending' },
    });
    const statusBreakdown = await CampaignCall.aggregate([
      { $match: { campaignId: campaign.campaignId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      campaign: {
        ...campaign,
        totalPersons,
        calledCount,
        progressPct: totalPersons > 0 ? Math.round((calledCount / totalPersons) * 100) : 0,
        statusBreakdown: Object.fromEntries(statusBreakdown.map((s) => [s._id, s.count])),
      },
    });
  } catch (err) {
    console.error('[campaigns] GET /:id', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/campaigns/:campaignId
 * Update a campaign
 */
router.put('/:campaignId', express.json(), async (req, res) => {
  try {
    if (!canManageCampaigns(req.user.roles)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const campaign = await Campaign.findOneAndUpdate(
      { campaignId: req.params.campaignId },
      { $set: req.body },
      { new: true }
    );
    if (!campaign) return res.status(404).json({ success: false, error: 'Campaign not found' });

    res.json({ success: true, campaign: campaign.toObject() });
  } catch (err) {
    console.error('[campaigns] PUT /:id', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/campaigns/:campaignId
 */
router.delete('/:campaignId', async (req, res) => {
  try {
    if (!req.user.roles.includes('admin')) {
      return res.status(403).json({ success: false, error: 'Only admins can delete campaigns' });
    }
    await Campaign.deleteOne({ campaignId: req.params.campaignId });
    await CampaignCall.deleteMany({ campaignId: req.params.campaignId });
    res.json({ success: true, message: 'Campaign deleted' });
  } catch (err) {
    console.error('[campaigns] DELETE /:id', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/campaigns/:campaignId/persons
 * Resolve person list with call statuses
 * Query: ?search=&status=&zone=&skip=&limit=
 */
router.get('/:campaignId/persons', async (req, res) => {
  try {
    if (!canCallInCampaign(req.user.roles)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const campaign = await Campaign.findOne({ campaignId: req.params.campaignId }).lean();
    if (!campaign) return res.status(404).json({ success: false, error: 'Campaign not found' });

    const { search, status, zone, skip = 0, limit = 500 } = req.query;
    const result = await resolvePersons(campaign, {
      search,
      status,
      zone,
      skip: parseInt(skip),
      limit: parseInt(limit),
    });

    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[campaigns] GET /:id/persons', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/campaigns/:campaignId/persons/count
 * Estimated person count for filter preview (used in campaign form)
 */
router.post('/estimate', express.json(), async (req, res) => {
  try {
    if (!canManageCampaigns(req.user.roles)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    const filters = req.body.filters || {};
    const query = buildCommitteeQuery(filters);
    delete query._districtFilter;

    if ((filters.districts || []).length > 0 && !(filters.zones || []).length) {
      const zones = await Zone.find({ districtId: { $in: filters.districts } }).lean();
      query.zoneId = { $in: zones.map((z) => z.zoneId) };
    }

    const count = await Committee.countDocuments(query);
    res.json({ success: true, count });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/campaigns/:campaignId/calls/:committeeId
 * Auto-save call status update for a person
 */
router.put('/:campaignId/calls/:committeeId', express.json(), async (req, res) => {
  try {
    if (!canCallInCampaign(req.user.roles)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const { campaignId, committeeId } = req.params;
    const { status, notes } = req.body;

    if (status && !CALL_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, error: `Invalid status. Valid: ${CALL_STATUSES.join(', ')}` });
    }

    const update = { lastUpdated: new Date(), callerUsername: req.user.username };
    if (status !== undefined) update.status = status;
    if (notes !== undefined) update.notes = notes;

    const record = await CampaignCall.findOneAndUpdate(
      { campaignId, committeeId },
      { $set: update },
      { upsert: true, new: true }
    );

    res.json({ success: true, callRecord: record.toObject() });
  } catch (err) {
    console.error('[campaigns] PUT /:id/calls/:cid', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/campaigns/:campaignId/stats
 * Campaign statistics summary
 */
router.get('/:campaignId/stats', async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ campaignId: req.params.campaignId }).lean();
    if (!campaign) return res.status(404).json({ success: false, error: 'Campaign not found' });

    const totalPersons = (await resolvePersons(campaign)).total;
    const breakdown = await CampaignCall.aggregate([
      { $match: { campaignId: req.params.campaignId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const stats = { pending: totalPersons, ...Object.fromEntries(breakdown.map((b) => [b._id, b.count])) };
    const calledCount = CALL_STATUSES.filter((s) => s !== 'pending').reduce((sum, s) => sum + (stats[s] || 0), 0);
    stats.pending = totalPersons - calledCount;

    res.json({
      success: true,
      stats: {
        totalPersons,
        calledCount,
        progressPct: totalPersons > 0 ? Math.round((calledCount / totalPersons) * 100) : 0,
        breakdown: stats,
      },
    });
  } catch (err) {
    console.error('[campaigns] GET /:id/stats', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
