const mongoose = require('mongoose');

const committeeSchema = new mongoose.Schema({
  committeeId: {
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
  roleId: {
    type: String,
    required: true, // References CommitteeRole.roleId
    trim: true,
  },
  zoneId: {
    type: String,
    required: true,
    trim: true,
  },
  mobile: {
    type: String,
    default: '',
    trim: true,
  },
  whatsapp: {
    type: String,
    default: '',
    trim: true,
  },
}, {
  timestamps: true,
});

// Indexes
committeeSchema.index({ committeeId: 1 });
committeeSchema.index({ zoneId: 1 });
committeeSchema.index({ roleId: 1 });

module.exports = mongoose.model('Committee', committeeSchema);
