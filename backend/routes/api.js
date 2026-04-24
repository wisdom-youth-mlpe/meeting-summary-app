const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { isMongoConnected } = require('../config/mongodb');
const mongoService = require('../services/mongoService');
const { hasZoneAccess, getAccessibleZones } = require('../middleware/checkZoneAccess');

// Apply authentication middleware to all routes except debug
router.use((req, res, next) => {
  // Skip auth for debug endpoint
  if (req.path === '/debug/env') {
    return next();
  }
  // Apply auth middleware to all other routes
  authenticate(req, res, next);
});

// Middleware to check if user can create meetings
const canCreateMeeting = (req, res, next) => {
  const { roles } = req.user;
  if (roles.includes('admin') || roles.includes('zone_admin')) {
    return next();
  }
  return res.status(403).json({ 
    success: false, 
    error: 'Access denied', 
    message: 'Only zone admins and admins can create meetings' 
  });
};

const isAdmin = (req, res, next) => {
  if (req.user && req.user.roles && req.user.roles.includes('admin')) {
    return next();
  }
  return res.status(403).json({
    success: false,
    error: 'Access denied',
    message: 'Admin access required'
  });
};

// Middleware to check if user can edit/delete a specific meeting
const canEditMeeting = async (req, res, next) => {
  try {
    const { meetingId } = req.params;
    const { roles, zoneAccess } = req.user;
    
    if (roles.includes('admin')) return next();
    
    const meeting = await mongoService.getMeetingById(meetingId);
    if (!meeting) {
      return res.status(404).json({ success: false, error: 'Meeting not found' });
    }
    
    if (roles.includes('zone_admin') && zoneAccess.includes(meeting.zoneId)) {
      return next();
    }
    
    return res.status(403).json({ 
      success: false, 
      error: 'Access denied', 
      message: 'You do not have permission to modify this meeting' 
    });
  } catch (error) {
    console.error('Error in canEditMeeting middleware:', error);
    res.status(500).json({ success: false, error: 'Server error check permissions' });
  }
};

/**
 * GET /api/debug/env
 * Debug endpoint to check environment variables (development only)
 */
router.get('/debug/env', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Not available in production' });
  }
  
  res.json({
    mongoConnected: isMongoConnected(),
    nodeEnv: process.env.NODE_ENV || 'development',
  });
});

/**
 * GET /api/zones
 * Fetch available zones from MongoDB based on user access
 */
router.get('/zones', async (req, res) => {
  try {
    if (!isMongoConnected()) {
      return res.status(503).json({
        success: false,
        error: 'Database not available',
        message: 'MongoDB is not connected',
      });
    }

    console.log('[API] Fetching zones from MongoDB');
    const allZones = await mongoService.getZones();
    
    // Get accessible zones for the user
    const accessibleZones = getAccessibleZones(req.user);
    
    // Filter zones based on user access
    let zones = allZones;
    
    // Check for districts query param
    const districtsParam = req.query.districts;
    if (districtsParam) {
      const districtsList = districtsParam.split(',');
      zones = zones.filter(zone => districtsList.includes(zone.districtId));
    } else if (accessibleZones !== 'all') {
      // Filter to only zones the user has access to
      zones = allZones.filter(zone => accessibleZones.includes(zone.id));
    }
    
    // Add units from MongoDB
    for (const zone of zones) {
      const units = await mongoService.getUnitsByZone(zone.id);
      zone.units = units;
    }
    
    res.json({ 
      success: true, 
      zones, 
      source: 'mongodb',
      isAdmin: accessibleZones === 'all'
    });
  } catch (error) {
    console.error('Error in /api/zones:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch zones',
      message: error.message,
    });
  }
});

/**
 * GET /api/attendees/:zoneId
 * Fetch attendees for a specific zone from MongoDB
 */
router.get('/attendees/:zoneId', async (req, res) => {
  try {
    if (!isMongoConnected()) {
      return res.status(503).json({
        success: false,
        error: 'Database not available',
        message: 'MongoDB is not connected',
      });
    }

    const { zoneId } = req.params;
    console.log('[API] Fetching attendees from MongoDB for zone:', zoneId);
    const attendees = await mongoService.getAttendeesByZone(zoneId);
    res.json({ success: true, attendees, source: 'mongodb' });
  } catch (error) {
    console.error('Error in /api/attendees:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch attendees',
      message: error.message,
    });
  }
});

/**
 * GET /api/agendas
 * Fetch all agenda items from MongoDB
 */
router.get('/agendas', async (req, res) => {
  try {
    if (!isMongoConnected()) {
      return res.status(503).json({
        success: false,
        error: 'Database not available',
        message: 'MongoDB is not connected',
      });
    }

    console.log('[API] Fetching agendas from MongoDB');
    const agendas = await mongoService.getAgendas();
    res.json({ success: true, agendas });
  } catch (error) {
    console.error('Error in /api/agendas:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agendas',
      message: error.message,
    });
  }
});

/**
 * GET /api/meetings/:meetingId/report
 * Generate formatted report for a meeting
 */
router.get('/meetings/:meetingId/report', async (req, res) => {
  try {
    if (!isMongoConnected()) {
      return res.status(503).json({
        success: false,
        error: 'Database not available',
        message: 'MongoDB is not connected',
      });
    }

    const { meetingId } = req.params;
    const meetingData = await mongoService.getMeetingById(meetingId);

    if (!meetingData) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found',
      });
    }

    const report = mongoService.generateReport(meetingData);

    res.json({
      success: true,
      meetingData,
      report,
    });
  } catch (error) {
    console.error('Error in /api/meetings/:meetingId/report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate report',
      message: error.message,
    });
  }
});

/**
 * POST /api/meetings
 * Save meeting summary to MongoDB
 */
router.post('/meetings', express.json(), canCreateMeeting, async (req, res) => {
  try {
    if (!isMongoConnected()) {
      return res.status(503).json({
        success: false,
        error: 'Database not available',
        message: 'MongoDB is not connected',
      });
    }

    const {
      zoneName,
      zoneId,
      date,
      startTime,
      endTime,
      agendas,
      minutes,
      attendance,
      qhls,
      swagatham,
      adhyakshan,
      nandhi,
    } = req.body;

    // Validation
    if (!zoneName || !date || !minutes || !attendance) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    if (!Array.isArray(minutes) || !Array.isArray(attendance)) {
      return res.status(400).json({
        success: false,
        error: 'Minutes and attendance must be arrays',
      });
    }

    // Check zone access - get zoneId from zoneName if not provided
    let targetZoneId = zoneId;
    if (!targetZoneId) {
      const allZones = await mongoService.getZones();
      const zone = allZones.find(z => z.name === zoneName);
      targetZoneId = zone ? zone.id : null;
    }

    // Verify user has access to this zone
    if (targetZoneId && !hasZoneAccess(req.user, targetZoneId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You do not have permission to create meetings for this zone'
      });
    }

    const { roles } = req.user;

    const result = await mongoService.saveMeeting({
      zoneName,
      zoneId: targetZoneId,
      date,
      startTime,
      endTime,
      agendas: Array.isArray(agendas) ? agendas : [],
      minutes,
      attendance,
      qhls: Array.isArray(qhls) ? qhls : [],
      swagatham: swagatham || '',
      adhyakshan: adhyakshan || '',
      nandhi: nandhi || '',
    });

    res.json({
      success: true,
      message: 'Meeting summary saved successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error in POST /api/meetings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save meeting summary',
      message: error.message,
    });
  }
});

/**
 * GET /api/meetings/list
 * Get meetings from MongoDB (filtered by user access)
 */
router.get('/meetings/list', async (req, res) => {
  try {
    if (!isMongoConnected()) {
      return res.status(503).json({
        success: false,
        error: 'Database not available',
        message: 'MongoDB is not connected',
      });
    }

    console.log('[API] Fetching meetings from MongoDB');
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 0; // 0 means all for backward compatibility if needed, but we should set a default
    
    // Build filter based on user role and access
    const user = req.user;
    const filter = {};
    
    // Admin sees all meetings, others are filtered
    if (!user.roles || !user.roles.includes('admin')) {
      const allZones = await mongoService.getZones();
      
      // Check for districts query param
      const districtsParam = req.query.districts;
      if (districtsParam) {
        const districtsList = districtsParam.split(',');
        const districtZones = allZones
          .filter(z => districtsList.includes(z.districtId))
          .map(z => z.name);
        filter.zoneName = { $in: districtZones };
      }
      // District admin - filter by district access
      else if (user.roles && user.roles.includes('district_admin')) {
        const districtZones = allZones
          .filter(z => user.districtAccess && user.districtAccess.includes(z.districtId))
          .map(z => z.name);
        filter.zoneName = { $in: districtZones };
      }
      // Zone admin - filter by zone access
      else if (user.roles && user.roles.includes('zone_admin')) {
        const accessibleZoneNames = allZones
          .filter(z => user.zoneAccess && user.zoneAccess.includes(z.id))
          .map(z => z.name);
        filter.zoneName = { $in: accessibleZoneNames };
      }
    }
    
    const { meetings, pagination } = await mongoService.getAllMeetings(filter, page, limit);
    
    res.json({ success: true, meetings, pagination });
  } catch (error) {
    console.error('Error in /api/meetings/list:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch meetings',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/meetings/:meetingId
 * Delete a meeting from MongoDB
 */
router.delete('/meetings/:meetingId', canEditMeeting, async (req, res) => {
  try {
    if (!isMongoConnected()) {
      return res.status(503).json({
        success: false,
        error: 'Database not available',
        message: 'MongoDB is not connected',
      });
    }

    const { meetingId } = req.params;
    
    const result = await mongoService.deleteMeeting(meetingId);

    res.json({
      success: true,
      message: 'Meeting deleted successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error in DELETE /api/meetings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete meeting',
      message: error.message,
    });
  }
});

/**
 * PUT /api/meetings/:meetingId
 * Update a meeting in MongoDB
 */
router.put('/meetings/:meetingId', express.json(), canEditMeeting, async (req, res) => {
  try {
    if (!isMongoConnected()) {
      return res.status(503).json({
        success: false,
        error: 'Database not available',
        message: 'MongoDB is not connected',
      });
    }

    const { meetingId } = req.params;
    const {
      zoneName,
      date,
      startTime,
      endTime,
      agendas,
      minutes,
      attendance,
      qhls,
      swagatham,
      adhyakshan,
      nandhi,
    } = req.body;

    if (!zoneName || !date || !minutes || !attendance) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Zone name, date, minutes, and attendance are required',
      });
    }

    if (!Array.isArray(minutes) || !Array.isArray(attendance)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid data format',
        message: 'Minutes and attendance must be arrays',
      });
    }
    
    const result = await mongoService.updateMeeting(meetingId, {
      zoneName,
      date,
      startTime,
      endTime,
      agendas: Array.isArray(agendas) ? agendas : [],
      minutes,
      attendance,
      qhls: Array.isArray(qhls) ? qhls : [],
      swagatham: swagatham || '',
      adhyakshan: adhyakshan || '',
      nandhi: nandhi || '',
    });

    res.json({
      success: true,
      message: 'Meeting updated successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error in PUT /api/meetings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update meeting',
      message: error.message,
    });
  }
});

/**
 * GET /api/attendance-summary
 * Get attendance summary by weeks for a specific zone
 */
router.get('/attendance-summary', async (req, res) => {
  try {
    if (!isMongoConnected()) {
      return res.status(503).json({
        success: false,
        error: 'Database not available',
        message: 'MongoDB is not connected',
      });
    }

    const { zoneId, startDate, endDate } = req.query;

    if (!zoneId || zoneId === 'All') {
      return res.status(400).json({
        success: false,
        error: 'A specific zone must be selected'
      });
    }

    // 1. Fetch all attendees for this zone
    const allZones = await mongoService.getZones();
    const zone = allZones.find(z => z.name === zoneId || z.id === zoneId);

    if (!zone) {
      return res.status(404).json({
        success: false,
        error: 'Zone not found'
      });
    }

    const attendees = await mongoService.getAttendeesByZone(zone.id);

    // 2. Fetch meetings in range for this zone
    const meetings = await mongoService.getMeetingsByDateRange(startDate, endDate);
    const zoneMeetings = meetings.filter(m => m.zoneName === zone.name);

    // 3. Group meetings by week
    const weekMeetingsMap = new Map();
    zoneMeetings.forEach(meeting => {
      const weekKey = meeting.date ? meeting.date.substring(0, 10) : 'unknown';
      if (!weekMeetingsMap.has(weekKey)) {
        weekMeetingsMap.set(weekKey, meeting);
      }
    });

    // Sort weeks chronologically
    const sortedWeeks = Array.from(weekMeetingsMap.keys()).sort();

    // 4. Build attendance data for each attendee
    const attendanceData = attendees.map((attendee, index) => {
      const weeklyStatus = {};
      let presentCount = 0;
      let totalWeeks = sortedWeeks.length;

      sortedWeeks.forEach(week => {
        const meeting = weekMeetingsMap.get(week);
        if (meeting && meeting.attendance) {
          const record = meeting.attendance.find(a => a.name === attendee.name);
          if (record) {
            if (record.status === 'present') {
              weeklyStatus[week] = 'P';
              presentCount++;
            } else if (record.status === 'leave') {
              weeklyStatus[week] = 'L';
            } else {
              weeklyStatus[week] = 'A';
            }
          } else {
            weeklyStatus[week] = 'A';
          }
        } else {
          weeklyStatus[week] = '-';
        }
      });

      const percentage = totalWeeks > 0 ? ((presentCount / totalWeeks) * 100).toFixed(1) : '0.0';

      return {
        slNo: index + 1,
        name: attendee.name,
        role: attendee.role,
        weeklyStatus,
        totalAttendance: `${presentCount} out of ${totalWeeks}`,
        presentCount,
        totalWeeks,
        percentage: parseFloat(percentage)
      };
    });

    res.json({
      success: true,
      data: {
        zoneName: zone.name,
        weeks: sortedWeeks,
        attendees: attendanceData,
        totalMeetings: zoneMeetings.length
      }
    });

  } catch (error) {
    console.error('Error in /api/attendance-summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch attendance summary',
      message: error.message
    });
  }
});

/**
 * GET /api/dashboard/stats
 * Get aggregated dashboard statistics
 */
router.get('/dashboard/stats', async (req, res) => {
  try {
    if (!isMongoConnected()) {
      return res.status(503).json({
        success: false,
        error: 'Database not available',
        message: 'MongoDB is not connected',
      });
    }

    const { startDate, endDate, zoneId } = req.query;
    
    // 1. Fetch meetings in range
    const meetings = await mongoService.getMeetingsByDateRange(startDate, endDate);
    
    // 2. Fetch all zones
    let allZones = await mongoService.getZones();
    
    // Filter zones based on user access
    const user = req.user;
    if (!user.roles.includes('admin')) {
      if (user.roles.includes('district_admin')) {
        // District admin - filter by districtAccess
        allZones = allZones.filter(z => user.districtAccess && user.districtAccess.includes(z.districtId));
      } else if (user.roles.includes('zone_admin')) {
        // Zone admin - filter by zoneAccess
        allZones = allZones.filter(z => user.zoneAccess && user.zoneAccess.includes(z.id));
      }
    }

    const zoneNames = allZones.map(z => z.name);

    // Filter by Zone if provided, OR filter by accessible zones if not admin
    let filteredMeetings = meetings;
    if (zoneId && zoneId !== 'All') {
      console.log(`[API] Filtering details for zone: "${zoneId}"`);
      filteredMeetings = meetings.filter(m => (m.zoneName || '').trim() === zoneId.trim());
      console.log(`[API] Found ${filteredMeetings.length} meetings for zone "${zoneId}"`);
    } else if (!user.roles.includes('admin')) {
      // For 'All' view, restrict to accessible zones
      filteredMeetings = meetings.filter(m => zoneNames.includes(m.zoneName));
    }

    // Count meetings per zone and track the last meeting date
    const zoneMeetingCounts = {};
    const zoneLastMeetingDate = {};
    filteredMeetings.forEach(m => {
      zoneMeetingCounts[m.zoneName] = (zoneMeetingCounts[m.zoneName] || 0) + 1;
      const currentLastDate = zoneLastMeetingDate[m.zoneName];
      if (!currentLastDate || new Date(m.date) > new Date(currentLastDate)) {
        zoneLastMeetingDate[m.zoneName] = m.date;
      }
    });

    // Zones WITH meetings
    const zonesWithMeetings = zoneNames
      .filter(z => zoneMeetingCounts[z] > 0)
      .map(z => ({ 
        zoneName: z, 
        meetingCount: zoneMeetingCounts[z],
        lastMeetingDate: zoneLastMeetingDate[z]
      }));

    // Zones WITHOUT meetings
    const noMeetingZones = zoneNames
      .filter(z => !zoneMeetingCounts[z])
      .map(z => ({ zoneName: z, reason: "" }));

    // Attendance Stats
    const personStats = {};
    const sortedMeetings = [...filteredMeetings].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Map to track last meeting attendance
    const lastMeetingByZone = {};

    sortedMeetings.forEach(meeting => {
      lastMeetingByZone[meeting.zoneName] = meeting;

      const meetingAttendees = meeting.attendance || [];
      
      meetingAttendees.forEach(record => {
        const name = record.name;

        if (!personStats[name]) {
          personStats[name] = {
            name: name,
            present: 0,
            leave: 0,
            total: 0,
            maxConsecutiveLeaves: 0,
            currentConsecutiveLeaves: 0,
            lastAttendedDate: null,
            zone: meeting.zoneName
          };
        }

        personStats[name].total += 1;

        if (record.status === 'present') {
          personStats[name].present += 1;
          personStats[name].currentConsecutiveLeaves = 0;
          personStats[name].lastAttendedDate = meeting.date;
        } else if (record.status === 'leave') {
          personStats[name].leave += 1;
          personStats[name].currentConsecutiveLeaves += 1;
          if (personStats[name].currentConsecutiveLeaves > personStats[name].maxConsecutiveLeaves) {
            personStats[name].maxConsecutiveLeaves = personStats[name].currentConsecutiveLeaves;
          }
        }
      });
    });

    // Finalize Stats
    const summaryStats = Object.values(personStats).map(p => ({
      name: p.name,
      total: p.total,
      present: p.present,
      leave: p.leave,
      absent: p.total - p.present - p.leave,
      percentage: p.total > 0 ? ((p.present / p.total) * 100).toFixed(1) : 0,
      consecutiveLeaves: p.maxConsecutiveLeaves,
      currentStreak: p.currentConsecutiveLeaves,
      lastAttended: p.lastAttendedDate,
      zone: p.zone
    }));

    // Consecutive Leave List (Current Streak >= 3)
    const consecutiveLeaveList = summaryStats
      .filter(p => p.currentStreak >= 3)
      .map(p => ({
        name: p.name,
        zone: p.zone,
        consecutiveLeaves: p.currentStreak,
        lastAttendedDate: p.lastAttended
      }));

    // Latest Meeting Leaves
    let latestMeeting = null;
    if (sortedMeetings.length > 0) {
      latestMeeting = sortedMeetings[sortedMeetings.length - 1];
    }

    const latestLeaves = [];
    if (latestMeeting) {
      (latestMeeting.attendance || []).forEach(a => {
        if (a.status === 'leave') {
          latestLeaves.push({
            name: a.name,
            reason: a.reason,
            zone: latestMeeting.zoneName
          });
        }
      });
    }

    // Meetings list
    const meetingsList = filteredMeetings.map(meeting => ({
      meetingId: meeting.meetingId,
      date: meeting.date,
      zoneName: meeting.zoneName,
    })).sort((a, b) => new Date(b.date) - new Date(a.date));

    // Helper to get week number
    const getWeekNumber = (d) => {
      d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
      var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
      return weekNo;
    };

    res.json({
      success: true,
      data: {
        totalMeetings: filteredMeetings.length,
        totalZones: allZones.length,
        zonesWithMeetings,
        noMeetingZones,
        missingReports: noMeetingZones.length,
        consecutiveAbsence: consecutiveLeaveList,
        latestLeaves: latestLeaves,
        meetingsList,
        attendanceRegister: summaryStats.slice(0, 50),
        totalMembers: summaryStats.length,
        qhlsMissingBranches: [], // TODO: Implement QHLS tracking
        currentWeek: getWeekNumber(new Date(startDate || new Date())),
      }
    });

  } catch (error) {
    console.error('Error in /api/dashboard/stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard stats',
      message: error.message
    });
  }
});

// ==================== COMMITTEE ROUTES ====================

const Committee = require('../models/Committee');
const CommitteeRole = require('../models/CommitteeRole');
const Zone = require('../models/Zone');

/**
 * GET /api/committees
 * Get all committee members
 */
router.get('/committees', async (req, res) => {
  try {
    if (!isMongoConnected()) {
      return res.status(503).json({
        success: false,
        error: 'Database not available',
        message: 'MongoDB is not connected',
      });
    }

    const { zoneId } = req.query;
    let query = {};
    
    const user = req.user;
    const isAdmin = user.roles && (user.roles.includes('admin') || user.roles.includes('district_admin'));
    
    if (!isAdmin && !user.isAntiGravity) {
      const allowedZones = user.zoneAccess || [];
      if (zoneId && zoneId !== 'All') {
        if (!allowedZones.includes(zoneId)) {
          return res.status(403).json({ success: false, error: 'Access denied to this zone' });
        }
        query.zoneId = zoneId;
      } else {
        // limit to user's assigned zones
        if (allowedZones.length === 0) {
          return res.json({ success: true, committees: [] }); // User has no zones assigned
        }
        query.zoneId = { $in: allowedZones };
      }
    } else {
      if (zoneId && zoneId !== 'All') {
        query.zoneId = zoneId;
      }
    }

    const committees = await Committee.find(query).sort({ zoneId: 1, roleId: 1 });
    
    // Populate role names and zone names
    const roles = await CommitteeRole.find();
    const zones = await Zone.find();
    
    const roleMap = {};
    roles.forEach(r => {
      roleMap[r.roleId] = r.name;
    });
    
    const zoneMap = {};
    zones.forEach(z => {
      zoneMap[z.zoneId] = z.name;
    });
    
    const enrichedCommittees = committees.map(c => ({
      ...c.toObject(),
      roleName: roleMap[c.roleId] || c.roleId,
      zoneName: zoneMap[c.zoneId] || c.zoneId,
    }));

    res.json({
      success: true,
      committees: enrichedCommittees,
    });
  } catch (error) {
    console.error('Error in /api/committees:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch committees',
      message: error.message,
    });
  }
});

/**
 * GET /api/committee-roles
 * Get all committee roles for dropdown
 */
router.get('/committee-roles', async (req, res) => {
  try {
    if (!isMongoConnected()) {
      return res.status(503).json({
        success: false,
        error: 'Database not available',
        message: 'MongoDB is not connected',
      });
    }

    const roles = await CommitteeRole.find().sort({ roleId: 1 });
    
    res.json({
      success: true,
      roles,
    });
  } catch (error) {
    console.error('Error in /api/committee-roles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch committee roles',
      message: error.message,
    });
  }
});

/**
 * POST /api/committees
 * Create a new committee member
 */
router.post('/committees', express.json(), async (req, res) => {
  try {
    if (!isMongoConnected()) {
      return res.status(503).json({
        success: false,
        error: 'Database not available',
        message: 'MongoDB is not connected',
      });
    }

    const { name, roleId, zoneId, mobile, whatsapp } = req.body;

    const user = req.user;
    const isAdmin = user.roles && user.roles.includes('admin');
    if (!isAdmin && !user.isAntiGravity) {
      if (!user.zoneAccess || !user.zoneAccess.includes(zoneId)) {
        return res.status(403).json({ success: false, error: 'Access denied to create members for this zone' });
      }
    }

    // Validation
    if (!name || !roleId || !zoneId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Name, role, and zone are required',
      });
    }

    // Generate committeeId
    const count = await Committee.countDocuments();
    const committeeId = `C${String(count + 1).padStart(4, '0')}`;

    const committee = new Committee({
      committeeId,
      name,
      roleId,
      zoneId,
      mobile: mobile || '',
      whatsapp: whatsapp || '',
    });

    await committee.save();

    res.json({
      success: true,
      message: 'Committee member added successfully',
      committee: committee.toObject(),
    });
  } catch (error) {
    console.error('Error in POST /api/committees:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add committee member',
      message: error.message,
    });
  }
});

/**
 * PUT /api/committees/:committeeId
 * Update a committee member
 */
router.put('/committees/:committeeId', express.json(), async (req, res) => {
  try {
    if (!isMongoConnected()) {
      return res.status(503).json({
        success: false,
        error: 'Database not available',
        message: 'MongoDB is not connected',
      });
    }

    const { committeeId } = req.params;
    const { name, roleId, zoneId, mobile, whatsapp } = req.body;

    const user = req.user;
    const isAdmin = user.roles && user.roles.includes('admin');
    
    if (!isAdmin && !user.isAntiGravity) {
       const existingCommittee = await Committee.findOne({ committeeId });
       if (!existingCommittee) {
         return res.status(404).json({ success: false, error: 'Member not found' });
       }
       if (!user.zoneAccess || !user.zoneAccess.includes(existingCommittee.zoneId) || !user.zoneAccess.includes(zoneId)) {
         return res.status(403).json({ success: false, error: 'Access denied' });
       }
    }

    // Validation
    if (!name || !roleId || !zoneId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Name, role, and zone are required',
      });
    }

    const committee = await Committee.findOneAndUpdate(
      { committeeId },
      {
        name,
        roleId,
        zoneId,
        mobile: mobile || '',
        whatsapp: whatsapp || '',
      },
      { new: true }
    );

    if (!committee) {
      return res.status(404).json({
        success: false,
        error: 'Committee member not found',
      });
    }

    res.json({
      success: true,
      message: 'Committee member updated successfully',
      committee: committee.toObject(),
    });
  } catch (error) {
    console.error('Error in PUT /api/committees:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update committee member',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/committees/:committeeId
 * Delete a committee member
 */
router.delete('/committees/:committeeId', async (req, res) => {
  try {
    if (!isMongoConnected()) {
      return res.status(503).json({
        success: false,
        error: 'Database not available',
        message: 'MongoDB is not connected',
      });
    }

    const { committeeId } = req.params;
    
    const user = req.user;
    const isAdmin = user.roles && user.roles.includes('admin');
    
    const existingCommittee = await Committee.findOne({ committeeId });
    if (!existingCommittee) {
      return res.status(404).json({
        success: false,
        error: 'Member not found',
      });
    }
    
    if (!isAdmin && !user.isAntiGravity) {
       if (!user.zoneAccess || !user.zoneAccess.includes(existingCommittee.zoneId)) {
         return res.status(403).json({ success: false, error: 'Access denied' });
       }
    }

    const committee = await Committee.findOneAndDelete({ committeeId });

    if (!committee) {
      return res.status(404).json({
        success: false,
        error: 'Committee member not found',
      });
    }

    res.json({
      success: true,
      message: 'Committee member deleted successfully',
    });
  } catch (error) {
    console.error('Error in DELETE /api/committees:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete committee member',
      message: error.message,
    });
  }
});

// ==================== QHLS ROUTES ====================

const qhlsService = require('../services/qhlsService');

/**
 * GET /api/qhls/dashboard
 * Get complete QHLS dashboard data for a specific week
 */
router.get('/qhls/dashboard', async (req, res) => {
  try {
    if (!isMongoConnected()) {
      return res.status(503).json({
        success: false,
        error: 'Database not available',
        message: 'MongoDB is not connected',
      });
    }

    const weekOffset = parseInt(req.query.weekOffset) || 0;
    const data = await qhlsService.getDashboardData(weekOffset);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error in /api/qhls/dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch QHLS dashboard data',
      message: error.message,
    });
  }
});

/**
 * GET /api/qhls/week/:offset
 * Get QHLS responses for a specific week
 */
router.get('/qhls/week/:offset', async (req, res) => {
  try {
    if (!isMongoConnected()) {
      return res.status(503).json({
        success: false,
        error: 'Database not available',
        message: 'MongoDB is not connected',
      });
    }

    const weekOffset = parseInt(req.params.offset) || 0;
    const responses = await qhlsService.getQHLSByWeek(weekOffset);
    const stats = await qhlsService.getQHLSStats(weekOffset);

    res.json({
      success: true,
      responses,
      stats,
    });
  } catch (error) {
    console.error('Error in /api/qhls/week:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch QHLS week data',
      message: error.message,
    });
  }
});

/**
 * GET /api/qhls/missing/:offset
 * Get units without QHLS for a specific week
 */
router.get('/qhls/missing/:offset', async (req, res) => {
  try {
    if (!isMongoConnected()) {
      return res.status(503).json({
        success: false,
        error: 'Database not available',
        message: 'MongoDB is not connected',
      });
    }

    const weekOffset = parseInt(req.params.offset) || 0;
    const missing = await qhlsService.getMissingUnits(weekOffset);

    res.json({
      success: true,
      missing,
    });
  } catch (error) {
    console.error('Error in /api/qhls/missing:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch missing units',
      message: error.message,
    });
  }
});

/**
 * GET /api/settings/:key
 * Fetch a setting by key
 */
router.get('/settings/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const value = await mongoService.getSetting(key);
    res.json({ success: true, value });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/settings
 * Update a setting (Admin only)
 */
router.post('/settings', isAdmin, async (req, res) => {
  try {
    const { key, value, description } = req.body;
    if (!key) return res.status(400).json({ success: false, error: 'Key is required' });
    
    await mongoService.updateSetting(key, value, description);
    res.json({ success: true, message: 'Setting updated' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
