const mongoose = require('mongoose');

const CALL_STATUSES = [
  'pending',
  'will_participate',
  'will_not',
  'no_answer',
  'unreachable',
  'callback',
  'whatsapp_responded',
];

const campaignCallSchema = new mongoose.Schema({
  campaignId: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  committeeId: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  status: {
    type: String,
    enum: CALL_STATUSES,
    default: 'pending',
  },
  notes: {
    type: String,
    default: '',
    trim: true,
  },
  callerUsername: {
    type: String,
    default: '',
    trim: true,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Compound unique index — one record per person per campaign
campaignCallSchema.index({ campaignId: 1, committeeId: 1 }, { unique: true });

module.exports = { CampaignCall: mongoose.model('CampaignCall', campaignCallSchema), CALL_STATUSES };
