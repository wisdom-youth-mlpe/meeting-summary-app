const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, default: '' },
  status: { type: String, enum: ['present', 'leave', 'absent'], default: 'present' },
  reason: { type: String, default: '' },
}, { _id: false });

const QHLSSchema = new mongoose.Schema({
  unit: { type: String, default: '' },
  hasQhls: { type: Boolean, default: true },
  day: { type: String, default: '' },
  faculty: { type: String, default: '' },
  facultyMobile: { type: String, default: '' },
  syllabus: { type: String, default: '' },
  location: { type: String, default: '' },
  afterRamadhan: { type: String, default: '' },
  male: { type: Number, default: 0 },
  female: { type: Number, default: 0 },
}, { _id: false });

const MeetingSchema = new mongoose.Schema({
  meetingId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  zoneId: {
    type: String,
    required: true,
    index: true,
  },
  zoneName: {
    type: String,
    required: true,
  },
  date: {
    type: String,
    required: true,
  },
  startTime: {
    type: String,
    default: '',
  },
  endTime: {
    type: String,
    default: '',
  },
  agendas: {
    type: [String],
    default: [],
  },
  minutes: {
    type: [String],
    default: [],
  },
  attendance: {
    type: [AttendanceSchema],
    default: [],
  },
  qhls: {
    type: [QHLSSchema],
    default: [],
  },
  swagatham: {
    type: String,
    default: '',
  },
  adhyakshan: {
    type: String,
    default: '',
  },
  nandhi: {
    type: String,
    default: '',
  },
  sheetName: {
    type: String,
    default: '',
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt
});

// Index for efficient queries
MeetingSchema.index({ zoneName: 1, date: -1 });
MeetingSchema.index({ date: -1 });
MeetingSchema.index({ createdAt: -1 });

const Meeting = mongoose.model('Meeting', MeetingSchema);

module.exports = Meeting;
