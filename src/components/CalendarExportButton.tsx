'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import matchesData from '../lib/matches.json';
import { useTranslation } from 'react-i18next';

export function CalendarExportButton() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const exportToGoogle = () => {
    // Google Calendar permite enlaces directos, pero para múltiples eventos
    // lo ideal es generar un archivo .ics que todos los calendarios entienden.
    // Para simplificar y cumplir con "Google Calendar", generaremos un .ics
    // que al abrirse en Android/Desktop agrega todo.
    generateICS();
    setIsOpen(false);
    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), 3000);
  };

  const generateICS = () => {
    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//El Prode de Beno//NONSGML v1.0//EN\n";
    
    matchesData.forEach(match => {
      const matchDate = new Date(match.date);
      // Restar 1 hora y 15 minutos (75 minutos)
      const warningDate = new Date(matchDate.getTime() - (75 * 60 * 1000));
      const endDate = new Date(warningDate.getTime() + (30 * 60 * 1000)); // 30 min de duración

      const formatDate = (date: Date) => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + "Z";
      };

      icsContent += "BEGIN:VEVENT\n";
      icsContent += `SUMMARY:📝 Predicción: ${match.teamA} vs ${match.teamB}\n`;
      icsContent += `DTSTART:${formatDate(warningDate)}\n`;
      icsContent += `DTEND:${formatDate(endDate)}\n`;
      icsContent += `DESCRIPTION:¡Faltan 15 minutos para que cierre la predicción de este partido! Entrá al Prode de Beno ahora.\n`;
      icsContent += `LOCATION:El Prode de Beno App\n`;
      icsContent += "END:VEVENT\n";
    });

    icsContent += "END:VCALENDAR";

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', 'Mundial2026_ProdeBeno.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <Button 
        disabled
        className="bg-gray-400 dark:bg-gray-700 text-white flex items-center gap-2 opacity-70 cursor-not-allowed cursor-not-allowed pointer-events-none"
      >
        <Calendar className="w-5 h-5" />
        {t('calendar.comingSoon', 'Agendar Mundial (Próximamente)')}
      </Button>
    </>
  );
}
