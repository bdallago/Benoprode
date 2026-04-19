import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { BookOpen, Trophy, Target, AlertCircle, HelpCircle, Users, ChevronDown, CheckCircle2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../components/ui/accordion";

export default function Instructions() {
  return (
    <div id="tutorial-rules-content" className="max-w-4xl mx-auto space-y-8">
      {/* Hero Header Area for Instructions */}
      <div className="text-center space-y-2 mb-8">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
          Manual de Juego
        </h1>
        <p className="text-gray-500 dark:text-gray-200 max-w-2xl mx-auto">
          Aprendé a jugar al Prode de Beno en 5 minutos. Desplegá los paneles para leer las reglas y el sistema de puntuación.
        </p>
      </div>

      <Accordion type="single" collapsible className="w-full space-y-4">
        {/* Panel 1: Cómo Jugar */}
        <AccordionItem value="como-jugar" className="border-none bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">¿Cómo arranco a jugar?</h3>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-4 text-gray-700 dark:text-gray-300">
            <div className="space-y-4">
              
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800">
                  <h4 className="font-bold flex items-center gap-2 mb-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Fase de Grupos</h4>
                  <p className="text-sm">Ordená los equipos del 1º al 4º puesto. Los 2 primeros y los 8 mejores terceros avanzan a la siguiente ronda.</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800">
                  <h4 className="font-bold flex items-center gap-2 mb-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Partidos Individuales</h4>
                  <p className="text-sm">Predecí el resultado exacto y/o el ganador/empate de cada encuentro.</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800">
                   <h4 className="font-bold flex items-center gap-2 mb-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Preguntas Especiales</h4>
                  <p className="text-sm">Animate a responder consignas sobre el goleador, selección decepción y más.</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800">
                  <h4 className="font-bold flex items-center gap-2 mb-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Fase Eliminatoria</h4>
                  <p className="text-sm">Se habilitará una vez que en el torneo real se definan los resultados de fase de grupos.</p>
                </div>
              </div>

              <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 rounded-lg border border-amber-200 dark:border-amber-800">
                <strong>¡Importante!</strong> Podés guardar borradores todas las veces que quieras. Pero cuando hagas clic en "Fijar Predicciones", tu prode quedará bloqueado. Las predicciones de partidos individuales pueden editarse hasta 1 hora antes de cada partido.
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Panel 2: Puntuación */}
        <AccordionItem value="puntuacion" className="border-none bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-lg">
                <Trophy className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Sistema de Puntuación</h3>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-2 text-gray-700 dark:text-gray-300">
            <div className="space-y-6">
              
              {/* Groups & Matches */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-bold text-gray-800 dark:text-gray-200 border-b dark:border-gray-700 pb-2">Fase de Grupos</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                      <span className="text-sm dark:text-gray-200">Acertar posición exacta</span>
                      <span className="font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-2 py-1 rounded text-xs">+1</span>
                    </div>
                    <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                      <span className="text-sm dark:text-gray-200">Grupo Perfecto (4 posiciones)</span>
                      <span className="font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-2 py-1 rounded text-xs">+3</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-gray-800 dark:text-gray-200 border-b dark:border-gray-700 pb-2">Partidos Individuales</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                      <span className="text-sm dark:text-gray-200">Acertar ganador o empate</span>
                      <span className="font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-2 py-1 rounded text-xs">+1</span>
                    </div>
                    <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                      <span className="text-sm dark:text-gray-200">Acertar resultado exacto (goles)</span>
                      <span className="font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-2 py-1 rounded text-xs">+2</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Knockout & Specials */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-bold text-gray-800 dark:text-gray-200 border-b dark:border-gray-700 pb-2">Fase Eliminatoria</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                      <span className="text-sm dark:text-gray-200">Equipo avanza a 16avos</span>
                      <span className="font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-2 py-1 rounded text-xs">+2</span>
                    </div>
                    <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                      <span className="text-sm dark:text-gray-200">Equipo avanza a Octavos</span>
                      <span className="font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-2 py-1 rounded text-xs">+4</span>
                    </div>
                    <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                      <span className="text-sm dark:text-gray-200">Equipo avanza a Cuartos</span>
                      <span className="font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-2 py-1 rounded text-xs">+6</span>
                    </div>
                    <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                      <span className="text-sm dark:text-gray-200">Equipo avanza a Semis</span>
                      <span className="font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-2 py-1 rounded text-xs">+8</span>
                    </div>
                    <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                      <span className="text-sm dark:text-gray-200">Acertar el Campeón</span>
                      <span className="font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-2 py-1 rounded text-xs">+15</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-gray-800 dark:text-gray-200 border-b dark:border-gray-700 pb-2">Preguntas Especiales</h4>
                  <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                    <span className="text-sm dark:text-gray-200">Acertar la respuesta exacta a cada consigna especial planteada.</span>
                    <span className="font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-2 py-1 rounded text-xs">+10</span>
                  </div>
                </div>
              </div>

            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Panel 3: Amigos y Duelos */}
        <AccordionItem value="duelos" className="border-none bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
                <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Amigos y Duelos</h3>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-2 text-gray-700 dark:text-gray-300">
            <div className="space-y-4">
              <p>Enviale solicitudes de amistad a quien quieras. Cuando ambos hayan "Fijado" el prode podrán ver las respuestas del otro y retarse a Duelos para saldar diferencias.</p>
              
              <ul className="space-y-2 mt-4 ml-2">
                <li className="flex gap-2"><span className="text-purple-500 font-bold">•</span> Retá a un amigo por una posición de grupo, o el transcurso de un partido.</li>
                <li className="flex gap-2"><span className="text-purple-500 font-bold">•</span> Cada Duelo suma 1 victoria para el ganador del mismo.</li>
                <li className="flex gap-2"><span className="text-purple-500 font-bold">•</span> Si los retás por un Grupo Completo (todas las posiciones juntas), ¡te llevás 3 victorias!</li>
                <li className="flex gap-2"><span className="text-purple-500 font-bold">•</span> <strong>Recompensa:</strong> Cada 3 victorias de duelo acumuladas, obtenés +1 punto en el Ranking Global.</li>
              </ul>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Panel 4: Ligas Privadas */}
        <AccordionItem value="ligas" className="border-none bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
                <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Torneos y Ligas Privadas</h3>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-2 text-gray-700 dark:text-gray-300">
            <div className="space-y-3">
              <p className="italic text-gray-500 dark:text-gray-200 mb-2">Jugá entre el trabajo, el club o tu grupo.</p>
              <p>Además del ranking global, podés ir a la sección "Ligas" y crear torneos privados.</p>
              <p>Ponele nombre y foto, e invitá a tus amigos pasándoles el enlace exclusivo. Ser miembro de una liga genera una tabla de posiciones exclusiva entre las personas que forman parte de la misma.</p>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
