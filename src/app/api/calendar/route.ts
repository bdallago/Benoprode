import { NextResponse } from "next/server";
import matchesData from "../../../lib/matches.json";

const FLAGS: Record<string, string> = {
  "Alemania": "🇩🇪",
  "Arabia Saudita": "🇸🇦",
  "Argelia": "🇩🇿",
  "Argentina": "🇦🇷",
  "Australia": "🇦🇺",
  "Austria": "🇦🇹",
  "Bosnia y Herzegovina": "🇧🇦",
  "Brasil": "🇧🇷",
  "Bélgica": "🇧🇪",
  "Cabo Verde": "🇨🇻",
  "Canadá": "🇨🇦",
  "Colombia": "🇨🇴",
  "Corea del Sur": "🇰🇷",
  "Costa de Marfil": "🇨🇮",
  "Croacia": "🇭🇷",
  "Curazao": "🇨🇼",
  "Ecuador": "🇪🇨",
  "Egipto": "🇪🇬",
  "Escocia": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "España": "🇪🇸",
  "Estados Unidos": "🇺🇸",
  "Francia": "🇫🇷",
  "Ghana": "🇬🇭",
  "Haití": "🇭🇹",
  "Inglaterra": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "Irak": "🇮🇶",
  "Irán": "🇮🇷",
  "Japón": "🇯🇵",
  "Jordania": "🇯🇴",
  "Marruecos": "🇲🇦",
  "México": "🇲🇽",
  "Noruega": "🇳🇴",
  "Nueva Zelanda": "🇳🇿",
  "Panamá": "🇵🇦",
  "Paraguay": "🇵🇾",
  "Países Bajos": "🇳🇱",
  "Portugal": "🇵🇹",
  "Qatar": "🇶🇦",
  "República Checa": "🇨🇿",
  "República Democrática del Congo": "🇨🇩",
  "Senegal": "🇸🇳",
  "Sudáfrica": "🇿🇦",
  "Suecia": "🇸🇪",
  "Suiza": "🇨🇭",
  "Turquía": "🇹🇷",
  "Túnez": "🇹🇳",
  "Uruguay": "🇺🇾",
  "Uzbekistán": "🇺🇿",
};

function flag(team: string): string {
  return FLAGS[team] ?? "";
}

function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeText(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let remaining = line;
  let first = true;
  while (remaining.length > 0) {
    const limit = first ? 75 : 74;
    parts.push((first ? "" : " ") + remaining.slice(0, limit));
    remaining = remaining.slice(limit);
    first = false;
  }
  return parts.join("\r\n");
}

function prop(name: string, value: string): string {
  return foldLine(`${name}:${escapeText(value)}`);
}

function generateICS(): string {
  const out: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//El Prode de Beno//Mundial 2026//ES",
    "X-WR-CALNAME:Mundial 2026 - El Prode de Beno",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALDESC:Los 72 partidos del Mundial de Futbol 2026",
  ];

  for (const match of matchesData as Array<{ id: string; teamA: string; teamB: string; date: string }>) {
    const start = new Date(match.date);
    const end = new Date(start.getTime() + 120 * 60 * 1000);
    const fA = flag(match.teamA);
    const fB = flag(match.teamB);
    const summary = `${fA} ${match.teamA} vs ${fB} ${match.teamB}`;
    const description = `Copa Mundial de Futbol 2026 | ${fA} ${match.teamA} vs ${fB} ${match.teamB}`;

    out.push(
      "BEGIN:VEVENT",
      `UID:${match.id}@elprodedebeno.com.ar`,
      `DTSTART:${formatICSDate(start)}`,
      `DTEND:${formatICSDate(end)}`,
      prop("SUMMARY", summary),
      prop("DESCRIPTION", description),
      "STATUS:CONFIRMED",
      "SEQUENCE:0",
      "BEGIN:VALARM",
      "TRIGGER:-PT60M",
      "ACTION:DISPLAY",
      prop("DESCRIPTION", `En 1 hora: ${fA} ${match.teamA} vs ${fB} ${match.teamB}`),
      "END:VALARM",
      "END:VEVENT"
    );
  }

  out.push("END:VCALENDAR");
  return out.join("\r\n") + "\r\n";
}

export async function GET() {
  const ics = generateICS();
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
