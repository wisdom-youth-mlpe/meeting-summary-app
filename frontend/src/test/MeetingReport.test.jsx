import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MeetingReport from '../components/MeetingReport';
import { getAllMeetings, getMeetingReport } from '../services/api';
import { loadWeekStart } from '../services/week';

vi.mock('../services/api', () => ({
  getAllMeetings: vi.fn(),
  getMeetingReport: vi.fn(),
  deleteMeeting: vi.fn(),
}));
vi.mock('../services/week', async (importOriginal) => ({
  ...(await importOriginal()),
  loadWeekStart: vi.fn(),
}));

const meeting = (meetingId, zoneName, date) => ({ meetingId, zoneName, zoneId: zoneName, date, savedDate: `${date}T10:00:00Z` });

// Wednesday 4 Nov 2026, Sunday weeks: this week 1 - 7 Nov, last week 25 - 31 Oct
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-04T12:00:00'));
  loadWeekStart.mockResolvedValue(0);
  localStorage.setItem('meeting_app_token', 't');
  localStorage.setItem('meeting_app_user', JSON.stringify({ username: 'a', roles: ['admin'] }));
  getAllMeetings.mockResolvedValue({
    success: true,
    meetings: [
      meeting('M1', 'Zone This', '2026-11-02'),
      meeting('M2', 'Zone Last', '2026-10-28'),
      meeting('M3', 'Zone Old', '2026-10-21'),
    ],
    pagination: { total: 3, page: 1, pages: 1 },
  });
});

afterEach(() => vi.useRealTimers());

const section = (heading) => screen.getByText(heading).closest('section, details');

describe('MeetingReport', () => {
  test('splits reports into this week, last week and older', async () => {
    render(<MemoryRouter><MeetingReport /></MemoryRouter>);
    await screen.findByText('Zone This');

    expect(within(section('ഈ ആഴ്ചയിലെ റിപ്പോർട്ടുകൾ')).getByText('Zone This')).toBeInTheDocument();
    const last = section(/കഴിഞ്ഞ ആഴ്ചയിലെ റിപ്പോർട്ടുകൾ/);
    expect(within(last).getByText('Zone Last')).toBeInTheDocument();
    expect(last.tagName).toBe('DETAILS');
    expect(last.open).toBe(false);
    const older = section('പഴയ റിപ്പോർട്ടുകൾ');
    expect(within(older).getByText('Zone Old')).toBeInTheDocument();
    expect(older.tagName).toBe('DETAILS');
    expect(older.open).toBe(false);
  });

  test('last week heading shows its dates', async () => {
    render(<MemoryRouter><MeetingReport /></MemoryRouter>);
    expect(await screen.findByText(/25 Oct - 31 Oct/)).toBeInTheDocument();
  });

  test('each report card offers only the report button', async () => {
    render(<MemoryRouter><MeetingReport /></MemoryRouter>);
    await screen.findByText('Zone This');
    expect(screen.queryByRole('button', { name: /Edit|Delete/i })).not.toBeInTheDocument();
  });

  const openReport = async (zoneName) => {
    getMeetingReport.mockResolvedValue({
      success: true,
      meetingData: meeting('M1', zoneName, '2026-11-02'),
      report: {},
    });
    render(<MemoryRouter><MeetingReport /></MemoryRouter>);
    await screen.findByText('Zone This');
    fireEvent.click(within(section('ഈ ആഴ്ചയിലെ റിപ്പോർട്ടുകൾ')).getByRole('button', { name: 'റിപ്പോർട്ട്' }));
    await screen.findByText('Copy Report');
  };

  test('opened report offers Edit to an admin', async () => {
    await openReport('Zone This');
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Delete/i })).not.toBeInTheDocument();
  });

  test('opened report offers Edit to a zone admin of its zone only', async () => {
    localStorage.setItem('meeting_app_user', JSON.stringify({ username: 'z', roles: ['zone_admin'], zoneAccess: ['Zone Mine'] }));
    await openReport('Zone Mine');
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
  });

  test('opened report hides Edit from a zone admin of another zone', async () => {
    localStorage.setItem('meeting_app_user', JSON.stringify({ username: 'z', roles: ['zone_admin'], zoneAccess: ['Zone Mine'] }));
    await openReport('Zone This');
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
  });
});
