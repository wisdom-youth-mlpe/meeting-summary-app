import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../components/Dashboard';
import { getDashboardStats, getZones } from '../services/api';
import { loadWeekStart } from '../services/week';

vi.mock('../services/api', () => ({
  getDashboardStats: vi.fn(),
  getZones: vi.fn(),
  getMeetingReport: vi.fn(),
}));
vi.mock('../services/week', async (importOriginal) => ({
  ...(await importOriginal()),
  loadWeekStart: vi.fn(),
}));

const statsFor = (zonesMet) => ({
  success: true,
  data: {
    totalMeetings: zonesMet.length,
    totalMembers: 0,
    attendanceRegister: [],
    zonesWithMeetings: zonesMet.map(zoneName => ({ zoneName, meetingCount: 1, lastMeetingDate: '2026-10-28' })),
    noMeetingZones: [{ zoneName: 'Zone Quiet', reason: '' }],
    consecutiveAbsence: [],
    latestLeaves: [],
    qhlsMissingBranches: [],
    meetingsList: [],
  },
});

// Wednesday 4 Nov 2026, the district meeting day; weeks start on Sunday
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-04T12:00:00'));
  loadWeekStart.mockResolvedValue(0);
  localStorage.setItem('meeting_app_token', 't');
  localStorage.setItem('meeting_app_user', JSON.stringify({ username: 'a', roles: ['admin'] }));
  getZones.mockResolvedValue({ success: true, zones: [{ name: 'Zone A' }, { name: 'Zone Quiet' }] });
  getDashboardStats.mockImplementation(async (start) =>
    statsFor(start === '2026-10-25' ? ['Zone A'] : []));
});

afterEach(() => vi.useRealTimers());

const renderDashboard = () => render(<MemoryRouter><Dashboard /></MemoryRouter>);
const section = (name) => screen.getByText(name, { exact: false, selector: 'h2' }).closest('details');

describe('Dashboard week view', () => {
  test('shows last week and this week, both collapsed', async () => {
    renderDashboard();
    await screen.findByText(/കഴിഞ്ഞ ആഴ്ച/, { selector: 'h2' });

    const last = section('കഴിഞ്ഞ ആഴ്ച');
    const current = section('ഈ ആഴ്ച');
    expect(last).toHaveTextContent('25 Oct - 31 Oct');
    expect(current).toHaveTextContent('1 Nov - 7 Nov');
    expect(last.open).toBe(false);
    expect(current.open).toBe(false);
  });

  test('fetches each week separately', async () => {
    renderDashboard();
    await screen.findByText(/കഴിഞ്ഞ ആഴ്ച/, { selector: 'h2' });
    expect(getDashboardStats).toHaveBeenCalledWith('2026-10-25', '2026-10-31', 'All');
    expect(getDashboardStats).toHaveBeenCalledWith('2026-11-01', '2026-11-07', 'All');
  });

  test('each section shows its own week\'s numbers and wording', async () => {
    renderDashboard();
    await screen.findByText(/കഴിഞ്ഞ ആഴ്ച/, { selector: 'h2' });

    const last = section('കഴിഞ്ഞ ആഴ്ച');
    expect(within(last).getByText(/കഴിഞ്ഞ ആഴ്ച മീറ്റിംഗ് നടന്ന മണ്ഡലങ്ങൾ \(1\)/)).toBeInTheDocument();
    expect(within(last).getByText(/കഴിഞ്ഞ ആഴ്ചയിൽ മീറ്റിംഗ് കൂടിയ മണ്ഡലങ്ങൾ/)).toBeInTheDocument();

    const current = section('ഈ ആഴ്ച');
    expect(within(current).getByText(/ഈ ആഴ്ച മീറ്റിംഗ് നടന്ന മണ്ഡലങ്ങൾ \(0\)/)).toBeInTheDocument();
  });

  test('changing zone reloads both weeks for that zone', async () => {
    renderDashboard();
    await screen.findByText(/കഴിഞ്ഞ ആഴ്ച/, { selector: 'h2' });
    await screen.findByRole('option', { name: 'Zone A' });
    getDashboardStats.mockClear();

    await userEvent.selectOptions(screen.getByRole('combobox'), 'Zone A');
    await screen.findByText(/കഴിഞ്ഞ ആഴ്ച/, { selector: 'h2' });
    expect(getDashboardStats).toHaveBeenCalledWith('2026-10-25', '2026-10-31', 'Zone A');
    expect(getDashboardStats).toHaveBeenCalledWith('2026-11-01', '2026-11-07', 'Zone A');
  });
});
