import * as chrono from 'chrono-node';
import { createWorker } from 'tesseract.js';
import { EventDetails } from '../types';

const TURKISH_MONTHS: Record<string, number> = {
  ocak: 0, oca: 0,
  'şubat': 1, subat: 1, 'şub': 1, sub: 1,
  mart: 2, mar: 2,
  nisan: 3, nis: 3,
  'mayıs': 4, mayis: 4, may: 4,
  haziran: 5, haz: 5,
  temmuz: 6, tem: 6,
  'ağustos': 7, agustos: 7, 'ağu': 7, agu: 7,
  'eylül': 8, eylul: 8, eyl: 8,
  ekim: 9, eki: 9,
  'kasım': 10, kasim: 10, kas: 10,
  'aralık': 11, aralik: 11, ara: 11,
};

const TURKISH_WEEKDAYS: Record<string, number> = {
  pazar: 0,
  pazartesi: 1,
  'salı': 2, sali: 2,
  'çarşamba': 3, carsamba: 3,
  'perşembe': 4, persembe: 4,
  cuma: 5,
  cumartesi: 6,
};

const pad2 = (n: number): string => String(n).padStart(2, '0');

export const formatLocalISO = (date: Date): string => {
  return (
    `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}` +
    `T${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`
  );
};

const normalizeTurkishChars = (str: string): string =>
  str
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');

interface ParsedDateInfo {
  year: number;
  month: number; // 0-11
  day: number;
  matchedText: string;
  hasExplicitYear: boolean;
}

interface ParsedTimeInfo {
  startHour: number;
  startMinute: number;
  endHour?: number;
  endMinute?: number;
  matchedTexts: string[];
}

const getNextWeekday = (ref: Date, targetDay: number, forceNextWeek: boolean): Date => {
  const result = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const currentDay = result.getDay();
  let diff = (targetDay - currentDay + 7) % 7;
  if (diff === 0 && forceNextWeek) {
    diff = 7;
  } else if (forceNextWeek && diff < 7) {
    // "gelecek cuma" / "haftaya cuma" when today is earlier in the week
    const daysUntilEndOfWeek = (7 - currentDay) % 7;
    if (diff <= daysUntilEndOfWeek) {
      diff += 7;
    }
  }
  result.setDate(result.getDate() + diff);
  return result;
};

const parseTurkishDate = (text: string, ref: Date): ParsedDateInfo | null => {
  // 1. DD.MM.YYYY or DD/MM/YYYY or DD-MM-YYYY
  const numericFull = text.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{4})\b/);
  if (numericFull) {
    const day = parseInt(numericFull[1], 10);
    const month = parseInt(numericFull[2], 10) - 1;
    const year = parseInt(numericFull[3], 10);
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      return { year, month, day, matchedText: numericFull[0], hasExplicitYear: true };
    }
  }

  // 2. YYYY-MM-DD or YYYY/MM/DD (ISO)
  const isoDate = text.match(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (isoDate) {
    const year = parseInt(isoDate[1], 10);
    const month = parseInt(isoDate[2], 10) - 1;
    const day = parseInt(isoDate[3], 10);
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      return { year, month, day, matchedText: isoDate[0], hasExplicitYear: true };
    }
  }

  // 3. Turkish month name: "25 Aralık 2026", "25 Aralık", "5 Mayıs'ta"
  const monthNamesPattern = Object.keys(TURKISH_MONTHS).join('|');
  const trMonthRegex = new RegExp(
    `\\b(\\d{1,2})\\s+(${monthNamesPattern})(?:\\s+(\\d{4}))?(?:['’]?(?:ta|te|da|de|ya|ye|a|e))?\\b`,
    'i'
  );
  const trMonthMatch = text.match(trMonthRegex);
  if (trMonthMatch) {
    const day = parseInt(trMonthMatch[1], 10);
    const monthKey = trMonthMatch[2].toLowerCase();
    const month = TURKISH_MONTHS[monthKey] ?? TURKISH_MONTHS[normalizeTurkishChars(monthKey)];
    const explicitYear = trMonthMatch[3] ? parseInt(trMonthMatch[3], 10) : null;
    if (month !== undefined && day >= 1 && day <= 31) {
      let year = explicitYear ?? ref.getFullYear();
      if (!explicitYear) {
        const candidate = new Date(year, month, day, 23, 59, 59);
        if (candidate < ref) {
          year += 1;
        }
      }
      return {
        year,
        month,
        day,
        matchedText: trMonthMatch[0],
        hasExplicitYear: Boolean(explicitYear),
      };
    }
  }

  // 4. Relative Turkish days: bugün, yarın, öbür gün (allow glued time like "Bugun20:30")
  const relMatch = text.match(
    /\b(bugün|bugun|yarın|yarin|öbür\s+gün|obur\s+gun|ertesi\s+gün|ertesi\s+gun)(?=[^a-zA-ZçğıöşüÇĞİÖŞÜ]|$)/i
  );
  if (relMatch) {
    const norm = normalizeTurkishChars(relMatch[1]);
    const target = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
    if (norm.startsWith('yarin')) {
      target.setDate(target.getDate() + 1);
    } else if (norm.startsWith('obur') || norm.startsWith('ertesi')) {
      target.setDate(target.getDate() + 2);
    }
    return {
      year: target.getFullYear(),
      month: target.getMonth(),
      day: target.getDate(),
      matchedText: relMatch[0],
      hasExplicitYear: true,
    };
  }

  // 5. Turkish weekdays: "bu cuma", "gelecek pazartesi", "haftaya salı", "cuma günü", "cuma"
  const weekdayNamesPattern = Object.keys(TURKISH_WEEKDAYS).join('|');
  const trWeekdayRegex = new RegExp(
    `\\b(?:(bu|gelecek|önümüzdeki|onumuzdeki|haftaya)\\s+)?(${weekdayNamesPattern})(?:\\s+(?:günü|gunu))?(?:['’]?(?:a|e|ya|ye|da|de|ta|te))?\\b`,
    'i'
  );
  const trWeekdayMatch = text.match(trWeekdayRegex);
  if (trWeekdayMatch) {
    const modifier = trWeekdayMatch[1] ? normalizeTurkishChars(trWeekdayMatch[1]) : '';
    const dayKey = trWeekdayMatch[2].toLowerCase();
    const targetDay = TURKISH_WEEKDAYS[dayKey] ?? TURKISH_WEEKDAYS[normalizeTurkishChars(dayKey)];
    if (targetDay !== undefined) {
      const forceNextWeek = ['gelecek', 'onumuzdeki', 'haftaya'].includes(modifier);
      const target = getNextWeekday(ref, targetDay, forceNextWeek);
      return {
        year: target.getFullYear(),
        month: target.getMonth(),
        day: target.getDate(),
        matchedText: trWeekdayMatch[0],
        hasExplicitYear: true,
      };
    }
  }

  return null;
};

const adjustHourForPeriod = (hour: number, period?: string): number => {
  if (!period) return hour;
  const norm = normalizeTurkishChars(period);
  if (
    (norm.includes('ogleden sonra') || norm.includes('aksam') || norm.includes('gece') || norm === 'pm') &&
    hour >= 1 &&
    hour <= 11
  ) {
    return hour + 12;
  }
  if ((norm.includes('sabah') || norm === 'am') && hour === 12) {
    return 0;
  }
  return hour;
};

const parseTurkishTime = (text: string): ParsedTimeInfo | null => {
  // Strip full dates first so "25.12.2026" isn't confused with "25.12" time
  const scrubbed = text
    .replace(/\b\d{1,2}[./-]\d{1,2}[./-]\d{4}\b/g, (m) => ' '.repeat(m.length))
    .replace(/\b\d{4}-\d{1,2}-\d{1,2}\b/g, (m) => ' '.repeat(m.length));

  // 1. Time range: "14:00 - 16:30", "14.00-15.30", "saat 14:00 ile 16:00"
  const rangeRegex =
    /(?:saat\s+)?(\d{1,2})[:.](\d{2})\s*(?:-|–|—|ile|to)\s*(\d{1,2})[:.](\d{2})(?:\s*(?:arası|arasi))?/i;
  const rangeMatch = scrubbed.match(rangeRegex);
  if (rangeMatch) {
    const startHour = parseInt(rangeMatch[1], 10);
    const startMinute = parseInt(rangeMatch[2], 10);
    const endHour = parseInt(rangeMatch[3], 10);
    const endMinute = parseInt(rangeMatch[4], 10);
    if (startHour <= 23 && startMinute <= 59 && endHour <= 23 && endMinute <= 59) {
      return {
        startHour,
        startMinute,
        endHour,
        endMinute,
        matchedTexts: [rangeMatch[0]],
      };
    }
  }

  // 2. Single explicit HH:MM or "saat HH.MM" (with optional period / suffix, allowing glued text like "13:00Zeren" or "Bugun20:30")
  const colonTimeRegex =
    /(?:(sabah|öğleden\s+sonra|ogleden\s+sonra|akşam|aksam|gece)\s+)?(?:saat\s+)?(?<!\d)([01]?\d|2[0-3]):([0-5]\d)(?!\d)(?:\s*(am|pm))?(?:['’]?(?:da|de|ta|te|a|e))?/i;
  const colonMatch = scrubbed.match(colonTimeRegex);
  if (colonMatch) {
    const rawHour = parseInt(colonMatch[2], 10);
    const minute = parseInt(colonMatch[3], 10);
    const period = colonMatch[1] || colonMatch[4];
    return {
      startHour: adjustHourForPeriod(rawHour, period),
      startMinute: minute,
      matchedTexts: [colonMatch[0]],
    };
  }

  // 3. Turkish dot time: "saat 14.30", "19.00'da", or 2-digit "15.30" (avoid matching decimal odds/prices like "7.26", "1.17")
  const dotTimeRegex =
    /(?:(?:(sabah|öğleden\s+sonra|ogleden\s+sonra|akşam|aksam|gece)\s+)?(?:saat\s+)\b([01]?\d|2[0-3])\.([0-5]\d)\b(?:\s*['’]?(?:da|de|ta|te|a|e))?|\b([01]\d|2[0-3])\.([0-5]\d)\b(?:\s*['’]?(?:da|de|ta|te|a|e))?|\b([01]?\d|2[0-3])\.([0-5]\d)['’](?:da|de|ta|te|a|e)\b)/i;
  const dotMatch = scrubbed.match(dotTimeRegex);
  if (dotMatch) {
    const period = dotMatch[1];
    const rawHour = parseInt(dotMatch[2] ?? dotMatch[4] ?? dotMatch[6], 10);
    const minute = parseInt(dotMatch[3] ?? dotMatch[5] ?? dotMatch[7], 10);
    return {
      startHour: adjustHourForPeriod(rawHour, period),
      startMinute: minute,
      matchedTexts: [dotMatch[0]],
    };
  }

  // 4. Hour-only with Turkish keyword: "saat 15'te", "akşam 8'de", "öğleden sonra 3"
  const hourOnlyRegex =
    /(?:(sabah|öğleden\s+sonra|ogleden\s+sonra|akşam|aksam|gece)\s+saat\s+|(sabah|öğleden\s+sonra|ogleden\s+sonra|akşam|aksam|gece)\s+|saat\s+)(\d{1,2})(?:['’]?(?:da|de|ta|te|a|e))?\b/i;
  const hourMatch = scrubbed.match(hourOnlyRegex);
  if (hourMatch) {
    const rawHour = parseInt(hourMatch[3], 10);
    const period = hourMatch[1] || hourMatch[2];
    if (rawHour >= 0 && rawHour <= 23) {
      return {
        startHour: adjustHourForPeriod(rawHour, period),
        startMinute: 0,
        matchedTexts: [hourMatch[0]],
      };
    }
  }

  return null;
};

const extractLocation = (text: string): { location: string; matchedText?: string } => {
  // Explicit labeled line/field
  const labeled = text.match(
    /(?:^|\n)\s*(?:konum|yer|mekan|adres|location|venue|address|where|place)\s*[:：]\s*([^\n]+)/i
  );
  if (labeled) {
    return { location: labeled[1].trim(), matchedText: labeled[0].trim() };
  }

  // Online meeting platforms
  const onlineMatch = text.match(/\b(Zoom|Google Meet|Microsoft Teams|Discord)\b/i);
  if (onlineMatch) {
    return { location: onlineMatch[1] };
  }

  // English "at <Place>" (avoiding "at 3pm")
  const atPlace = text.match(/\bat\s+(?!\d)(?:the\s+)?([A-ZÇĞİÖŞÜ][^\n,.!?]{2,40})/);
  if (atPlace) {
    return { location: atPlace[1].trim(), matchedText: atPlace[0].trim() };
  }

  return { location: '' };
};

const extractExplicitTitle = (text: string): string | null => {
  const labeled = text.match(
    /(?:^|\n)\s*(?:etkinlik|başlık|baslik|konu|event|title|subject)\s*[:：]\s*([^\n]+)/i
  );
  return labeled ? labeled[1].trim() : null;
};

const GENERIC_HEADER_LINES = new Set([
  'maçlar', 'maclar', 'matches', 'fikstür', 'fikstur', 'fixtures',
  'program', 'takvim', 'etkinlikler', 'events', 'schedule',
  'detaylar', 'details', 'özet', 'ozet', 'summary', 'canlı', 'canli', 'live',
]);

const deduplicateLine = (line: string): string => {
  const trimmed = line.trim();
  // Collapse exact concatenated duplicates from copy-pasted web cards (e.g. "KocaelisporKocaelispor" -> "Kocaelispor")
  const match = trimmed.match(/^(.{2,}?)\1$/i);
  return match ? match[1].trim() : trimmed;
};

const buildCleanTitle = (
  text: string,
  matchedFragments: string[],
  locationMatch?: string
): string => {
  const explicit = extractExplicitTitle(text);
  if (explicit) return explicit;

  const rawTextForTitle = text.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '$1');
  const rawLines = rawTextForTitle.split('\n');
  // Find where the first date/time fragment appeared so we can prefer nearby lines on noisy OCR/page dumps
  let anchorLineIndex = 0;
  if (matchedFragments.length > 0 && rawLines.length > 5) {
    const firstFrag = matchedFragments[0].trim();
    const foundIdx = rawLines.findIndex((l) => firstFrag && l.includes(firstFrag));
    if (foundIdx >= 0) {
      anchorLineIndex = foundIdx;
    }
  }

  let working = rawTextForTitle;
  for (const frag of matchedFragments) {
    if (frag) {
      working = working.replace(frag, ' ');
    }
  }
  if (locationMatch) {
    working = working.replace(locationMatch, ' ');
  }

  // Remove common connector/label leftovers (preserve intra-word hyphens like "Vallecano-Valencia")
  working = working
    .replace(/\b(tarihinde|saatinde|tarihi|saati|günü|gunu|son\s+ödeme\s+tarihi)\b[:：]?/gi, ' ')
    .replace(/\b(on|at|from|to)\b\s*$/gim, ' ')
    .replace(/[ \t]+[-–—|]+[ \t]+/g, ' ')
    .replace(/[ \t]{2,}/g, ' ');

  const isNoiseLine = (l: string): boolean => {
    if (l.length <= 1) return true;
    if (/https?:\/\/|\.com\/|www\./i.test(l)) return true;
    // Browser tab bars or heavy symbol noise
    if ((l.match(/[|©€]/g) || []).length >= 2) return true;
    return false;
  };

  let indexedLines = working
    .split('\n')
    .map((l, idx) => ({
      idx,
      text: deduplicateLine(l.replace(/^[\s,.:;\-–—&]+|[\s,.:;\-–—&]+$/g, '')),
    }))
    .filter((item) => !isNoiseLine(item.text));

  // Drop generic section headers (e.g. "Maçlar") if other meaningful lines exist
  const nonGeneric = indexedLines.filter(
    (item) => !GENERIC_HEADER_LINES.has(item.text.toLowerCase())
  );
  if (nonGeneric.length > 0) {
    indexedLines = nonGeneric;
  }

  // On multi-line blocks/cards (e.g. OCR or Bilyoner), prefer markdown-link title or "TeamA - TeamB" match title
  if (rawLines.length >= 2 && indexedLines.length >= 2) {
    const markdownTitleMatch = text.match(/\[([^\]]{3,80})\]\(https?:\/\/[^)]+\)/);
    if (markdownTitleMatch && !hasDateOrTime(markdownTitleMatch[1], new Date())) {
      return markdownTitleMatch[1].trim().slice(0, 120);
    }

    const matchLine = indexedLines.find((item) =>
      /[a-zA-ZçğıöşüÇĞİÖŞÜ]{2,}\s*-\s*[a-zA-ZçğıöşüÇĞİÖŞÜ]{2,}/.test(item.text)
    );
    if (matchLine) {
      // Strip trailing decimal odds / numbers from OCR match lines (e.g. "Vallecano-Valencia 1.75 3.04 ...")
      const cleanedMatch = matchLine.text
        .replace(/\s+\d+(?:[.,]\d+)*(?:\s+[+\d.,]+)*$/, '')
        .trim();
      if (cleanedMatch.length >= 4) {
        return cleanedMatch.slice(0, 120);
      }
    }
  }

  // On long noisy dumps (e.g. full-screen OCR or multi-line betting/event cards),
  // pick the cleanest line near the anchor
  if (rawLines.length > 5 && indexedLines.length > 3) {

    const nearby = indexedLines
      .filter((item) => Math.abs(item.idx - anchorLineIndex) <= 3 && item.text.length <= 60)
      .sort((a, b) => Math.abs(a.idx - anchorLineIndex) - Math.abs(b.idx - anchorLineIndex));
    // Prefer a line without lots of single-letter/number table noise (e.g. "Kocaelispor Fenerbahçe")
    const cleanest = nearby.find((item) => !/\b\d+\b.*\b\d+\b/.test(item.text)) || nearby[0];
    if (cleanest) {
      return cleanest.text.slice(0, 120);
    }
  }

  const lines = indexedLines.map((i) => i.text);

  if (lines.length === 3 && lines.every((l) => l.length <= 40)) {
    // e.g. ["Süper Lig", "Kocaelispor", "Fenerbahçe"] -> "Süper Lig: Kocaelispor - Fenerbahçe"
    return `${lines[0]}: ${lines[1]} - ${lines[2]}`.slice(0, 120);
  }

  if (lines.length === 2 && lines.every((l) => l.length <= 40)) {
    return `${lines[0]} - ${lines[1]}`.slice(0, 120);
  }

  if (lines.length > 0) {
    return lines[0].slice(0, 120);
  }

  const firstRawLine = text
    .split('\n')
    .map((l) => l.trim())
    .find(Boolean);
  return firstRawLine ? firstRawLine.slice(0, 120) : 'New Event';
};

const scrubNonDateNumbers = (text: string): string => {
  // Remove standalone match scores ("0 - 1"), handicap/odds ("1,5/3,5"), and market counts ("+1154")
  return text
    .replace(/(?:^|\n)\s*\d{1,2}\s*-\s*\d{1,2}\s*(?=\n|$)/g, '\n')
    .replace(/\b\d+,\d+\/\d+,\d+\b/g, ' ')
    .replace(/\+\d+\b/g, ' ');
};

const parseSingleBlockOffline = (block: string, ref: Date): EventDetails => {
  const trimmed = block.trim();
  const isAllDay = /\b(tüm\s+gün|tum\s+gun|bütün\s+gün|butun\s+gun|all[\s-]?day)\b/i.test(trimmed);

  const trDate = parseTurkishDate(trimmed, ref);
  const trTime = parseTurkishTime(trimmed);
  const chronoResults = chrono.parse(scrubNonDateNumbers(trimmed), ref, { forwardDate: true });
  const chronoFirst = chronoResults[0];

  const matchedFragments: string[] = [];
  let start: Date;
  let end: Date;

  if (trDate || trTime) {
    const year = trDate?.year ?? chronoFirst?.start.get('year') ?? ref.getFullYear();
    const month =
      trDate?.month ??
      (chronoFirst?.start.get('month') !== undefined && chronoFirst?.start.get('month') !== null
        ? chronoFirst.start.get('month')! - 1
        : ref.getMonth());
    const day = trDate?.day ?? chronoFirst?.start.get('day') ?? ref.getDate();

    if (trDate) matchedFragments.push(trDate.matchedText);
    if (trTime) matchedFragments.push(...trTime.matchedTexts);

    if (isAllDay) {
      start = new Date(year, month, day, 0, 0, 0);
      end = new Date(year, month, day, 23, 59, 59);
    } else if (trTime) {
      start = new Date(year, month, day, trTime.startHour, trTime.startMinute, 0);
      if (trTime.endHour !== undefined && trTime.endMinute !== undefined) {
        end = new Date(year, month, day, trTime.endHour, trTime.endMinute, 0);
        if (end <= start) {
          end.setDate(end.getDate() + 1);
        }
      } else {
        end = new Date(start.getTime() + 3600000);
      }
    } else {
      // Date found without time
      const isToday =
        year === ref.getFullYear() && month === ref.getMonth() && day === ref.getDate();
      const defaultHour = isToday ? Math.min(23, ref.getHours() + 1) : 9;
      start = new Date(year, month, day, defaultHour, 0, 0);
      end = new Date(start.getTime() + 3600000);
    }
  } else if (chronoFirst) {
    matchedFragments.push(chronoFirst.text);
    start = chronoFirst.start.date();
    if (isAllDay) {
      start = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0);
      end = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 23, 59, 59);
    } else if (chronoFirst.end) {
      end = chronoFirst.end.date();
    } else {
      end = new Date(start.getTime() + 3600000);
    }
  } else {
    // No date/time found anywhere -> fallback to next full hour today
    const nextHour = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), ref.getHours() + 1, 0, 0);
    start = isAllDay
      ? new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 0, 0, 0)
      : nextHour;
    end = isAllDay
      ? new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 23, 59, 59)
      : new Date(start.getTime() + 3600000);
  }

  const { location, matchedText: locationMatch } = extractLocation(trimmed);
  const title = buildCleanTitle(trimmed, matchedFragments, locationMatch);

  return {
    title,
    startDate: formatLocalISO(start),
    endDate: formatLocalISO(end),
    location,
    description: trimmed,
    allDay: isAllDay,
  };
};

const hasDateOrTime = (text: string, ref: Date): boolean => {
  return Boolean(
    parseTurkishDate(text, ref) ||
      parseTurkishTime(text) ||
      chrono.parse(scrubNonDateNumbers(text), ref, { forwardDate: true }).length > 0
  );
};

export const extractEventsFromTextOffline = (
  text: string,
  referenceDate: Date = new Date()
): EventDetails[] => {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('Input text is empty.');
  }

  // Split concatenated markdown links onto separate lines: "[A](url1)[B](url2)" -> "[A](url1)\n[B](url2)"
  const normalizedInput = trimmed.replace(/\)\s*\[/g, ')\n[');

  // 1. Check multi-paragraph blocks
  const paragraphs = normalizedInput
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length > 1) {
    const dateBearingParagraphs = paragraphs.filter((p) => hasDateOrTime(p, referenceDate));
    if (dateBearingParagraphs.length >= 2) {
      return dateBearingParagraphs.map((p) => parseSingleBlockOffline(p, referenceDate));
    }
  }

  // 2. Check multi-line schedule (e.g. each line is its own event with a date/time)
  const lines = normalizedInput
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length > 1) {
    const dateBearingIndices = lines
      .map((l, idx) => (hasDateOrTime(l, referenceDate) ? idx : -1))
      .filter((idx) => idx !== -1);

    // Case A: Multi-card blocks separated by >= 3 lines per date/time anchor (e.g. Bilyoner / event cards)
    const isMultiCardBlocks =
      dateBearingIndices.length >= 2 &&
      dateBearingIndices.some((idx, i) => i > 0 && idx - dateBearingIndices[i - 1] >= 3);

    if (isMultiCardBlocks && dateBearingIndices.length < Math.ceil(lines.length / 2)) {
      return dateBearingIndices.map((idx, i) => {
        const nextIdx =
          i + 1 < dateBearingIndices.length ? dateBearingIndices[i + 1] : lines.length;
        const block = lines.slice(idx, nextIdx).join('\n');
        return parseSingleBlockOffline(block, referenceDate);
      });
    }

    // Case B: Line-by-line schedule (each line is its own event with a date/time)
    if (
      dateBearingIndices.length >= 2 &&
      (dateBearingIndices.length >= Math.ceil(lines.length / 2) || dateBearingIndices.length >= 3)
    ) {
      const usedPrevIndices = new Set<number>();
      return dateBearingIndices.map((idx, pos) => {
        const line = lines[idx];
        const parsed = parseSingleBlockOffline(line, referenceDate);

        // If OCR placed the event title on the line immediately above the time (common in 2-row cards)
        const prevIdx = idx - 1;
        const prevLine = prevIdx >= 0 ? lines[prevIdx] : '';
        const prevIsClaimed =
          usedPrevIndices.has(prevIdx) ||
          (pos > 0 && dateBearingIndices[pos - 1] === prevIdx);

        const titleLooksTooNoisyOrShort =
          parsed.title.length < 6 ||
          /^[^a-zA-ZçğıöşüÇĞİÖŞÜ]{0,3}[a-zçğıöşü]{1,4}(\s+[a-z0-9>]{1,4})*$/i.test(parsed.title) ||
          parsed.title === 'New Event';

        if (
          titleLooksTooNoisyOrShort &&
          prevLine &&
          !prevIsClaimed &&
          !hasDateOrTime(prevLine, referenceDate) &&
          prevLine.length >= 5
        ) {
          usedPrevIndices.add(prevIdx);
          const cleanedPrev = deduplicateLine(
            prevLine.replace(/^[^a-zA-ZçğıöşüÇĞİÖŞÜ0-9]+|[^a-zA-ZçğıöşüÇĞİÖŞÜ0-9.]+$/g, '')
          );
          if (cleanedPrev.length >= 4) {
            parsed.title = cleanedPrev.slice(0, 120);
          }
        }

        return parsed;
      });
    }
  }

  // 3. Single event
  return [parseSingleBlockOffline(trimmed, referenceDate)];
};

const preprocessImageForOCR = async (dataUrl: string): Promise<string> => {
  // Only runs in browser environments with DOM canvas support
  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    return dataUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const maxDim = 3200;
        const rawScale = 2.5;
        const scale = Math.min(
          rawScale,
          maxDim / Math.max(img.width || 1, img.height || 1)
        );
        const targetScale = Math.max(1, scale);
        const width = Math.round(img.width * targetScale);
        const height = Math.round(img.height * targetScale);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // Sample average luminance to detect dark-mode screenshots
        let lumSum = 0;
        let sampleCount = 0;
        for (let i = 0; i < data.length; i += 16) {
          lumSum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          sampleCount++;
        }
        const avgLum = sampleCount > 0 ? lumSum / sampleCount : 255;
        const isDarkTheme = avgLum < 120;

        // Convert to high-contrast grayscale (and invert dark-mode screenshots for Tesseract)
        const contrast = 1.35;
        for (let i = 0; i < data.length; i += 4) {
          let gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          if (isDarkTheme) {
            gray = 255 - gray;
          }
          gray = (gray - 128) * contrast + 128;
          gray = Math.max(0, Math.min(255, gray));
          data[i] = gray;
          data[i + 1] = gray;
          data[i + 2] = gray;
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
};

const detectImageMimeType = (base64: string): string => {
  if (base64.startsWith('/9j/')) return 'image/jpeg';
  if (base64.startsWith('iVBORw0KGgo')) return 'image/png';
  if (base64.startsWith('UklGR')) return 'image/webp';
  if (base64.startsWith('R0lGOD')) return 'image/gif';
  return 'image/png';
};

export interface OCRWord {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

interface ReconstructedLine {
  yCenter: number;
  height: number;
  words: OCRWord[];
  text: string;
}

const isGarbageOCRWord = (w: OCRWord): boolean => {
  const t = w.text.trim();
  if (!t) return true;
  // Drop low-confidence icon/logo artifacts
  if (w.confidence < 45) return true;
  // Drop isolated punctuation/symbol noise
  if (/^[^a-zA-Z0-9çğıöşüÇĞİÖŞÜ]+$/.test(t) && t.length <= 2) return true;
  return false;
};

export const reconstructTextFromOCRWords = (rawWords: OCRWord[]): string => {
  const words = rawWords.filter((w) => !isGarbageOCRWord(w));
  if (words.length === 0) return '';

  // Estimate typical word height
  const heights = words
    .map((w) => Math.max(8, w.bbox.y1 - w.bbox.y0))
    .sort((a, b) => a - b);
  const medianHeight = heights[Math.floor(heights.length / 2)] || 18;
  const yTolerance = Math.max(8, medianHeight * 0.6);

  // Sort top-to-bottom by vertical center, then left-to-right
  const sorted = [...words].sort((a, b) => {
    const cyA = (a.bbox.y0 + a.bbox.y1) / 2;
    const cyB = (b.bbox.y0 + b.bbox.y1) / 2;
    if (Math.abs(cyA - cyB) > yTolerance) return cyA - cyB;
    return a.bbox.x0 - b.bbox.x0;
  });

  // Group into horizontal lines
  const lines: ReconstructedLine[] = [];
  for (const word of sorted) {
    const cy = (word.bbox.y0 + word.bbox.y1) / 2;
    const h = Math.max(8, word.bbox.y1 - word.bbox.y0);
    const targetLine = lines.find((line) => Math.abs(line.yCenter - cy) <= yTolerance);

    if (targetLine) {
      targetLine.words.push(word);
      targetLine.yCenter =
        targetLine.words.reduce((sum, w) => sum + (w.bbox.y0 + w.bbox.y1) / 2, 0) /
        targetLine.words.length;
      targetLine.height = Math.max(targetLine.height, h);
    } else {
      lines.push({ yCenter: cy, height: h, words: [word], text: '' });
    }
  }

  for (const line of lines) {
    line.words.sort((a, b) => a.bbox.x0 - b.bbox.x0);
    line.text = line.words.map((w) => w.text).join(' ');
  }

  // Pair standalone time-only lines (vertically centered in 2-row cards) with the title line right above them
  const mergedLines: ReconstructedLine[] = [];
  const timeOnlyRegex = /^\d{1,2}[:.]\d{2}$/;
  const hasTimeRegex = /\b\d{1,2}[:.]\d{2}\b/;

  for (let i = 0; i < lines.length; i++) {
    const curr = lines[i];
    const trimmed = curr.text.trim();
    const prev = mergedLines[mergedLines.length - 1];

    if (
      timeOnlyRegex.test(trimmed) &&
      prev &&
      !hasTimeRegex.test(prev.text) &&
      curr.yCenter - prev.yCenter <= medianHeight * 2.2
    ) {
      prev.words = [...curr.words, ...prev.words].sort((a, b) => a.bbox.x0 - b.bbox.x0);
      prev.text = prev.words.map((w) => w.text).join(' ');
    } else {
      mergedLines.push(curr);
    }
  }

  const isBrowserChromeLine = (text: string): boolean => {
    return (
      /\bChrome\s+File\s+Edit\s+View\b/i.test(text) ||
      /\bFile\s+Edit\s+View\s+History\s+Bookmarks\b/i.test(text) ||
      /\bApp\s+Store\b.*\bHome\b/i.test(text)
    );
  };

  return mergedLines
    .map((l) => l.text)
    .filter((t) => !isBrowserChromeLine(t))
    .join('\n');
};

let paddleOcrInstance: { detect: (img: string) => Promise<{ texts?: Array<{ text: string; mean?: number }> }> } | null = null;

const recognizeWithPaddleOCR = async (dataUrl: string): Promise<string> => {
  if (typeof window === 'undefined') {
    throw new Error('PaddleOCR browser engine requires a browser environment.');
  }
  if (!paddleOcrInstance) {
    const OcrModule = await import('@gutenye/ocr-browser');
    const Ocr = OcrModule.default;
    paddleOcrInstance = await Ocr.create({
      models: {
        detectionPath: '/ocr-models/ch_PP-OCRv4_det_infer.onnx',
        recognitionPath: '/ocr-models/ch_PP-OCRv4_rec_infer.onnx',
        dictionaryPath: '/ocr-models/ppocr_keys_v1.txt',
      },
    });
  }

  const result = await paddleOcrInstance.detect(dataUrl);
  const lines = (result?.texts || [])
    .filter((item) => item.text && (item.mean === undefined || item.mean >= 0.55))
    .map((item) => item.text.trim())
    .filter(
      (t) =>
        t.length > 1 &&
        !/\bChrome\s+File\s+Edit\s+View\b/i.test(t) &&
        !/\bApp\s*Store\b/i.test(t) &&
        !/\b(?:bilyoner|sporekrani)\.com\//i.test(t)
    );

  return lines.join('\n');
};

export const extractEventsFromImageOffline = async (
  base64Image: string
): Promise<EventDetails[]> => {
  const mimeType = detectImageMimeType(base64Image);
  const rawDataUrl = `data:${mimeType};base64,${base64Image}`;

  let cleanedText = '';

  // 1. Primary: PaddleOCR (ONNX) — much higher accuracy on UI screenshots & multi-event lists
  try {
    cleanedText = (await recognizeWithPaddleOCR(rawDataUrl)).trim();
  } catch (paddleErr) {
    console.warn('PaddleOCR unavailable, falling back to Tesseract.js:', paddleErr);
  }

  // 2. Fallback: Tesseract.js (tur+eng) with 2.5x canvas preprocessing + bbox reconstruction
  if (!cleanedText) {
    const processedDataUrl = await preprocessImageForOCR(rawDataUrl);
    const worker = await createWorker('tur+eng');
    try {
      const res = await worker.recognize(processedDataUrl, {}, { blocks: true });
      const ocrWords: OCRWord[] = [];

      for (const block of res.data.blocks || []) {
        for (const para of block.paragraphs || []) {
          for (const line of para.lines || []) {
            for (const word of line.words || []) {
              ocrWords.push({
                text: word.text,
                confidence: word.confidence,
                bbox: word.bbox,
              });
            }
          }
        }
      }

      const reconstructed = reconstructTextFromOCRWords(ocrWords);
      cleanedText = (reconstructed || res.data.text || '').trim();
    } finally {
      await worker.terminate();
    }
  }

  if (!cleanedText) {
    throw new Error('OCR could not detect any readable text in the image.');
  }

  const events = extractEventsFromTextOffline(cleanedText);
  return events.map((event) => ({
    ...event,
    image: base64Image,
  }));
};
