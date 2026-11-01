import { describe, test, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QHLSDashboard from '../components/QHLSDashboard';
import api from '../services/api';

vi.mock('../services/api', () => ({ default: { get: vi.fn() } }));

const data = {
  weekStart: '2026-10-28',
  weekEnd: '2026-11-03',
  totals: { held: 1, notHeld: 1, noQhls: 1, notReported: 2, units: 5 },
  zones: [
    { zone: 'Zone One', meetingDate: '2026-10-28', held: ['Unit A'], notHeld: ['Unit B'], noQhls: ['Unit E'], notReported: [] },
    { zone: 'Zone Two', meetingDate: null, held: [], notHeld: [], noQhls: [], notReported: ['Unit C', 'Unit D'] },
  ],
};

const zoneCard = (name) => screen.getByText(name, { selector: '.qhls-zone-name' }).closest('details');

describe('QHLSDashboard', () => {
  test('groups units of each zone by status', async () => {
    api.get.mockResolvedValue({ data: { success: true, data } });
    render(<QHLSDashboard />);
    await screen.findAllByText('Zone One');

    expect(api.get).toHaveBeenCalledWith('/api/qhls/week-status?weekOffset=0');
    const one = zoneCard('Zone One');
    expect(one.open).toBe(true);
    expect(within(one).getByText('1 / 2 നടന്നു')).toBeInTheDocument();
    expect(within(one).getByText('Unit B')).toBeInTheDocument();

    const two = zoneCard('Zone Two');
    expect(two.open).toBe(false);
    expect(within(two).getByText('മീറ്റിംഗ് റിപ്പോർട്ട് ഇല്ല')).toBeInTheDocument();
  });

  test('switching week asks for that week', async () => {
    api.get.mockResolvedValue({ data: { success: true, data } });
    render(<QHLSDashboard />);
    await screen.findAllByText('Zone One');
    await userEvent.selectOptions(screen.getByLabelText('Week'), '-1');
    expect(api.get).toHaveBeenLastCalledWith('/api/qhls/week-status?weekOffset=-1');
  });

  test('zone filter narrows the list', async () => {
    api.get.mockResolvedValue({ data: { success: true, data } });
    render(<QHLSDashboard />);
    await screen.findAllByText('Zone One');
    await userEvent.selectOptions(screen.getByLabelText('മണ്ഡലം'), 'Zone Two');
    expect(screen.queryByText('Zone One', { selector: '.qhls-zone-name' })).not.toBeInTheDocument();
  });

  test('shows the server error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    api.get.mockRejectedValue({ response: { data: { error: 'Database not available' } } });
    render(<QHLSDashboard />);
    expect(await screen.findByText('Database not available')).toBeInTheDocument();
  });
});
