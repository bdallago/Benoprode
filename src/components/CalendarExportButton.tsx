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
        onClick={() => setIsOpen(true)}
        className="bg-green-600 hover:bg-green-500 text-white flex items-center gap-2 shadow-md hover:scale-105 transition-transform border-2 border-green-900 border-b-4 active:border-b-2 active:translate-y-0.5"
      >
        {isSuccess ? <CheckCircle2 className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
        {isSuccess ? t('calendar.synced', '¡Listo!') : t('calendar.addToCalendar', 'Agendar Mundial en mi Calendario')}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="text-amber-500" /> {t('calendar.warningTitle', '¿Agendar todos los partidos?')}
            </DialogTitle>
            <DialogDescription className="py-2">
              {t('calendar.warningDesc', 'Esta acción descargará un archivo para agregar los 48 partidos del mundial a tu calendario. Se agendarán 1 hora y 15 minutos antes del inicio de cada uno para que tengas 15 minutos de margen para hacer tu predicción.')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="ghost" onClick={() => setIsOpen(false)}>
              {t('common.cancel', 'Cancelar')}
            </Button>
            <Button onClick={exportToGoogle} className="bg-blue-600 hover:bg-blue-700 font-bold">
              {t('calendar.confirm', '¡Sí, agendar todo!')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
