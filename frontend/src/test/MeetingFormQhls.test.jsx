import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

const zones = [
  { id: 'za', zoneId: 'za', name: 'Zone A', units: ['A1', 'A2'] },
  { id: 'zb', zoneId: 'zb', name: 'Zone B', units: ['B1', 'B2'] },
];

const qhlsUnits = () =>
  Array.from(document.querySelectorAll('#qhls-section .row-name')).map((el) => el.textContent);

beforeEach(() => {
  localStorage.setItem('meeting_app_token', 't');
  localStorage.setItem('meeting_app_user', JSON.stringify({ username: 'a', roles: ['admin'] }));
  getZones.mockResolvedValue({ success: true, zones });
  getAttendees.mockResolvedValue({ success: true, attendees: [] });
  getAgendas.mockResolvedValue({ success: true, agendas: [] });
  getAllMeetings.mockResolvedValue({ meetings: [] });
});

afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('MeetingForm QHLS units', () => {
  test('switching zone shows only the new zone\'s units', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><MeetingForm /></MemoryRouter>);

    const select = await screen.findByLabelText('മണ്ഡലം തിരഞ്ഞെടുക്കുക');
    await waitFor(() => expect(select).not.toBeDisabled());

    await user.selectOptions(select, 'za');
    await waitFor(() => expect(qhlsUnits()).toEqual(['A1', 'A2']));

    await user.selectOptions(select, 'zb');
    await waitFor(() => expect(getAttendees).toHaveBeenLastCalledWith('zb'));
    await waitFor(() => expect(qhlsUnits()).toEqual(['B1', 'B2']));
  });

  test('a draft holding another zone\'s units only restores the draft zone\'s units', async () => {
    localStorage.setItem('meetingFormDraft', JSON.stringify({
      selectedZone: 'zb',
      qhlsData: [
        { unit: 'B1', status: 'nadannu' },
        { unit: 'B2', status: '' },
        { unit: 'A1', status: '' },
        { unit: 'A2', status: '' },
      ],
    }));
    render(<MemoryRouter><MeetingForm /></MemoryRouter>);

    await waitFor(() => expect(getAttendees).toHaveBeenCalledWith('zb'));
    await new Promise((r) => setTimeout(r, 100));
    expect(qhlsUnits()).toEqual(['B1', 'B2']);
  });
});
