import { EventDetails } from "../types";

const formatICSDate = (dateStr: string): string => {
  // Remove hyphens, colons, and milliseconds for ICS format (YYYYMMDDTHHmmSSZ)
  // We will assume local time for simplicity or convert to UTC. 
  // For this simple app, we'll strip punctuation from the ISO string.

  const date = new Date(dateStr);
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

// Format date for Google Calendar (YYYYMMDDTHHmmss format without Z for local time)
const formatGoogleDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

const escapeICS = (str: string): string => {
  return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
};

// Format duration for ICS (e.g., 1440 -> P1D, 60 -> PT1H)
const formatICSDuration = (minutes: number): string => {
  if (minutes % 1440 === 0) {
    return `P${minutes / 1440}D`;
  }
  if (minutes % 60 === 0) {
    return `PT${minutes / 60}H`;
  }
  return `PT${minutes}M`;
};

const formatICSDateOnly = (dateStr: string, addDays = 0): string => {
  const date = new Date(dateStr);
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate() + addDays);
  const y = target.getFullYear();
  const m = String(target.getMonth() + 1).padStart(2, '0');
  const d = String(target.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
};

// Generate a single VEVENT block
const generateVEvent = (event: EventDetails, uid: string): string[] => {
  const now = new Date();
  const dtStamp = formatICSDate(now.toISOString());

  let dtStartLine: string;
  let dtEndLine: string;

  if (event.allDay) {
    const startOnly = formatICSDateOnly(event.startDate, 0);
    const endDateObj = new Date(event.endDate);
    const startDateObj = new Date(event.startDate);
    const sameCalendarDay =
      startDateObj.getFullYear() === endDateObj.getFullYear() &&
      startDateObj.getMonth() === endDateObj.getMonth() &&
      startDateObj.getDate() === endDateObj.getDate();
    // Per RFC 5545, DTEND for VALUE=DATE is exclusive (+1 day)
    const endOnly = formatICSDateOnly(event.endDate, sameCalendarDay ? 1 : 1);
    dtStartLine = `DTSTART;VALUE=DATE:${startOnly}`;
    dtEndLine = `DTEND;VALUE=DATE:${endOnly}`;
  } else {
    dtStartLine = `DTSTART:${formatICSDate(event.startDate)}`;
    dtEndLine = `DTEND:${formatICSDate(event.endDate)}`;
  }

  const lines = [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    dtStartLine,
    dtEndLine,
    `SUMMARY:${escapeICS(event.title)}`,
    `DESCRIPTION:${escapeICS(event.description || '')}`,
    `LOCATION:${escapeICS(event.location || '')}`,
    'STATUS:CONFIRMED',
  ];

  // Add reminder/alarm if set
  if (event.reminder && event.reminder > 0) {
    const duration = formatICSDuration(event.reminder);
    lines.push(
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:Reminder`,
      `TRIGGER;RELATED=START:-${duration}`,
      'END:VALARM'
    );
  }

  // Add image attachment if present
  if (event.image) {
    // Note: Some calendar apps might require just the base64 data without the header prefix if it's already stripped, 
    // but usually for inline base64 in ICS it's formatted as:
    // ATTACH;FMTTYPE=image/png;ENCODING=BASE64:[base64_data]
    // We assume event.image is the raw base64 string (without data:image/png;base64, prefix) 
    // because that's how we store it in openRouterService.ts
    lines.push(`ATTACH;FMTTYPE=image/png;ENCODING=BASE64:${event.image}`);
  }

  lines.push('END:VEVENT');
  return lines;
};

export const generateICSFile = (event: EventDetails): string => {
  const now = new Date();
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Quical//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...generateVEvent(event, `${now.getTime()}@quicalai.com`),
    'END:VCALENDAR'
  ];

  return lines.join('\r\n');
};

// Generate ICS file with multiple events
export const generateMultipleEventsICSFile = (events: EventDetails[]): string => {
  const now = new Date();
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Quical//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  events.forEach((event, index) => {
    const uid = `${now.getTime()}-${index}@quicalai.com`;
    lines.push(...generateVEvent(event, uid));
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
};

export const downloadICS = (event: EventDetails) => {
  const icsContent = generateICSFile(event);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute('download', `${event.title.replace(/\s+/g, '_')}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Download multiple events in a single ICS file
export const downloadMultipleICS = (events: EventDetails[]) => {
  const icsContent = generateMultipleEventsICSFile(events);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute('download', `quical_events_${events.length}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Get Apple Calendar data URI for multiple events
export const getMultipleAppleCalendarDataUri = (events: EventDetails[]): string => {
  const icsContent = generateMultipleEventsICSFile(events);
  return `data:text/calendar;charset=utf8,${encodeURIComponent(icsContent)}`;
};

// Generate Google Calendar URL
export const getGoogleCalendarUrl = (event: EventDetails): string => {
  const startDate = event.allDay
    ? formatICSDateOnly(event.startDate, 0)
    : formatGoogleDate(event.startDate);
  const endDate = event.allDay
    ? formatICSDateOnly(event.endDate, 1)
    : formatGoogleDate(event.endDate);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${startDate}/${endDate}`,
    details: event.description || '',
    location: event.location || '',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

// Generate Apple Calendar data URI (for direct download/open)
export const getAppleCalendarDataUri = (event: EventDetails): string => {
  const icsContent = generateICSFile(event);
  return `data:text/calendar;charset=utf8,${encodeURIComponent(icsContent)}`;
};

// Generate Outlook Web URL
export const getOutlookCalendarUrl = (event: EventDetails): string => {
  const startDate = new Date(event.startDate).toISOString();
  const endDate = new Date(event.endDate).toISOString();

  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    startdt: startDate,
    enddt: endDate,
    body: event.description || '',
    location: event.location || '',
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
};