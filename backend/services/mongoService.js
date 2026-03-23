/**
 * MongoDB Service
 * Provides CRUD operations for all collections
 */

const { isMongoConnected } = require('../config/mongodb');
const District = require('../models/District');
const Zone = require('../models/Zone');
const Unit = require('../models/Unit');
const User = require('../models/User');
const Meeting = require('../models/Meeting');
const Agenda = require('../models/Agenda');

class MongoService {
  /**
   * Check if MongoDB is available
   */
  isAvailable() {
    return isMongoConnected();
  }

  // ==================== DISTRICTS ====================

  async getDistricts() {
    return District.find().sort({ districtId: 1 });
  }

  async getDistrictById(districtId) {
    return District.findOne({ districtId });
  }

  async createDistrict(data) {
    const district = new District(data);
    return district.save();
  }

  // ==================== ZONES ====================

  async getZones(districtId = null) {
    const query = districtId ? { districtId } : {};
    const zones = await Zone.find(query).sort({ zoneId: 1 });
    
    // Transform to match existing API format
    return zones.map(zone => ({
      id: zone.zoneId,
      name: zone.name,
      districtId: zone.districtId,
      roles: zone.roles || [],
    }));
  }

  async getZoneById(zoneId) {
    return Zone.findOne({ zoneId });
  }

  async getZoneByName(zoneName) {
    return Zone.findOne({ name: zoneName });
  }

  async createZone(data) {
    const zone = new Zone(data);
    return zone.save();
  }

  async updateZone(zoneId, data) {
    return Zone.findOneAndUpdate(
      { zoneId },
      { $set: data },
      { new: true }
    );
  }

  async upsertZone(zoneId, data) {
    return Zone.findOneAndUpdate(
      { zoneId },
      { $set: { ...data, zoneId } },
      { new: true, upsert: true }
    );
  }

  // ==================== UNITS ====================

  async getUnits(zoneId = null) {
    const query = zoneId ? { zoneId } : {};
    return Unit.find(query).sort({ unitId: 1 });
  }

  async getUnitsByZone(zoneId) {
    const units = await Unit.find({ zoneId }).sort({ name: 1 });
    return units.map(u => u.name);
  }

  async createUnit(data) {
    const unit = new Unit(data);
    return unit.save();
  }

  async upsertUnit(unitId, data) {
    return Unit.findOneAndUpdate(
      { unitId },
      { $set: { ...data, unitId } },
      { new: true, upsert: true }
    );
  }

  // ==================== USERS ====================

  async getUserByUsername(username) {
    console.log(`[MongoService] Finding user: "${username.toLowerCase()}"`);
    const user = await User.findOne({ 
      username: username.toLowerCase() 
    });
    console.log(`[MongoService] Found user:`, user ? user.username : 'null');
    
    if (!user) return null;
    
    return {
      username: user.username,
      password: user.password,
      roles: user.roles || [],
      zoneAccess: user.zoneAccess || [],
      districtAccess: user.districtAccess || [],
      isAntiGravity: user.isAntiGravity || false,
      createdDate: user.createdAt?.toISOString() || '',
    };
  }

  async createUser(data) {
    const user = new User({
      ...data,
      username: data.username.toLowerCase(),
    });
    return user.save();
  }

  async updateUser(username, data) {
    return User.findOneAndUpdate(
      { username: username.toLowerCase() },
      { $set: data },
      { new: true }
    );
  }

  async upsertUser(username, data) {
    return User.findOneAndUpdate(
      { username: username.toLowerCase() },
      { $set: { ...data, username: username.toLowerCase() } },
      { new: true, upsert: true }
    );
  }

  async getAllUsers() {
    const users = await User.find().sort({ username: 1 });
    return users.map(u => ({
      username: u.username,
      roles: u.roles || [],
      zoneAccess: u.zoneAccess || [],
      districtAccess: u.districtAccess || [],
      isAntiGravity: u.isAntiGravity || false,
      createdDate: u.createdAt?.toISOString() || '',
    }));
  }

  // ==================== ATTENDEES (from Committee + Units) ====================

  async getAttendeesByZone(zoneId) {
    // Get zone info
    const zoneInfo = await Zone.findOne({ zoneId });
    const currentZoneName = zoneInfo ? zoneInfo.name : '';

    const attendees = [];

    // Get committee members ONLY
    const Committee = require('../models/Committee');
    const CommitteeRole = require('../models/CommitteeRole');
    
    // Fetch roles map for Malayalam names
    const rolesList = await CommitteeRole.find({});
    const roleMap = {};
    rolesList.forEach(r => { roleMap[r.roleId] = r.name; });

    const committeeMembers = await Committee.find({ zoneId });

    // Custom sort: Treasurer (CR05) should come last
    const rolePriority = {
      'CR01': 1, // President
      'CR02': 2, // Vice President
      'CR03': 3, // Secretary
      'CR04': 4, // Joint Secretary
      'CR06': 5, // Executive Member
      'CR05': 99 // Treasurer
    };

    committeeMembers.sort((a, b) => {
      const pA = rolePriority[a.roleId] || 50;
      const pB = rolePriority[b.roleId] || 50;
      return pA - pB;
    });

    committeeMembers.forEach(member => {
      // Use Malayalam role from CommitteeRole if available
      const displayRole = (member.roleId && roleMap[member.roleId]) ? roleMap[member.roleId] : '';
      
      attendees.push({
        name: member.name,
        role: displayRole,
        zoneName: member.zoneName || currentZoneName,
        mobile: member.mobile || '',
        whatsapp: member.whatsapp || '',
      });
    });

    // NOTE: Unit members are no longer included
    // All meeting participants must be registered in the Committee table

    return attendees;
  }

  // ==================== AGENDAS ====================

  async getAgendas() {
    const agendas = await Agenda.find().sort({ order: 1 });
    return agendas.map(a => a.name);
  }

  async getAllAgendaDocuments() {
    return Agenda.find().sort({ order: 1 });
  }

  async createAgenda(data) {
    const agenda = new Agenda(data);
    return agenda.save();
  }

  async upsertAgenda(agendaId, data) {
    return Agenda.findOneAndUpdate(
      { agendaId },
      { $set: { ...data, agendaId } },
      { new: true, upsert: true }
    );
  }

  // ==================== MEETINGS ====================

  async getMeetingById(meetingId) {
    const meeting = await Meeting.findOne({ meetingId });
    if (!meeting) return null;

    return {
      meetingId: meeting.meetingId,
      zoneName: meeting.zoneName,
      zoneId: meeting.zoneId,
      date: meeting.date,
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      agendas: meeting.agendas || [],
      minutes: meeting.minutes || [],
      attendance: meeting.attendance || [],
      qhls: meeting.qhls || [],
      swagatham: meeting.swagatham || '',
      adhyakshan: meeting.adhyakshan || '',
      nandhi: meeting.nandhi || '',
      sheetName: meeting.sheetName || '',
      savedDate: meeting.createdAt?.toISOString() || '',
    };
  }

  async getAllMeetings() {
    const meetings = await Meeting.find().sort({ createdAt: -1 });
    return meetings.map(m => ({
      meetingId: m.meetingId,
      zoneName: m.zoneName,
      zoneId: m.zoneId,
      date: m.date,
      savedDate: m.createdAt?.toISOString() || '',
    }));
  }

  async getMeetingsByDateRange(startDate, endDate) {
    const query = {};
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }

    const meetings = await Meeting.find(query).sort({ date: -1 });
    return meetings.map(m => ({
      meetingId: m.meetingId,
      zoneName: m.zoneName,
      zoneId: m.zoneId,
      date: m.date,
      startTime: m.startTime,
      endTime: m.endTime,
      attendance: m.attendance || [],
      qhls: m.qhls || [],
      sheetName: m.sheetName || '',
      savedDate: m.createdAt?.toISOString() || '',
    }));
  }

  async getMeetingsByZone(zoneId) {
    const meetings = await Meeting.find({ zoneId }).sort({ date: -1 });
    return meetings;
  }


  async saveMeeting(data) {
    // Generate unique meeting ID
    const meetingId = `MEET-${Date.now()}`;
    
    // Try to find zoneId from zoneName
    let zoneId = data.zoneId || '';
    if (!zoneId && data.zoneName) {
      const zone = await this.getZoneByName(data.zoneName);
      if (zone) zoneId = zone.zoneId;
    }

    const meeting = new Meeting({
      meetingId,
      zoneId,
      zoneName: data.zoneName,
      date: data.date,
      startTime: data.startTime || '',
      endTime: data.endTime || '',
      agendas: data.agendas || [],
      minutes: data.minutes || [],
      attendance: data.attendance || [],
      qhls: data.qhls || [],
      swagatham: data.swagatham || '',
      adhyakshan: data.adhyakshan || '',
      nandhi: data.nandhi || '',
    });

    await meeting.save();
    return { meetingId, success: true };
  }

  async updateMeeting(meetingId, data) {
    const meeting = await Meeting.findOne({ meetingId });
    if (!meeting) return null;

    // Update fields
    if (data.zoneName) meeting.zoneName = data.zoneName;
    if (data.date) meeting.date = data.date;
    if (data.startTime !== undefined) meeting.startTime = data.startTime;
    if (data.endTime !== undefined) meeting.endTime = data.endTime;
    if (data.agendas) meeting.agendas = data.agendas;
    if (data.minutes) meeting.minutes = data.minutes;
    if (data.attendance) meeting.attendance = data.attendance;
    if (data.qhls) meeting.qhls = data.qhls;
    if (data.swagatham !== undefined) meeting.swagatham = data.swagatham;
    if (data.adhyakshan !== undefined) meeting.adhyakshan = data.adhyakshan;
    if (data.nandhi !== undefined) meeting.nandhi = data.nandhi;

    await meeting.save();
    return { success: true, meetingId };
  }

  async deleteMeeting(meetingId) {
    const result = await Meeting.deleteOne({ meetingId });
    return result.deletedCount > 0 ? { success: true } : null;
  }

  // ==================== REPORT GENERATION ====================

  generateReport(meetingData) {
    const { attendance, agendas, minutes, qhls } = meetingData;

    // Separate present and leave attendees
    const presentAttendees = [];
    const leaveAttendees = [];

    if (attendance && Array.isArray(attendance)) {
      attendance.forEach((item) => {
        const name = item.name;

        if (item.status === 'present') {
          presentAttendees.push(name);
        } else if (item.status === 'leave') {
          // Check if leave was not informed
          const reason = item.leaveNotInformed 
            ? ' (ലീവ് അറിയിച്ചിട്ടില്ല)' 
            : (item.reason ? ` (${item.reason})` : '');
          leaveAttendees.push(`${name}${reason}`);
        }
      });
    }

    // Format QHLS data
    let qhlsReport = '';
    if (qhls && qhls.length > 0) {
      // Filter out rows where both male and female are 0 or empty
      const validQhlsRows = qhls.filter(row => {
        const male = parseInt(row.male, 10) || 0;
        const female = parseInt(row.female, 10) || 0;
        return (male > 0 || female > 0);
      });

      if (validQhlsRows.length > 0) {
        const headings = 'യൂണിറ്റ്, ദിവസം, ഫാക്കൽറ്റി, പുരുഷൻ, സ്ത്രീ';
        
        const qhlsRowsFormatted = validQhlsRows.map(row => {
          const unit = row.unit || '';
          const day = row.day || '';
          const faculty = row.faculty || '';
          const male = row.male || '0';
          const female = row.female || '0';
          return `${unit}, ${day}, ${faculty}, ${male}, ${female}`;
        });

        qhlsReport = `${headings}\n${qhlsRowsFormatted.join('\n')}`;
      }
    }

    // Format agendas with serial numbers
    const formattedAgendas = agendas && agendas.length > 0
      ? agendas.map((agenda, index) => `${index + 1}. ${agenda}`).join('\n')
      : 'അജണ്ടകളില്ല';

    // Format minutes with serial numbers
    const formattedMinutes = minutes && minutes.length > 0
      ? minutes.map((minute, index) => `${index + 1}. ${minute}`).join('\n')
      : 'തീരുമാനങ്ങളില്ല';

    // Format leave attendees with serial numbers
    const formattedLeaveAttendees = leaveAttendees.length > 0
      ? leaveAttendees.map((attendee, index) => `${index + 1}. ${attendee}`).join('\n')
      : '';

    // Build report
    const report = {
      attendees: presentAttendees.join('\n'),
      leaveAayavar: formattedLeaveAttendees,
      agenda: formattedAgendas,
      minutes: formattedMinutes,
      qhlsStatus: qhlsReport,
    };

    return report;
  }

  // ==================== BULK OPERATIONS ====================

  async bulkUpsertZones(zones) {
    const operations = zones.map(zone => ({
      updateOne: {
        filter: { zoneId: zone.zoneId },
        update: { $set: zone },
        upsert: true,
      },
    }));
    return Zone.bulkWrite(operations);
  }

  async bulkUpsertUnits(units) {
    const operations = units.map(unit => ({
      updateOne: {
        filter: { unitId: unit.unitId },
        update: { $set: unit },
        upsert: true,
      },
    }));
    return Unit.bulkWrite(operations);
  }

  async bulkUpsertUsers(users) {
    const operations = users.map(user => ({
      updateOne: {
        filter: { username: user.username.toLowerCase() },
        update: { $set: { ...user, username: user.username.toLowerCase() } },
        upsert: true,
      },
    }));
    return User.bulkWrite(operations);
  }
}

module.exports = new MongoService();

