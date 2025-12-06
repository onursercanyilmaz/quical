import { EventDetails } from "../types";

const formatICSDate = (dateStr: string): string => {
  // Remove hyphens, colons, and milliseconds for ICS format (YYYYMMDDTHHmmSSZ)
  // We will assume local time for simplicity or convert to UTC. 
  // For this simple app, we'll strip punctuation from the ISO string.

  const date = new Date(dateStr);
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

export const generateICSFile = (event: EventDetails): string => {
  const now = new Date();
  const dtStamp = formatICSDate(now.toISOString());
  const dtStart = formatICSDate(event.startDate);
  const dtEnd = formatICSDate(event.endDate);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Quical//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${now.getTime()}@quicalai.com`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeICS(event.title)}`,
    `DESCRIPTION:${escapeICS(event.description || '')}`,
    `LOCATION:${escapeICS(event.location || '')}`,
    'STATUS:CONFIRMED',
  ];

  // Add reminder/alarm if set
  if (event.reminder && event.reminder > 0) {
    lines.push(
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:Reminder: ${escapeICS(event.title)}`,
      `TRIGGER:-PT${event.reminder}M`,
      'END:VALARM'
    );
  }

  lines.push('END:VEVENT', 'END:VCALENDAR');

  return lines.join('\r\n');
};

const escapeICS = (str: string): string => {
  return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
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