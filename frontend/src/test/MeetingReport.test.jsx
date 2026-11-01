import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MeetingReport from '../components/MeetingReport';
import { getAllMeetings } from '../services/api';
import { loadMeetingDay } from '../services/week';

vi.mock('../services/api', () => ({
  getAllMeetings: vi.fn(),
  getMeetingReport: vi.fn(),
  deleteMeeting: vi.fn(),
}));
vi.mock('../services/week', async (importOriginal) => ({
  ...(await importOriginal()),
  loadMeetingDay: vi.fn(),
}));

const meeting = (meetingId, zoneName, date) => ({ meetingId, zoneName, zoneId: zoneName, date, savedDate: `${date}T10:00:00Z` });

// Friday 30 Oct 2026 with Wednesday meetings: this week 28 Oct - 3 Nov, last week 21 - 27 Oct
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-30T12:00:00'));
  loadMeetingDay.mockResolvedValue(3);
  localStorage.setItem('meeting_app_token', 't');
  localStorage.setItem('meeting_app_user', JSON.stringify({ username: 'a', roles: ['admin'] }));
  getAllMeetings.mockResolvedValue({
    success: true,
    meetings: [
      meeting('M1', 'Zone This', '2026-10-28'),
      meeting('M2', 'Zone Last', '2026-10-22'),
      meeting('M3', 'Zone Old', '2026-10-14'),
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
    expect(within(section(/കഴിഞ്ഞ ആഴ്ചയിലെ റിപ്പോർട്ടുകൾ/)).getByText('Zone Last')).toBeInTheDocument();
    const older = section('പഴയ റിപ്പോർട്ടുകൾ');
    expect(within(older).getByText('Zone Old')).toBeInTheDocument();
    expect(older.tagName).toBe('DETAILS');
    expect(older.open).toBe(false);
  });

  test('last week heading shows its dates', async () => {
    render(<MemoryRouter><MeetingReport /></MemoryRouter>);
    expect(await screen.findByText(/21 Oct - 27 Oct/)).toBeInTheDocument();
  });

  test('each report card offers only the report button', async () => {
    render(<MemoryRouter><MeetingReport /></MemoryRouter>);
    await screen.findByText('Zone This');
    expect(screen.queryByRole('button', { name: /Edit|Delete/i })).not.toBeInTheDocument();
  });
});
