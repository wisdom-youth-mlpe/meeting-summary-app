import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
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

const savedMeeting = {
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

const newMeetingDraft = JSON.stringify({ selectedZone: 'za', date: '2026-11-10', minutes: ['Half typed'] });

beforeEach(() => {
  localStorage.setItem('meeting_app_token', 't');
  localStorage.setItem('meeting_app_user', JSON.stringify({ username: 'a', roles: ['admin'] }));
  getZones.mockResolvedValue({ success: true, zones });
  getAttendees.mockResolvedValue({ success: true, attendees: [] });
  getAgendas.mockResolvedValue({ success: true, agendas: [] });
  getAllMeetings.mockResolvedValue({ meetings: [] });
  getMeetingReport.mockResolvedValue({ success: true, meetingData: savedMeeting, report: {} });
  updateMeeting.mockResolvedValue({ success: true });
});

afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

const ReportStub = () => {
  const location = useLocation();
  return <p>Reports page {location.state?.viewMeetingId}</p>;
};

const renderAt = (url) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/form" element={<MeetingForm />} />
        <Route path="/report" element={<ReportStub />} />
      </Routes>
    </MemoryRouter>
  );

const openEdit = async () => {
  const view = renderAt('/form?edit=M1');
  const date = await screen.findByLabelText('തീയതി:');
  await waitFor(() => expect(date).toHaveValue('2026-11-02'));
  await waitFor(() => expect(getAttendees).toHaveBeenCalledWith('za'));
  return { ...view, date };
};

const editDraft = () => JSON.parse(localStorage.getItem('meetingFormEditDraft'));

describe('MeetingForm edit mode', () => {
  test('loads the saved date and updates the meeting with the corrected one', async () => {
    const { date } = await openEdit();

    fireEvent.change(date, { target: { value: '2026-11-03' } });
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    fireEvent.submit(date.closest('form'));

    await waitFor(() => expect(updateMeeting).toHaveBeenCalledTimes(1));
    expect(alertSpy).not.toHaveBeenCalled();
    const [id, body] = updateMeeting.mock.calls[0];
    expect(id).toBe('M1');
    expect(body).toMatchObject({ zoneName: 'Zone A', date: '2026-11-03', startTime: '19:00' });
    expect(body.qhls).toContainEqual(expect.objectContaining({ unit: 'A1', status: 'nadannu' }));
    expect(saveMeeting).not.toHaveBeenCalled();

    expect(await screen.findByText('Reports page M1')).toBeInTheDocument();
    expect(editDraft()).toBeNull();
  });

  test('unsaved edits are kept in the browser, not the DB, and come back on reload', async () => {
    const { date, unmount } = await openEdit();
    fireEvent.change(date, { target: { value: '2026-11-03' } });
    await waitFor(() => expect(editDraft()).toMatchObject({ meetingId: 'M1', date: '2026-11-03' }));
    expect(updateMeeting).not.toHaveBeenCalled();

    unmount();
    renderAt('/form?edit=M1');
    const reloaded = await screen.findByLabelText('തീയതി:');
    await waitFor(() => expect(reloaded).toHaveValue('2026-11-03'));
  });

  test('editing leaves the new-meeting draft alone', async () => {
    localStorage.setItem('meetingFormDraft', newMeetingDraft);
    const { date } = await openEdit();
    fireEvent.change(date, { target: { value: '2026-11-03' } });
    await waitFor(() => expect(editDraft()?.date).toBe('2026-11-03'));
    expect(localStorage.getItem('meetingFormDraft')).toBe(newMeetingDraft);
  });

  test('a new meeting ignores the edit draft', async () => {
    localStorage.setItem('meetingFormEditDraft', JSON.stringify({ meetingId: 'M1', selectedZone: 'za', date: '2026-11-03' }));
    renderAt('/form');
    const date = await screen.findByLabelText('തീയതി:');
    await new Promise((r) => setTimeout(r, 50));
    expect(date).not.toHaveValue('2026-11-03');
    expect(getMeetingReport).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
  });

  test('Cancel discards unsaved edits and goes back to the report', async () => {
    const { date } = await openEdit();
    fireEvent.change(date, { target: { value: '2026-11-03' } });
    await waitFor(() => expect(editDraft()?.date).toBe('2026-11-03'));

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(await screen.findByText('Reports page M1')).toBeInTheDocument();
    expect(editDraft()).toBeNull();
    expect(updateMeeting).not.toHaveBeenCalled();
  });

  test('Reset puts the saved meeting back on the form', async () => {
    const { date } = await openEdit();
    fireEvent.change(date, { target: { value: '2026-11-03' } });
    await waitFor(() => expect(editDraft()?.date).toBe('2026-11-03'));

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    await waitFor(() => expect(date).toHaveValue('2026-11-02'));
    await waitFor(() => expect(editDraft()?.date).toBe('2026-11-02'));
    expect(updateMeeting).not.toHaveBeenCalled();
  });

  test('a single-zone zone admin keeps the saved attendance', async () => {
    localStorage.setItem('meeting_app_user', JSON.stringify({ username: 'z', roles: ['zone_admin'], zoneAccess: ['za'] }));
    getAttendees.mockResolvedValue({
      success: true,
      attendees: [{ name: 'Person P', role: 'President' }, { name: 'Person L', role: 'Secretary' }],
    });
    getMeetingReport.mockResolvedValue({
      success: true,
      meetingData: { ...savedMeeting, attendance: [{ name: 'Person L', role: 'Secretary', status: 'leave', reason: 'Travel' }] },
      report: {},
    });
    const { date } = await openEdit();
    fireEvent.submit(date.closest('form'));

    await waitFor(() => expect(updateMeeting).toHaveBeenCalledTimes(1));
    expect(updateMeeting.mock.calls[0][1].attendance).toContainEqual(
      expect.objectContaining({ name: 'Person L', status: 'leave', reason: 'Travel' })
    );
  });
});
