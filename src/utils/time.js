/**
 * Utility module for standardizing all API dates and timestamps to India Standard Time (IST UTC+05:30).
 */

/**
 * Formats date to ISO string with IST (+05:30) offset.
 * Example: "2026-09-01T17:45:03+05:30"
 */
function formatISTISO(inputDate) {
  if (!inputDate) inputDate = new Date();
  const d = new Date(inputDate);
  if (isNaN(d.getTime())) inputDate = new Date();

  // Offset UTC time by +5.5 hours (330 minutes)
  const istOffsetMs = (5 * 60 + 30) * 60 * 1000;
  const istDate = new Date(d.getTime() + istOffsetMs);

  const pad = n => String(n).padStart(2, '0');
  const YYYY = istDate.getUTCFullYear();
  const MM = pad(istDate.getUTCMonth() + 1);
  const DD = pad(istDate.getUTCDate());
  const hh = pad(istDate.getUTCHours());
  const mm = pad(istDate.getUTCMinutes());
  const ss = pad(istDate.getUTCSeconds());

  return `${YYYY}-${MM}-${DD}T${hh}:${mm}:${ss}+05:30`;
}

/**
 * Formats date to readable IST string.
 * Example: "01 Sep 2026, 05:45 pm IST"
 */
function formatISTReadable(inputDate) {
  if (!inputDate) inputDate = new Date();
  const d = new Date(inputDate);
  if (isNaN(d.getTime())) return '';

  const istOffsetMs = (5 * 60 + 30) * 60 * 1000;
  const istDate = new Date(d.getTime() + istOffsetMs);

  const pad = n => String(n).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const YYYY = istDate.getUTCFullYear();
  const monthStr = months[istDate.getUTCMonth()];
  const DD = pad(istDate.getUTCDate());

  let hours = istDate.getUTCHours();
  const minutes = pad(istDate.getUTCMinutes());
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const hoursStr = pad(hours);

  return `${DD} ${monthStr} ${YYYY}, ${hoursStr}:${minutes} ${ampm} IST`;
}

/**
 * Formats date to 12-hour IST time string.
 * Example: "05:45 pm"
 */
function formatISTTimeOnly(inputDate) {
  if (!inputDate) inputDate = new Date();
  const d = new Date(inputDate);
  if (isNaN(d.getTime())) return '';

  const istOffsetMs = (5 * 60 + 30) * 60 * 1000;
  const istDate = new Date(d.getTime() + istOffsetMs);

  const pad = n => String(n).padStart(2, '0');
  let hours = istDate.getUTCHours();
  const minutes = pad(istDate.getUTCMinutes());
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const hoursStr = pad(hours);

  return `${hoursStr}:${minutes} ${ampm}`;
}

module.exports = {
  formatISTISO,
  formatISTReadable,
  formatISTTimeOnly
};
