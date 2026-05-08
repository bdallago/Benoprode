'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { Calendar, ExternalLink, Download, X } from 'lucide-react';
import matchesData from '../lib/matches.json';

const CALENDAR_URL = 'https://www.elprodedebeno.com.ar/api/calendar';

const FLAGS: Record<string, string> = {
  "Alemania": "🇩🇪", "Arabia Saudita": "🇸🇦", "Argelia": "🇩🇿", "Argentina": "🇦🇷",
  "Australia": "🇦🇺", "Austria": "🇦🇹", "Bosnia y Herzegovina": "🇧🇦", "Brasil": "🇧🇷",
  "Bélgica": "🇧🇪", "Cabo Verde": "🇨🇻", "Canadá": "🇨🇦", "Colombia": "🇨🇴",
  "Corea del Sur": "🇰🇷", "Costa de Marfil": "🇨🇮", "Croacia": "🇭🇷", "Curazao": "🇨🇼",
  "Ecuador": "🇪🇨", "Egipto": "🇪🇬", "Escocia": "🏴󠁧󠁢󠁳󠁣󠁴󠁿", "España": "🇪🇸",
  "Estados Unidos": "🇺🇸", "Francia": "🇫🇷", "Ghana": "🇬🇭", "Haití": "🇭🇹",
  "Inglaterra": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "Irak": "🇮🇶", "Irán": "🇮🇷", "Japón": "🇯🇵",
  "Jordania": "🇯🇴", "Marruecos": "🇲🇦", "México": "🇲🇽", "Noruega": "🇳🇴",
  "Nueva Zelanda": "🇳🇿", "Panamá": "🇵🇦", "Paraguay": "🇵🇾", "Países Bajos": "🇳🇱",
  "Portugal": "🇵🇹", "Qatar": "🇶🇦", "República Checa": "🇨🇿",
  "República Democrática del Congo": "🇨🇩", "Senegal": "🇸🇳", "Sudáfrica": "🇿🇦",
  "Suecia": "🇸🇪", "Suiza": "🇨🇭", "Turquía": "🇹🇷", "Túnez": "🇹🇳",
  "Uruguay": "🇺🇾", "Uzbekistán": "🇺🇿",
};

function flag(team: string): string { return FLAGS[team] ?? ''; }

function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function escapeText(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let remaining = line;
  let first = true;
  while (remaining.length > 0) {
    const limit = first ? 75 : 74;
    parts.push((first ? '' : ' ') + remaining.slice(0, limit));
    remaining = remaining.slice(limit);
    first = false;
  }
  return parts.join('\r\n');
}

function downloadICS() {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//El Prode de Beno//Mundial 2026//ES',
    'X-WR-CALNAME:Mundial 2026 - El Prode de Beno',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const match of matchesData) {
    const start = new Date(match.date);
    const end = new Date(start.getTime() + 120 * 60 * 1000);
    const fA = flag(match.teamA);
    const fB = flag(match.teamB);
    const summary = `${fA} ${match.teamA} vs ${fB} ${match.teamB}`;
    const description = `Copa Mundial de Futbol 2026 | ${fA} ${match.teamA} vs ${fB} ${match.teamB}`;
    lines.push(
      'BEGIN:VEVENT',
      `UID:${match.id}@elprodedebeno.com.ar`,
      `DTSTART:${formatICSDate(start)}`,
      `DTEND:${formatICSDate(end)}`,
      foldLine(`SUMMARY:${escapeText(summary)}`),
      foldLine(`DESCRIPTION:${escapeText(description)}`),
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      'BEGIN:VALARM',
      'TRIGGER:-PT60M',
      'ACTION:DISPLAY',
      foldLine(`DESCRIPTION:${escapeText(`En 1 hora: ${fA} ${match.teamA} vs ${fB} ${match.teamB}`)}`),
      'END:VALARM',
      'END:VEVENT'
    );
  }
  lines.push('END:VCALENDAR');

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'Mundial2026_ProdeBeno.ics';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

export function CalendarExportButton() {
  const [isOpen, setIsOpen] = useState(false);

  const handleGoogleCalendar = () => {
    const webcalUrl = CALENDAR_URL.replace('https://', 'webcal://');
    const encoded = encodeURIComponent(webcalUrl);
    window.open(
      `https://calendar.google.com/calendar/render?cid=${encoded}`,
      '_blank',
      'noopener,noreferrer'
    );
    setIsOpen(false);
  };

  const handleDownload = () => {
    downloadICS();
    setIsOpen(false);
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
      >
        <Calendar className="w-5 h-5" />
        Agendar Mundial
      </Button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500" />
                Agregar al calendario
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Los 72 partidos del Mundial 2026 con recordatorio 1 hora antes.
              </p>
            </div>

            <button
              onClick={handleGoogleCalendar}
              className="flex items-center justify-between gap-3 w-full rounded-xl border-2 border-blue-500 bg-blue-50 dark:bg-blue-950 px-4 py-3 text-left hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
            >
              <div className="flex flex-col">
                <span className="font-semibold text-blue-700 dark:text-blue-300 text-sm">
                  Google Calendar
                </span>
                <span className="text-xs text-blue-500 dark:text-blue-400">
                  Suscribirse — se actualiza automáticamente
                </span>
              </div>
              <ExternalLink className="w-4 h-4 text-blue-500 shrink-0" />
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center justify-between gap-3 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex flex-col">
                <span className="font-semibold text-gray-700 dark:text-gray-200 text-sm">
                  Descargar archivo .ics
                </span>
                <span className="text-xs text-gray-400">
                  Outlook, Apple Calendar u otros
                </span>
              </div>
              <Download className="w-4 h-4 text-gray-400 shrink-0" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
