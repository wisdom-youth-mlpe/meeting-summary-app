/**
 * QHLS Service
 * Handles QHLS-specific data queries and aggregations
 */

const Meeting = require('../models/Meeting');
const Zone = require('../models/Zone');
const Unit = require('../models/Unit');

// Status of one saved QHLS row. Rows saved before statuses existed carry the
// checkbox and counts instead; read those the way the meeting form does.
const rowStatus = (row) => {
  if (row.status) return row.status;
  if (row.hasQhls === false) return 'illa';
  if (row.day || row.faculty || parseInt(row.male, 10) || parseInt(row.female, 10)) return 'nadannu';
  return '';
};

class QHLSService {
  /**
   * Get the week boundaries (Wednesday to Tuesday) for a given date
   * @param {string} dateStr - Date string in YYYY-MM-DD format
   * @returns {Object} { weekStart, weekEnd } in YYYY-MM-DD format
   */
  getWeekBoundaries(dateStr) {
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 3 = Wednesday
    
    // Calculate days to subtract to get to Wednesday
    let daysToWednesday;
    if (dayOfWeek >= 3) {
      daysToWednesday = dayOfWeek - 3;
    } else {
      daysToWednesday = dayOfWeek + 4; // Sunday=4, Monday=5, Tuesday=6
    }
    
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - daysToWednesday);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // Tuesday
    
    const formatDate = (d) => d.toISOString().split('T')[0];
    
    return {
      weekStart: formatDate(weekStart),
      weekEnd: formatDate(weekEnd),
    };
  }

  /**
   * Get QHLS data for a specific week
   * @param {number} weekOffset - 0 for current week, -1 for previous week, etc.
   * @returns {Array} QHLS responses with zone, unit, and participant data
   */
  async getQHLSByWeek(weekOffset = 0) {
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + (weekOffset * 7));
    
    const { weekStart, weekEnd } = this.getWeekBoundaries(targetDate.toISOString().split('T')[0]);
    
    // Find all meetings in this week
    const meetings = await Meeting.find({
      date: { $gte: weekStart, $lte: weekEnd },
    }).sort({ zoneName: 1 });

    const responses = [];
    
    for (const meeting of meetings) {
      if (meeting.qhls && meeting.qhls.length > 0) {
        meeting.qhls.forEach(qhls => {
          if (qhls.unit) {
            responses.push({
              zone: meeting.zoneName,
              unit: qhls.unit,
              hasQhls: qhls.hasQhls !== false,
              day: qhls.day || '',
              faculty: qhls.faculty || '',
              male: parseInt(qhls.male) || 0,
              female: parseInt(qhls.female) || 0,
              date: meeting.date,
            });
          }
        });
      }
    }
    
    return responses;
  }

  /**
   * Get aggregated QHLS statistics for a week
   * @param {number} weekOffset - 0 for current week, -1 for previous week
   * @returns {Object} Stats including total responses, males, females, participants
   */
  async getQHLSStats(weekOffset = 0) {
    const responses = await this.getQHLSByWeek(weekOffset);
    
    // Filter only units with QHLS
    const withQhls = responses.filter(r => r.hasQhls);
    
    const stats = {
      totalResponses: withQhls.length,
      totalMales: withQhls.reduce((sum, r) => sum + r.male, 0),
      totalFemales: withQhls.reduce((sum, r) => sum + r.female, 0),
      totalParticipants: 0,
    };
    
    stats.totalParticipants = stats.totalMales + stats.totalFemales;
    
    return stats;
  }

  /**
   * Get units that haven't submitted QHLS for a week
   * @param {number} weekOffset - 0 for current week, -1 for previous week
   * @returns {Object} Missing units grouped by zone
   */
  async getMissingUnits(weekOffset = 0) {
    const responses = await this.getQHLSByWeek(weekOffset);
    
    // Get all zones and their units
    const zones = await Zone.find().sort({ name: 1 });
    const allUnitsMap = {};
    
    for (const zone of zones) {
      const units = await Unit.find({ zoneId: zone.zoneId }).sort({ name: 1 });
      allUnitsMap[zone.name] = units.map(u => u.name);
    }
    
    // Get units that have submitted
    const submittedUnits = new Set();
    responses.forEach(r => {
      submittedUnits.add(`${r.zone}::${r.unit}`);
    });
    
    // Find missing units
    const missingByZone = {};
    let totalMissing = 0;
    let totalUnits = 0;
    
    for (const [zoneName, units] of Object.entries(allUnitsMap)) {
      totalUnits += units.length;
      const missing = units.filter(unit => !submittedUnits.has(`${zoneName}::${unit}`));
      
      if (missing.length > 0) {
        missingByZone[zoneName] = missing;
        totalMissing += missing.length;
      }
    }
    
    return {
      byZone: missingByZone,
      totalMissing,
      totalUnits,
    };
  }

  /**
   * Get complete dashboard data for a week
   * @param {number} weekOffset - 0 for current week, -1 for previous week
   * @returns {Object} Complete dashboard data
   */
  async getDashboardData(weekOffset = 0) {
    const [responses, stats, missing, prevResponses] = await Promise.all([
      this.getQHLSByWeek(weekOffset),
      this.getQHLSStats(weekOffset),
      this.getMissingUnits(weekOffset),
      this.getQHLSByWeek(weekOffset - 1),
    ]);
    
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + (weekOffset * 7));
    const { weekStart, weekEnd } = this.getWeekBoundaries(targetDate.toISOString().split('T')[0]);
    
    // Create a map for quick lookup of previous week's data
    const prevMap = new Map();
    prevResponses.forEach(r => {
      prevMap.set(`${r.zone}::${r.unit}`, r);
    });

    // Calculate variations for each response
    const responsesWithVariations = responses.map(r => {
      const prev = prevMap.get(`${r.zone}::${r.unit}`);
      const variation = {
        male: prev ? r.male - prev.male : null,
        female: prev ? r.female - prev.female : null,
        total: prev ? (r.male + r.female) - (prev.male + prev.female) : null,
        isFirst: !prev
      };
      return { ...r, variation };
    });

    // Group responses by zone
    const groupedResponses = {};
    responsesWithVariations.forEach(r => {
      if (!groupedResponses[r.zone]) {
        groupedResponses[r.zone] = [];
      }
      groupedResponses[r.zone].push(r);
    });

    return {
      weekStart,
      weekEnd,
      responses: responsesWithVariations,
      groupedResponses,
      stats,
      missing,
    };
  }

  /**
   * First and last day (YYYY-MM-DD) of a reporting week
   * @param {number} meetingDay - district meeting day, 0 = Sunday
   * @param {number} weekOffset - 0 for this week, -1 for last week
   */
  getReportingWeek(meetingDay, weekOffset = 0) {
    // Same rule as the frontend's services/week.js: weeks start on the meeting day,
    // and on the meeting day itself the week that just finished is reported
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    const diff = base.getDay() === meetingDay ? 7 : (base.getDay() - meetingDay + 7) % 7;
    const start = new Date(base);
    start.setDate(base.getDate() - diff + weekOffset * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { weekStart: key(start), weekEnd: key(end) };
  }

  /**
   * Every unit of every accessible zone for one reporting week, grouped by its
   * QHLS status. When a zone met more than once, each unit takes the most recent
   * status any of that week's meetings recorded for it.
   * @param {number} weekOffset - 0 for this week, -1 for last week
   * @param {number} meetingDay - district meeting day, 0 = Sunday
   * @param {Array<{id, name}>} zones - zones the user may see
   */
  async getWeekStatus(weekOffset, meetingDay, zones) {
    const { weekStart, weekEnd } = this.getReportingWeek(meetingDay, weekOffset);
    const zoneNames = zones.map(z => z.name);

    const [meetings, units] = await Promise.all([
      Meeting.find({ date: { $gte: weekStart, $lte: weekEnd }, zoneName: { $in: zoneNames } })
        .sort({ date: -1, createdAt: -1 }),
      Unit.find({ zoneId: { $in: zones.map(z => z.id) } }).sort({ name: 1 }),
    ]);

    // Meetings arrive newest first, so the first status seen for a unit is the latest
    const statusesByZone = {};
    const meetingDateByZone = {};
    meetings.forEach(m => {
      if (!meetingDateByZone[m.zoneName]) meetingDateByZone[m.zoneName] = m.date;
      const statuses = statusesByZone[m.zoneName] || (statusesByZone[m.zoneName] = new Map());
      (m.qhls || []).forEach(row => {
        const unit = (row.unit || '').trim();
        const status = rowStatus(row);
        if (unit && status && !statuses.has(unit)) statuses.set(unit, status);
      });
    });

    const totals = { held: 0, notHeld: 0, noQhls: 0, notReported: 0, units: 0 }

    const zoneRows = zones.map(zone => {
      const groups = { held: [], notHeld: [], noQhls: [], notReported: [] };
      const statusByUnit = statusesByZone[zone.name] || new Map();

      // Units on record for the zone, plus any unit the meeting itself listed
      const unitNames = units.filter(u => u.zoneId === zone.id).map(u => u.name.trim());
      statusByUnit.forEach((_, unit) => {
        if (!unitNames.includes(unit)) unitNames.push(unit);
      });

      unitNames.forEach(unit => {
        const status = statusByUnit.get(unit);
        if (status === 'nadannu') groups.held.push(unit);
        else if (status === 'nadannittilla') groups.notHeld.push(unit);
        else if (status === 'illa') groups.noQhls.push(unit);
        else groups.notReported.push(unit);
      });

      Object.keys(groups).forEach(k => { totals[k] += groups[k].length; });
      totals.units += unitNames.length;

      return { zone: zone.name, meetingDate: meetingDateByZone[zone.name] || null, ...groups };
    });

    return { weekStart, weekEnd, zones: zoneRows, totals };
  }
}

module.exports = new QHLSService();
