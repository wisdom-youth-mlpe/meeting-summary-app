import { getSetting } from './api';

// Used only when the district meeting day setting cannot be read
const FALLBACK_MEETING_DAY = 3; // Wednesday

/**
 * The district meeting day (0 = Sunday … 6 = Saturday) from settings.
 */
export const loadMeetingDay = async () => {
  try {
    const response = await getSetting('district_meeting_day');
    if (response.success && response.value !== null && response.value !== undefined) {
      return parseInt(response.value, 10);
    }
  } catch (err) {
    console.error('Failed to fetch meeting day setting', err);
  }
  return FALLBACK_MEETING_DAY;
};

/**
 * The reporting week that contains `today`. Weeks start on the meeting day;
 * on the meeting day itself the week that just finished is reported.
 * Returns local-midnight Date objects for the first and last day.
 */
export const getReportingWeek = (meetingDay, today = new Date()) => {
  const base = new Date(today);
  base.setHours(0, 0, 0, 0);
  const start = new Date(base);
  const diff = base.getDay() === meetingDay ? 7 : (base.getDay() - meetingDay + 7) % 7;
  start.setDate(base.getDate() - diff);

  // Count from start, not from today: the week may begin in the previous month
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return { start, end };
};

/**
 * YYYY-MM-DD in local time, the format meetings are stored in.
 */
export const toDateKey = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
