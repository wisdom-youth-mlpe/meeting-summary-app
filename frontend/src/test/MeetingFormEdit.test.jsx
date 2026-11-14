import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MeetingForm from '../components/MeetingForm';
import { getZones, getAttendees, getAgendas, getAllMeetings, getMeetingReport, saveMeeting, updateMeeting } from '../services/api';

vi.mock('../services/api', () => ({
  getZones: vi.fn(),
  getAttendees: vi.fn(),
  getAgendas: vi.fn(),
  getAllMeetings: vi.fn(),
  getMeetingReport: vi.fn(),
  saveMeeting: vi.fn(),
  updateMeeting: vi.fn(),
}));

const zones = [{ id: 'za', zoneId: 'za', name: 'Zone A', units: ['A1', 'A2'] }];

const editMeetingData = {
  meetingId: 'M1',
  zoneId: 'za',
  zoneName: 'Zone A',
  date: '2026-11-02',
  startTime: '19:00',
  endTime: '20:00',
  agendas: ['Agenda 1'],
  minutes: ['Decision 1'],
  attendance: [],
  swagatham: 'P1',
  adhyakshan: 'P2',
  nandhi: 'P3',
  qhls: [{ unit: 'A1', status: 'nadannu' }, { unit: 'A2', status: 'illa' }],
};

beforeEach(() => {
  localStorage.setItem('meeting_app_token', 't');
  localStorage.setItem('meeting_app_user', JSON.stringify({ username: 'a', roles: ['admin'] }));
  getZones.mockResolvedValue({ success: true, zones });
  getAttendees.mockResolvedValue({ success: true, attendees: [] });
  getAgendas.mockResolvedValue({ success: true, agendas: [] });
  getAllMeetings.mockResolvedValue({ meetings: [] });
  getMeetingReport.mockResolvedValue({ success: false });
  updateMeeting.mockResolvedValue({ success: true });
});

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.clearAllMocks();
});

const renderEdit = () =>
  render(
    <MemoryRouter initialEntries={[{ pathname: '/form', state: { editMeetingData } }]}>
      <MeetingForm />
    </MemoryRouter>
  );

describe('MeetingForm edit mode', () => {
  test('loads the saved date and updates the meeting with the corrected one', async () => {
    renderEdit();

    const date = await screen.findByLabelText('തീയതി:');
    await waitFor(() => expect(date).toHaveValue('2026-11-02'));
    await waitFor(() => expect(getAttendees).toHaveBeenCalledWith('za'));

    fireEvent.change(date, { target: { value: '2026-11-03' } });
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    fireEvent.submit(date.closest('form'));
    await new Promise((r) => setTimeout(r, 50));
    expect(alertSpy).not.toHaveBeenCalled();

    await waitFor(() => expect(updateMeeting).toHaveBeenCalledTimes(1));
    const [id, body] = updateMeeting.mock.calls[0];
    expect(id).toBe('M1');
    expect(body).toMatchObject({ zoneName: 'Zone A', date: '2026-11-03', startTime: '19:00' });
    expect(body.qhls).toContainEqual(expect.objectContaining({ unit: 'A1', status: 'nadannu' }));
    expect(saveMeeting).not.toHaveBeenCalled();
  });
});
