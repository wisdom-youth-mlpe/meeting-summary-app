import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const TOKEN_KEY = 'meeting_app_token';
const USER_KEY = 'meeting_app_user';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Login with username and password
 */
export const login = async (username, password) => {
  try {
    const response = await api.post('/api/auth/login', { username, password });
    if (response.data.success) {
      // Store token and user info
      localStorage.setItem(TOKEN_KEY, response.data.data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(response.data.data.user));
      return { success: true, data: response.data.data };
    }
    return { success: false, error: response.data.message || 'Login failed' };
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || 'Login failed';
    return { success: false, error: errorMessage };
  }
};

/**
 * Logout - clear stored token and user info
 */
export const logout = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = () => {
  return !!localStorage.getItem(TOKEN_KEY);
};

/**
 * Get stored authentication token
 */
export const getToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

/**
 * Get stored user info
 */
export const getUser = () => {
  const userStr = localStorage.getItem(USER_KEY);
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch (e) {
      return null;
    }
  }
  return null;
};

/**
 * Verify token with backend
 */
export const verifyToken = async () => {
  const token = getToken();
  if (!token) {
    return { success: false, error: 'No token found' };
  }

  try {
    const response = await api.post('/api/auth/verify', { token });
    return { success: response.data.success, data: response.data.data };
  } catch (error) {
    // Token is invalid or expired
    logout();
    return { success: false, error: 'Token verification failed' };
  }
};

/**
 * Check if user has a specific role
 */
export const hasRole = (role, user = null) => {
  const targetUser = user || getUser();
  if (!targetUser || !targetUser.roles) return false;
  return targetUser.roles.includes(role);
};

/**
 * Check if user has any of the specified roles
 */
export const hasAnyRole = (roles, user = null) => {
  const targetUser = user || getUser();
  if (!targetUser || !targetUser.roles) return false;
  return roles.some(role => targetUser.roles.includes(role));
};

/**
 * Get configuration for UI visibility and routing based on user roles
 */
export const getUserAccessConfig = (user = null) => {
  const targetUser = user || getUser();
  if (!targetUser) {
    return {
      showFormTab: false,
      showReportTab: true,
      showDashboardTab: false,
      showAdminTab: false,
      defaultRoute: '/report'
    };
  }

  const isAdmin = hasRole('admin', targetUser);
  const isZoneAdmin = hasRole('zone_admin', targetUser);
  const isDistrictAdmin = hasRole('district_admin', targetUser);

  // Determine default route by priority
  let defaultRoute = '/report';
  if (isAdmin) defaultRoute = '/admin';
  else if (isZoneAdmin) defaultRoute = '/form';
  else if (isDistrictAdmin) defaultRoute = '/dashboard';

  return {
    showFormTab: isAdmin || isZoneAdmin,
    showReportTab: true,
    showDashboardTab: isAdmin || isDistrictAdmin,
    showAdminTab: isAdmin,
    showMembersTab: isAdmin || isZoneAdmin || isDistrictAdmin,
    defaultRoute
  };
};

/**
 * Check if current user is an Anti-Gravity super user
 * Anti-Gravity users have complete unrestricted access to everything
 */
export const isAntiGravityUser = (user = null) => {
  const targetUser = user || getUser();
  if (!targetUser) return false;

  // Check explicit Anti-Gravity flag
  if (targetUser.isAntiGravity === true) {
    return true;
  }

  // Check if user has ALL three roles
  const roles = Array.isArray(targetUser.roles) ? targetUser.roles : [];
  const hasAllRoles = roles.includes('admin') && 
                      roles.includes('district_admin') && 
                      roles.includes('zone_admin');
  if (hasAllRoles) {
    return true;
  }

  // Check special "ALL" access markers
  const zoneAccess = Array.isArray(targetUser.zoneAccess) ? targetUser.zoneAccess : [];
  const districtAccess = Array.isArray(targetUser.districtAccess) ? targetUser.districtAccess : [];
  
  if (zoneAccess.includes('ALL') || districtAccess.includes('ALL')) {
    return true;
  }

  return false;
};

/**
 * Get access level information for a user
 * @param {Object} user - User object (optional, defaults to current user)
 * @returns {Object} - Access level details
 */
export const getUserAccessLevel = (user = null) => {
  const targetUser = user || getUser();
  
  if (isAntiGravityUser(targetUser)) {
    return {
      level: 'ANTI_GRAVITY',
      description: 'Complete Unrestricted Access',
      canAccessAllZones: true,
      canAccessAllDistricts: true,
      canCreateMeeting: true,
      canEditAnyMeeting: true,
      canDeleteAnyMeeting: true,
      canManageUsers: true,
      canViewDashboard: true,
      showAllTabs: true,
    };
  }

  const roles = Array.isArray(targetUser?.roles) ? targetUser.roles : [];

  if (roles.includes('admin')) {
    return {
      level: 'ADMIN',
      description: 'System Administrator',
      canAccessAllZones: true,
      canAccessAllDistricts: true,
      canCreateMeeting: true,
      canEditAnyMeeting: true,
      canDeleteAnyMeeting: true,
      canManageUsers: true,
      canViewDashboard: true,
      showAllTabs: true,
    };
  }

  if (roles.includes('district_admin')) {
    return {
      level: 'DISTRICT_ADMIN',
      description: 'District Administrator',
      canAccessAllZones: true,
      canAccessAllDistricts: false,
      canCreateMeeting: false,
      canEditAnyMeeting: false,
      canDeleteAnyMeeting: false,
      canManageUsers: false,
      canViewDashboard: true,
      showAllTabs: false,
    };
  }

  if (roles.includes('zone_admin')) {
    return {
      level: 'ZONE_ADMIN',
      description: 'Zone Administrator',
      canAccessAllZones: false,
      canAccessAllDistricts: false,
      canCreateMeeting: true,
      canEditAnyMeeting: false,
      canDeleteAnyMeeting: false,
      canManageUsers: false,
      canViewDashboard: false,
      showAllTabs: false,
    };
  }

  return {
    level: 'USER',
    description: 'Basic User',
    canAccessAllZones: false,
    canAccessAllDistricts: false,
    canCreateMeeting: false,
    canEditAnyMeeting: false,
    canDeleteAnyMeeting: false,
    canManageUsers: false,
    canViewDashboard: false,
    showAllTabs: false,
  };
};

/**
 * Check if user can access a specific zone
 * Anti-Gravity users can access all zones
 */
export const canAccessZone = (zoneId) => {
  const user = getUser();
  if (!user) return false;
  
  // Anti-Gravity users can access all zones
  if (isAntiGravityUser(user)) {
    return true;
  }
  
  // Admin and district_admin can access all zones
  if (hasAnyRole(['admin', 'district_admin'])) {
    return true;
  }
  
  // Zone admin can access their assigned zones
  if (hasRole('zone_admin')) {
    return user.zoneAccess && user.zoneAccess.includes(zoneId);
  }
  
  return false;
};

/**
 * Check if user can edit meetings
 * Anti-Gravity users can edit any meeting
 */
export const canEditMeetings = () => {
  // Anti-Gravity users can edit any meeting
  if (isAntiGravityUser()) {
    return true;
  }
  return hasAnyRole(['zone_admin', 'admin']);
};

/**
 * Check if user can edit a specific meeting
 * Anti-Gravity users can edit any meeting
 */
export const canEditMeeting = (meeting) => {
  const user = getUser();
  if (!user) return false;
  
  // Anti-Gravity users can edit any meeting
  if (isAntiGravityUser(user)) {
    return true;
  }
  
  // Admin can edit any meeting
  if (hasRole('admin')) {
    return true;
  }
  
  // District admin cannot edit (read-only)
  if (hasRole('district_admin') && !hasRole('zone_admin')) {
    return false;
  }
  
  // Zone admin can edit meetings from their zones
  if (hasRole('zone_admin') && meeting && meeting.zoneName) {
    // Need to check if the zone ID matches
    // For now, we'll need to get the zone ID from the meeting
    return canAccessZone(meeting.zoneId || meeting.zoneName);
  }
  
  return false;
};

/**
 * Get accessible zones for the current user
 * Anti-Gravity users get access to all zones
 */
export const getAccessibleZones = () => {
  const user = getUser();
  if (!user) return [];
  
  // Anti-Gravity users can access all zones
  if (isAntiGravityUser(user)) {
    return null; // null means all zones
  }
  
  // Admin and district_admin can access all zones (return null to indicate all)
  if (hasAnyRole(['admin', 'district_admin'])) {
    return null; // null means all zones
  }
  
  // Zone admin can access their assigned zones
  if (hasRole('zone_admin')) {
    return user.zoneAccess || [];
  }
  
  return [];
};

