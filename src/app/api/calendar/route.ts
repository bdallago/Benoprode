import { NextResponse } from "next/server";
import matchesData from "../../../lib/matches.json";

function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function generateICS(): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//El Prode de Beno//Mundial 2026//EN",
    "X-WR-CALNAME:Mundial 2026 - El Prode de Beno",
    "X-WR-TIMEZONE:UTC",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const match of matchesData) {
    const start = new Date(match.date);
    const end = new Date(start.getTime() + 120 * 60 * 1000);

    lines.push(
      "BEGIN:VEVENT",
      `UID:${match.id}@elprodedebeno.com.ar`,
      `DTSTART:${formatICSDate(start)}`,
      `DTEND:${formatICSDate(end)}`,
      `SUMMARY:${match.teamA} vs ${match.teamB} | Mundial 2026`,
      `DESCRIPTION:Copa Mundial de Fútbol 2026 — ${match.teamA} vs ${match.teamB}`,
      "BEGIN:VALARM",
      "TRIGGER:-PT60M",
      "ACTION:DISPLAY",
      `DESCRIPTION:En 1 hora: ${match.teamA} vs ${match.teamB}`,
      "END:VALARM",
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export async function GET() {
  const ics = generateICS();
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="Mundial2026_ProdeBeno.ics"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
