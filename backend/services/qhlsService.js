/**
 * QHLS Service
 * Handles QHLS-specific data queries and aggregations
 */

const Meeting = require('../models/Meeting');
const Zone = require('../models/Zone');
const Unit = require('../models/Unit');

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
}

module.exports = new QHLSService();
