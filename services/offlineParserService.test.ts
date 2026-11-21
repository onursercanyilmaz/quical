import { describe, it, expect } from 'vitest';
import {
  extractEventsFromTextOffline,
  reconstructTextFromOCRWords,
} from './offlineParserService';
import {
  generateICSFile,
  generateMultipleEventsICSFile,
  getGoogleCalendarUrl,
  getAppleCalendarDataUri,
  getMultipleAppleCalendarDataUri,
  getOutlookCalendarUrl,
} from './icsService';

// Fixed reference date: Saturday, 2026-11-21 12:00:00 local time
const REF_DATE = new Date(2026, 10, 21, 12, 0, 0);

describe('extractEventsFromTextOffline', () => {
  it('parses Turkish month name and time', () => {
    const events = extractEventsFromTextOffline(
      "25 Aralık 2026 saat 19:00'da Yılbaşı Konseri",
      REF_DATE
    );
    expect(events).toHaveLength(1);
    expect(events[0].startDate).toBe('2026-12-25T19:00:00');
    expect(events[0].endDate).toBe('2026-12-25T20:00:00');
    expect(events[0].title).toContain('Yılbaşı Konseri');
    expect(events[0].allDay).toBe(false);
  });

  it('parses Turkish DD.MM.YYYY date, time range, and labeled Konum', () => {
    const events = extractEventsFromTextOffline(
      '12.01.2027 14:00 - 16:30 Proje Değerlendirme Toplantısı\nKonum: Ofis Toplantı Odası 2',
      REF_DATE
    );
    expect(events).toHaveLength(1);
    expect(events[0].startDate).toBe('2027-01-12T14:00:00');
    expect(events[0].endDate).toBe('2027-01-12T16:30:00');
    expect(events[0].location).toBe('Ofis Toplantı Odası 2');
    expect(events[0].title).toContain('Proje Değerlendirme Toplantısı');
  });

  it('parses Turkish relative day "yarın" and "akşam 8"', () => {
    const events = extractEventsFromTextOffline(
      "yarın akşam 8'de Ahmet ile akşam yemeği",
      REF_DATE
    );
    expect(events).toHaveLength(1);
    expect(events[0].startDate).toBe('2026-11-22T20:00:00');
    expect(events[0].endDate).toBe('2026-11-22T21:00:00');
  });

  it('parses Turkish "bugün" and dot-separated time "15.30"', () => {
    const events = extractEventsFromTextOffline(
      "bugün saat 15.30'da Dişçi Randevusu",
      REF_DATE
    );
    expect(events).toHaveLength(1);
    expect(events[0].startDate).toBe('2026-11-21T15:30:00');
    expect(events[0].title).toContain('Dişçi Randevusu');
  });

  it('parses Turkish weekday "haftaya cuma" from a Monday reference', () => {
    const mondayRef = new Date(2026, 10, 23, 12, 0, 0);
    const events = extractEventsFromTextOffline(
      "haftaya cuma saat 10:00'da Haftalık Değerlendirme",
      mondayRef
    );
    expect(events).toHaveLength(1);
    expect(events[0].startDate).toBe('2026-12-04T10:00:00');
  });

  it('parses Turkish all-day event ("tüm gün")', () => {
    const events = extractEventsFromTextOffline(
      '29 Ekim Cumhuriyet Bayramı tüm gün',
      REF_DATE
    );
    expect(events).toHaveLength(1);
    expect(events[0].allDay).toBe(true);
    expect(events[0].startDate).toBe('2027-10-29T00:00:00');
    expect(events[0].endDate).toBe('2027-10-29T23:59:59');
  });

  it('rolls over past month without year to next year', () => {
    const events = extractEventsFromTextOffline(
      '15 Ocak saat 10:00 Vize Başvurusu',
      REF_DATE
    );
    expect(events).toHaveLength(1);
    expect(events[0].startDate).toBe('2027-01-15T10:00:00');
  });

  it('parses English natural language via chrono-node', () => {
    const events = extractEventsFromTextOffline(
      'Meeting with John on Friday at 3pm at Coffee Shop',
      REF_DATE
    );
    expect(events).toHaveLength(1);
    expect(events[0].startDate).toBe('2026-11-27T15:00:00');
    expect(events[0].endDate).toBe('2026-11-27T16:00:00');
    expect(events[0].location).toBe('Coffee Shop');
  });

  it('splits multi-line schedules into multiple events', () => {
    const events = extractEventsFromTextOffline(
      '25 Aralık 19:00 - Konser\n26 Aralık 14:00 - Toplantı',
      REF_DATE
    );
    expect(events).toHaveLength(2);
    expect(events[0].startDate).toBe('2026-12-25T19:00:00');
    expect(events[1].startDate).toBe('2026-12-26T14:00:00');
  });

  it('supports explicit Turkish Etkinlik and Konum labels', () => {
    const events = extractEventsFromTextOffline(
      'Etkinlik: Ürün Lansmanı\nTarih: 05.12.2026 18:00\nKonum: Zorlu PSM',
      REF_DATE
    );
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe('Ürün Lansmanı');
    expect(events[0].startDate).toBe('2026-12-05T18:00:00');
    expect(events[0].location).toBe('Zorlu PSM');
  });

  it('produces valid ICS calendar output from offline parsed event', () => {
    const events = extractEventsFromTextOffline(
      '25 Aralık 2026 19:00 - 21:00 Yılbaşı Konseri\nKonum: Zorlu PSM',
      REF_DATE
    );
    const ics = generateICSFile(events[0]);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('SUMMARY:Yılbaşı Konseri');
    expect(ics).toContain('LOCATION:Zorlu PSM');
    expect(ics).toContain('DTSTART:');
    expect(ics).toContain('DTEND:');
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('END:VCALENDAR');
  });

  it('parses copy-pasted sports match card (Kocaelispor vs Fenerbahçe)', () => {
    const input = `Maçlar
Süper Lig

KocaelisporKocaelispor
Bugün
19:00

FenerbahçeFenerbahçe`;
    const events = extractEventsFromTextOffline(input, REF_DATE);
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe('Süper Lig: Kocaelispor - Fenerbahçe');
    expect(events[0].startDate).toBe('2026-11-21T19:00:00');
    expect(events[0].endDate).toBe('2026-11-21T20:00:00');
    expect(events[0].allDay).toBe(false);
  });

  it('handles noisy Tesseract OCR text from full-screen Chrome screenshot', () => {
    const ocrText = `600 v AppStore Connect X | X Home/X X | e Magoosh TOEFL Pricin X | €) onursercanyiimaziquic: Xx Quical - Screenshot x @) fenerbahçe - Google's. X +
© > © 5 googe.comssarchasienerbaneBog=fenerbahges 8s_crp=EQZiHNNLGBNGAEARY I BWGAEAAYIAYDWGBEARYQXXAXABBIKBTIVCAABIDGIARGIOFMGBIAXAAGE... % © 1
social coffee app (fork) 7 URLReview apprei..  coffeeappv2  Fcoffseapp 7 coffesapp — W coffecapp BE
AlMods Tam — Haberler Gorseler — Videolar — Kisavkdeolar — Yersiteleri— Dahafala + Agr >
Erkekler Futbol Kadınlar Futbol
@ Ferre
==) Fenerbahçe Spor Kulübü
ret Maçlar Puandurumu Kado
Süper Ligilginde 6. ©
Maçlar > Pumdunmu >
Süper liy
Süper liş
tım owe sou oar
& Bugün © 4 0 Baştaş ws
19:00 5 © Kasımpaşa US S1 62
Kocaelispor Fenerbahçe
|: © Feremance Me toate
75) Kocaelispor ne 14a
(© Şahtar Donetsk. 25011 Çar © Fenerbahçe 20/11 Paz
© Fenerbahçe 2800 9 Erzurumspor 1900 xx All ğü
Fenerbahçe SK on: 2 Trendyol Süper Lig {+ 4 3
HB Kocaelispor İk 21 Kasım Cumartesi ©. ?
“Trendyol Süper iş Kooi 21 Kasım.
Tam malar sanma Begin N`;
    const events = extractEventsFromTextOffline(ocrText, REF_DATE);
    expect(events.length).toBeGreaterThanOrEqual(1);
  });

  it('splits concatenated markdown link events and extracts date from URL + glued time', () => {
    const input =
      '[13:00Zeren Spor - MerinosTVF Kadinlar 1. Lig](https://www.sporekrani.com/home/match/496294/2026/11/21/zeren-spor-merinos-tvf-kadinlar-1.-lig-hangi-kanalda)[13:00Halkbank - Seydişehir Bld.TVF Erkekler 2. Lig](https://www.sporekrani.com/home/match/496452/2026/11/21/halkbank-seydisehir-bld.-tvf-erkekler-2.-lig-hangi-kanalda)';
    const events = extractEventsFromTextOffline(input, REF_DATE);
    expect(events).toHaveLength(2);
    expect(events[0].startDate).toBe('2026-11-21T13:00:00');
    expect(events[0].endDate).toBe('2026-11-21T14:00:00');
    expect(events[0].title).toContain('Zeren Spor');
    expect(events[0].title).toContain('MerinosTVF Kadinlar 1. Lig');
    expect(events[0].title).not.toContain('https://');
    expect(events[1].startDate).toBe('2026-11-21T13:00:00');
    expect(events[1].title).toContain('Halkbank');
    expect(events[1].title).toContain('Seydişehir Bld.TVF Erkekler 2. Lig');
  });

  it('extracts all 5 matches from 2x-upscaled Spor Ekranı OCR output', () => {
    const upscaledOcr = `Thitu -) Zeren Spor - Merinos a
® 13:00 on rian ©
TVF Kadinlar 1, Lig
Türkcell TV+
öne Vodalorne TV it 13:00 Halkbank - Seydişehir Bld, ©
TVF Erkekler 2. Lig
. 13:00 Kepez Bild. - Etimesgut Bid. >i
TEF 3. Ug
FY a İnkılap FK - Yalovaspor
*} 13:00 Fiğ >2
Hs 13:00 Büyükçekmece - Gölcükspor >3
TFF 3. Lig`;
    const events = extractEventsFromTextOffline(upscaledOcr, REF_DATE);
    expect(events).toHaveLength(5);
    expect(events.every(e => e.startDate === '2026-11-21T13:00:00')).toBe(true);
    expect(events[1].title).toContain('Halkbank');
    expect(events[2].title).toContain('Kepez');
    expect(events[4].title).toContain('Büyükçekmece');
  });

  it('extracts events from 2.5x-upscaled 15:00 Spor Ekranı OCR output', () => {
    const ocr1500 = `C3 15:00 Hafta Sonu Spor {ion y
= Kağıtspor - Konya Gelişim
Kadınlar Serbest Patinaj a geen
[os 15:00 - )
Artistik Buz Pateni Grand Prix 4 £2
a i Fenerbahçe - Eyüpspor
8) 15:00 re @
TEF Elit UT7 Lig or
Dam Ba belN Süper Lig BU
[ Jo) 15:00 Futbol Bı cd [ors]`;
    const events = extractEventsFromTextOffline(ocr1500, REF_DATE);
    expect(events.length).toBeGreaterThanOrEqual(4);
    expect(events.every(e => e.startDate === '2026-11-21T15:00:00')).toBe(true);
  });

  it('reconstructs clean lines from OCR word bounding boxes and drops low-confidence noise', () => {
    const mockWords = [
      // Low-confidence icon noise next to 15:00
      { text: '8)', confidence: 22, bbox: { x0: 850, y0: 1268, x1: 890, y1: 1295 } },
      // Vertically centered time 15:00
      { text: '15:00', confidence: 94, bbox: { x0: 935, y0: 1272, x1: 1012, y1: 1293 } },
      // Title slightly above 15:00
      { text: 'Fenerbahçe', confidence: 88, bbox: { x0: 1094, y0: 1250, x1: 1256, y1: 1275 } },
      { text: '-', confidence: 90, bbox: { x0: 1262, y0: 1255, x1: 1272, y1: 1268 } },
      { text: 'Eyüpspor', confidence: 91, bbox: { x0: 1278, y0: 1250, x1: 1390, y1: 1275 } },
      // Low-confidence logo noise on the right
      { text: 'FBTV', confidence: 30, bbox: { x0: 1800, y0: 1265, x1: 1860, y1: 1290 } },
      // Next match card lower down
      { text: 'beIN', confidence: 92, bbox: { x0: 1094, y0: 1375, x1: 1150, y1: 1398 } },
      { text: 'Süper', confidence: 93, bbox: { x0: 1156, y0: 1375, x1: 1220, y1: 1398 } },
      { text: 'Lig', confidence: 94, bbox: { x0: 1226, y0: 1375, x1: 1265, y1: 1398 } },
      { text: '15:00', confidence: 95, bbox: { x0: 935, y0: 1398, x1: 1012, y1: 1418 } },
    ];

    const text = reconstructTextFromOCRWords(mockWords);
    const events = extractEventsFromTextOffline(text, REF_DATE);
    expect(events).toHaveLength(2);
    expect(events[0].title).toBe('Fenerbahçe Eyüpspor');
    expect(events[0].startDate).toBe('2026-11-21T15:00:00');
    expect(events[1].title).toBe('beIN Süper Lig');
    expect(events[1].startDate).toBe('2026-11-21T15:00:00');
  });

  it('extracts all 5 matches cleanly from PaddleOCR output on the Spor Ekranı screenshot', () => {
    const paddleOutput = `sporekrani.com
Ozel Indirimle S Sport Plus Izle HEMEN AL
Futbol asketbol Voleybol Tenis Boks Hentbol o6 Motor Sporlan Gures Atletizm Programlar
15:00 Hafta Sonu Spor THO
Spor Programi
15:00 Kagrtspor -Konya Gelisim TBF
Basketbol 2.Ligi
15:00 Kadinlar Serbest Patinaj
Artistik Buz Paleni Grand Prox
15:00 Fenerbahce-Eyupspor
TFF EltU17 Ligi
15:00 belN Super Lig
Futbol Programl`;
    const events = extractEventsFromTextOffline(paddleOutput, REF_DATE);
    expect(events).toHaveLength(5);
    expect(events.every(e => e.startDate === '2026-11-21T15:00:00')).toBe(true);
    expect(events[0].title).toContain('Hafta Sonu Spor');
    expect(events[1].title).toContain('Kagrtspor');
    expect(events[2].title).toContain('Kadinlar Serbest Patinaj');
    expect(events[3].title).toContain('Fenerbahce');
    expect(events[4].title).toContain('belN Super Lig');
  });

  it('extracts 5 concatenated 15:00 markdown events and exports valid ICS, Google, Apple, and Outlook formats', () => {
    const input =
      '[15:00Hafta Sonu SporSpor Programi](https://www.sporekrani.com/home/match/498071/2026/11/21/hafta-sonu-spor-spor-programi-hangi-kanalda)[15:00Kağıtspor - Konya GelişimBasketbol 2. Ligi](https://www.sporekrani.com/home/match/498279/2026/11/21/kagitspor-konya-gelisim-basketbol-2.-ligi-hangi-kanalda)[15:00Kadınlar Serbest PatinajArtistik Buz Pateni Grand Prix](https://www.sporekrani.com/home/match/498303/2026/11/21/kadinlar-serbest-patinaj-artistik-buz-pateni-grand-prix-hangi-kanalda)[15:00Fenerbahçe - EyüpsporTFF Elit U17 Ligi](https://www.sporekrani.com/home/match/498414/2026/11/21/fenerbahce-eyupspor-tff-elit-u17-ligi-hangi-kanalda)[15:00beIN Süper LigFutbol Programi](https://www.sporekrani.com/home/match/498430/2026/11/21/bein-super-lig-futbol-programi-hangi-kanalda)';

    const events = extractEventsFromTextOffline(input, REF_DATE);
    expect(events).toHaveLength(5);
    expect(events.every((e) => e.startDate === '2026-11-21T15:00:00')).toBe(true);
    expect(events.every((e) => e.endDate === '2026-11-21T16:00:00')).toBe(true);
    expect(events[0].title).toContain('Hafta Sonu Spor');
    expect(events[1].title).toContain('Kağıtspor');
    expect(events[2].title).toContain('Kadınlar Serbest Patinaj');
    expect(events[3].title).toContain('Fenerbahçe');
    expect(events[4].title).toContain('beIN Süper Lig');

    // Multi-event ICS check
    const multiIcs = generateMultipleEventsICSFile(events);
    expect(multiIcs.match(/BEGIN:VEVENT/g)).toHaveLength(5);
    expect(multiIcs.match(/END:VEVENT/g)).toHaveLength(5);
    expect(multiIcs).toContain('SUMMARY:Fenerbahçe');

    // Google Calendar URL check
    const gcalUrl = new URL(getGoogleCalendarUrl(events[3]));
    expect(gcalUrl.hostname).toBe('calendar.google.com');
    expect(gcalUrl.searchParams.get('action')).toBe('TEMPLATE');
    expect(gcalUrl.searchParams.get('text')).toContain('Fenerbahçe');
    expect(gcalUrl.searchParams.get('dates')).toMatch(/^\d{8}T\d{6}Z\/\d{8}T\d{6}Z$/);

    // Apple Calendar data URI check (single & multiple)
    const appleSingle = getAppleCalendarDataUri(events[0]);
    expect(appleSingle.startsWith('data:text/calendar;charset=utf8,')).toBe(true);
    const appleMulti = getMultipleAppleCalendarDataUri(events);
    expect(decodeURIComponent(appleMulti)).toContain('BEGIN:VCALENDAR');
    expect(decodeURIComponent(appleMulti).match(/BEGIN:VEVENT/g)).toHaveLength(5);

    // Outlook Web URL check
    const outlookUrl = new URL(getOutlookCalendarUrl(events[3]));
    expect(outlookUrl.hostname).toBe('outlook.live.com');
    expect(outlookUrl.searchParams.get('subject')).toContain('Fenerbahçe');
    expect(outlookUrl.searchParams.get('startdt')).toBe(new Date(events[3].startDate).toISOString());
    expect(outlookUrl.searchParams.get('enddt')).toBe(new Date(events[3].endDate).toISOString());
  });

  it('does not misinterpret betting odds (7.26, 1.27) or scores (0 - 1, 1 - 1) as event times', () => {
    const input = `futbolEndonezya Süper Lig
1
Persik Kediri
-
PSIM Yogyakar
0 - 1
59'
7.26
MS 1
2.78
MS X
1.27
MS 2
2.29
1,5 Alt
1.17
1,5 Üst
+36
Tümü
1
Persebaya Sur
-
Malut United
1 - 1
60'
2.10
MS 1
1.85
MS X
3.69
MS 2
1.16
3,5 Alt
2.34
3,5 Üst
+34
Tümü
futbolAvustralya A-Ligi
1
Brisbane
-
Sydney FC`;
    const events = extractEventsFromTextOffline(input, REF_DATE);
    // No real date or clock time exists in this text, so it should not split into 9 bogus odds events
    expect(events).toHaveLength(1);
    expect(events[0].startDate).toBe('2026-11-21T13:00:00');
  });

  it('extracts multiple Bilyoner pre-match cards with Bugün HH:MM and markdown match titles', () => {
    const input = `Türkiye Süper Lig
Bugün 13:30
1
[G.Birliği-Gaziantep](https://www.bilyoner.com/mac-karti/futbol/3313538/oranlar?isprematch=true)
2.17
MS 1
3.22
MS X
2.40
MS 2
2.02
2,5 Alt
1.45
2,5 Üst
+561
Tümü
Türkiye Süper Lig
Bugün 16:00
1
[Amed Sportif-Rizespor](https://www.bilyoner.com/mac-karti/futbol/3313999/oranlar?isprematch=true)
1.66
MS 1
3.42
MS X
3.44
MS 2
2.10
2,5 Alt
1.41
2,5 Üst
+522
Tümü
1
[Galatasaray-Samsunspor](https://www.bilyoner.com/mac-karti/futbol/3314007/oranlar?isprematch=true)`;
    const events = extractEventsFromTextOffline(input, REF_DATE);
    expect(events).toHaveLength(2);
    expect(events[0].title).toBe('G.Birliği-Gaziantep');
    expect(events[0].startDate).toBe('2026-11-21T13:30:00');
    expect(events[0].endDate).toBe('2026-11-21T14:30:00');
    expect(events[1].title).toBe('Amed Sportif-Rizespor');
    expect(events[1].startDate).toBe('2026-11-21T16:00:00');
    expect(events[1].endDate).toBe('2026-11-21T17:00:00');
  });

  it('extracts La Liga matches cleanly from PaddleOCR output on dark-mode Bilyoner screenshot', () => {
    const bilyonerOcr = `Bilyoner Yardim 0 Uye Ol Giris Yap
iddaa Tribin Popiler Bahisler Yazarlar Coklu MacTakibi Canli skor Spor Toto
Futbol
MS/2,5 1,5/3,5 CS/KG iYO,S/iY1,5 Korner IY TG
ispanya LeLiga ougun-1o:vu
Alaves-Deportivo La Co 00 2.06 2.87 2.82 1.47 1.96 +1164
MS1 M5X M52 25 250
Ispanya La Liga Bugun 18:15
Vallecano-Valencia 1.75 3.04 3.46 1.58 1.80 102
MS1 MSX M52 2.5A 250st
ispanya La Liga Bugun20:30
Sevilla-Real Betis 2.58 2.96 2.17 1.69 1.67 +1016
M51 M5X M52 2.5A 250st
ispanya La Liga Bugun 23:00
Real Madrid-Celta Vigo 003 7.19 12.75 2.81 1.21 +1154
M5 1 M5X MS52 25A 250
Almanya Bundesliga Bugun 17:30`;
    const events = extractEventsFromTextOffline(bilyonerOcr, REF_DATE);
    const laLigaAndBundesliga = events.filter((e) =>
      ['Vallecano-Valencia', 'Sevilla-Real Betis', 'Real Madrid-Celta Vigo', 'Almanya Bundesliga'].includes(e.title)
    );
    expect(laLigaAndBundesliga).toHaveLength(4);
    expect(laLigaAndBundesliga[0].startDate).toBe('2026-11-21T18:15:00');
    expect(laLigaAndBundesliga[1].startDate).toBe('2026-11-21T20:30:00');
    expect(laLigaAndBundesliga[2].startDate).toBe('2026-11-21T23:00:00');
    expect(laLigaAndBundesliga[3].startDate).toBe('2026-11-21T17:30:00');
  });

  it('exports all-day events with RFC 5545 VALUE=DATE in ICS and date-only in Google Calendar', () => {
    const events = extractEventsFromTextOffline('29 Ekim Cumhuriyet Bayramı tüm gün', REF_DATE);
    const ics = generateICSFile(events[0]);
    expect(ics).toContain('DTSTART;VALUE=DATE:20271029');
    expect(ics).toContain('DTEND;VALUE=DATE:20271030');

    const gcal = new URL(getGoogleCalendarUrl(events[0]));
    expect(gcal.searchParams.get('dates')).toBe('20271029/20271030');
  });
});
