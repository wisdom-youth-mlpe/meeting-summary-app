const mongoose = require('mongoose');

const campaignFiltersSchema = new mongoose.Schema({
  roles: [{ type: String, trim: true }],           // roleIds from CommitteeRole
  committeeLevel: { type: String, default: 'all' }, // 'district' | 'zone' | 'unit' | 'all'
  districts: [{ type: String, trim: true }],        // districtIds
  zones: [{ type: String, trim: true }],             // zoneIds
  units: [{ type: String, trim: true }],             // unitIds
  departments: [{ type: String, trim: true }],       // department tags
  hasPhone: { type: Boolean, default: null },        // null = no filter, true/false = filter
}, { _id: false });

const campaignSchema = new mongoose.Schema({
  campaignId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
    trim: true,
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'completed'],
    default: 'draft',
  },
  filters: {
    type: campaignFiltersSchema,
    default: () => ({}),
  },
  whatsappTemplate: {
    type: String,
    default: '',
  },
  // Scope — controls which users can see this campaign (hierarchical access)
  scopeDistrictIds: [{ type: String, trim: true }], // district-level access
  scopeZoneIds: [{ type: String, trim: true }],      // zone-level access
  // Assigned callers (by username) — optional, if empty all scoped users can call
  assignedCallers: [{ type: String, trim: true }],
  createdBy: {
    type: String,
    required: true,
    trim: true,
  },
}, {
  timestamps: true,
});

campaignSchema.index({ campaignId: 1 });
campaignSchema.index({ status: 1 });
campaignSchema.index({ scopeDistrictIds: 1 });
campaignSchema.index({ scopeZoneIds: 1 });
campaignSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Campaign', campaignSchema);
