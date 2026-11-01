import { describe, test, expect } from 'vitest';
import {
  isAuthenticated, getUser, logout, hasRole, hasAnyRole,
  getUserAccessConfig, isAntiGravityUser, getAccessibleZones,
} from '../services/auth';

const signIn = (user) => {
  localStorage.setItem('meeting_app_token', 'token');
  localStorage.setItem('meeting_app_user', JSON.stringify(user));
};

describe('session storage', () => {
  test('signed in until logout', () => {
    signIn({ username: 'u', roles: ['admin'] });
    expect(isAuthenticated()).toBe(true);
    expect(getUser().username).toBe('u');
    logout();
    expect(isAuthenticated()).toBe(false);
    expect(getUser()).toBeNull();
  });

  test('corrupt stored user reads as null', () => {
    localStorage.setItem('meeting_app_user', '{bad');
    expect(getUser()).toBeNull();
  });
});

describe('roles and tabs', () => {
  test('hasRole / hasAnyRole', () => {
    const user = { roles: ['zone_admin'] };
    expect(hasRole('zone_admin', user)).toBe(true);
    expect(hasRole('admin', user)).toBe(false);
    expect(hasAnyRole(['admin', 'zone_admin'], user)).toBe(true);
    expect(hasAnyRole(['admin'], null)).toBe(false);
  });

  test.each([
    ['admin', '/admin', { showFormTab: true, showDashboardTab: true, showAdminTab: true }],
    ['zone_admin', '/form', { showFormTab: true, showDashboardTab: false, showAdminTab: false }],
    ['district_admin', '/dashboard', { showFormTab: false, showDashboardTab: true, showAdminTab: false }],
  ])('%s lands on %s', (role, route, tabs) => {
    const config = getUserAccessConfig({ roles: [role] });
    expect(config.defaultRoute).toBe(route);
    expect(config).toMatchObject(tabs);
  });

  test('signed-out users see reports only', () => {
    expect(getUserAccessConfig()).toMatchObject({ defaultRoute: '/report', showFormTab: false });
  });

  test('anti-gravity detection', () => {
    expect(isAntiGravityUser({ isAntiGravity: true })).toBe(true);
    expect(isAntiGravityUser({ roles: ['admin', 'district_admin', 'zone_admin'] })).toBe(true);
    expect(isAntiGravityUser({ roles: ['admin'] })).toBe(false);
  });

  test('accessible zones: all for admins, own zones for zone admins', () => {
    signIn({ roles: ['admin'] });
    expect(getAccessibleZones()).toBeNull();
    signIn({ roles: ['zone_admin'], zoneAccess: ['Z1'] });
    expect(getAccessibleZones()).toEqual(['Z1']);
    signIn({ roles: [] });
    expect(getAccessibleZones()).toEqual([]);
  });
});
