import { getSetting } from './api';

// Used when the reporting week setting is unset or cannot be read
const DEFAULT_WEEK_START = 0; // Sunday

/**
 * The day reporting weeks start on (0 = Sunday … 6 = Saturday), set by admin.
 */
export const loadWeekStart = async () => {
  try {
    const response = await getSetting('reporting_week_start');
    if (response.success && response.value !== null && response.value !== undefined) {
      return parseInt(response.value, 10);
    }
  } catch (err) {
    console.error('Failed to fetch reporting week setting', err);
  }
  return DEFAULT_WEEK_START;
};

/**
 * The reporting week that contains `today`, moved by `offset` weeks
 * (-1 for last week). Weeks run from the start day for seven days.
 * Returns local-midnight Date objects for the first and last day.
 */
export const getReportingWeek = (startDay, today = new Date(), offset = 0) => {
  const base = new Date(today);
  base.setHours(0, 0, 0, 0);
  const start = new Date(base);
  start.setDate(base.getDate() - ((base.getDay() - startDay + 7) % 7) + offset * 7);

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
