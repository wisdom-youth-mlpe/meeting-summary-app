import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MeetingForm from '../components/MeetingForm';
import { getZones, getAttendees, getAgendas, getAllMeetings } from '../services/api';

vi.mock('../services/api', () => ({
  getZones: vi.fn(),
  getAttendees: vi.fn(),
  getAgendas: vi.fn(),
  getAllMeetings: vi.fn(),
  getMeetingReport: vi.fn(),
  saveMeeting: vi.fn(),
  updateMeeting: vi.fn(),
}));

const originalTZ = process.env.TZ;

beforeEach(() => {
  process.env.TZ = 'Asia/Kolkata';
  vi.useFakeTimers({ toFake: ['Date'] });
  localStorage.setItem('meeting_app_token', 't');
  localStorage.setItem('meeting_app_user', JSON.stringify({ username: 'a', roles: ['admin'] }));
  getZones.mockResolvedValue({ success: true, zones: [] });
  getAttendees.mockResolvedValue({ success: true, attendees: [] });
  getAgendas.mockResolvedValue({ success: true, agendas: [] });
  getAllMeetings.mockResolvedValue({ meetings: [] });
});

afterEach(() => {
  vi.useRealTimers();
  process.env.TZ = originalTZ;
  localStorage.clear();
  vi.clearAllMocks();
});

describe('MeetingForm default date', () => {
  test('is the local date before 05:30 IST, not the UTC one', async () => {
    // 01:30 IST on 14 Nov is still 13 Nov in UTC
    vi.setSystemTime(new Date('2026-11-13T20:00:00Z'));
    render(<MemoryRouter><MeetingForm /></MemoryRouter>);
    expect(await screen.findByLabelText('തീയതി:')).toHaveValue('2026-11-14');
  });
});
