import { describe, test, expect } from 'vitest';
import { deriveQhlsStatus, buildQhlsRows } from '../components/MeetingForm';

describe('deriveQhlsStatus', () => {
  test.each([
    [{ status: 'nadannittilla' }, 'nadannittilla'],
    [{ hasQhls: false }, 'illa'],
    [{ hasQhls: true, day: 'Monday' }, 'nadannu'],
    [{ hasQhls: true, male: '3' }, 'nadannu'],
    [{ hasQhls: true, male: '0', female: '' }, ''],
    [{}, ''],
  ])('%j -> "%s"', (row, expected) => {
    expect(deriveQhlsStatus(row)).toBe(expected);
  });
});

describe('buildQhlsRows', () => {
  test('one empty row per zone unit', () => {
    expect(buildQhlsRows(['Unit A', 'Unit B'])).toEqual([
      { unit: 'Unit A', status: '', hasQhls: true },
      { unit: 'Unit B', status: '', hasQhls: true },
    ]);
  });

  test('keeps saved statuses and reads older rows', () => {
    const rows = buildQhlsRows(['Unit A', 'Unit B'], [
      { unit: 'Unit A', status: 'nadannu' },
      { unit: 'Unit B', hasQhls: false },
    ]);
    expect(rows.map(r => r.status)).toEqual(['nadannu', 'illa']);
  });

  test('keeps saved units that are no longer in the zone', () => {
    const rows = buildQhlsRows(['Unit A'], [{ unit: 'Old Unit', status: 'nadannu', faculty: 'F' }]);
    expect(rows.map(r => r.unit)).toEqual(['Unit A', 'Old Unit']);
    expect(rows[1].faculty).toBe('F');
  });

  test('without zone units, returns saved rows or nothing', () => {
    expect(buildQhlsRows([], [{ unit: 'X', status: 'illa' }]).map(r => r.status)).toEqual(['illa']);
    expect(buildQhlsRows()).toEqual([]);
  });
});
