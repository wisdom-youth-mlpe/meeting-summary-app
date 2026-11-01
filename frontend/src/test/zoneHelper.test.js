import { describe, test, expect, beforeEach } from 'vitest';
import {
  setZonesCache, getZoneNameById, getZoneIdByName, filterMeetingsByZoneAccess,
} from '../services/zoneHelper';

beforeEach(() => setZonesCache([{ id: 'Z1', name: 'Zone One' }, { id: 'Z2', name: 'Zone Two' }]));

describe('zoneHelper', () => {
  test('maps ids and names both ways, falling back to the input', () => {
    expect(getZoneNameById('Z1')).toBe('Zone One');
    expect(getZoneIdByName('Zone Two')).toBe('Z2');
    expect(getZoneNameById('Z9')).toBe('Z9');
  });

  test('filters meetings by zone access', () => {
    const meetings = [
      { meetingId: 1, zoneId: 'Z1' },
      { meetingId: 2, zoneName: 'Zone Two' },
      { meetingId: 3, zoneName: 'Zone One' },
    ];
    expect(filterMeetingsByZoneAccess(meetings, null)).toHaveLength(3);
    expect(filterMeetingsByZoneAccess(meetings, ['Z1']).map(m => m.meetingId)).toEqual([1, 3]);
    expect(filterMeetingsByZoneAccess(meetings, [])).toEqual([]);
    expect(filterMeetingsByZoneAccess(null, ['Z1'])).toEqual([]);
  });
});
