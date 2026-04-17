import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { BookOpen, Trophy, Target, AlertCircle } from "lucide-react";

export default function Instructions() {
  return (
    <div id="tutorial-rules-content" className="max-w-4xl mx-auto space-y-8">
      <div className="grid gap-6">
        <Card>
          <CardHeader className="bg-blue-50 dark:bg-blue-900/20 border-b dark:border-gray-700 pb-4 transition-colors duration-200">
            <CardTitle className="text-xl flex items-center justify-center gap-2 text-blue-900 dark:text-blue-400">
              <Target className="w-5 h-5" /> ¿Cómo jugar?
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4 text-gray-700 dark:text-gray-300 text-justify">
            <p>
              El objetivo del juego es sumar la mayor cantidad de puntos posibles prediciendo los resultados de la fase de grupos y las fases eliminatorias. Ademas, podes sumar mas puntos respondiendo a preguntas especiales sobre el torneo.
            </p>
            <ul className="list-disc pl-5 space-y-2 text-justify">
              <li>Andá a la pestaña <strong>"Mis Predicciones"</strong> para completar tu prode.</li>
              <li>En la <strong>Fase de Grupos</strong>, tenés que arrastrar y soltar los equipos para ordenarlos del 1º al 4º puesto. Los dos primeros y los 8 mejores terceros avanzan a 16avos. La Fase Eliminatoria va a estar habilitada una vez que en el torneo se definan los resultados finales de la fase de grupos.</li>
              <li>Vas a poder predecir cada <strong>partido de manera individual</strong>, tanto decidiendo quien va a ganar o si empatan, como la cantidad exacta de goles convertidos por equipo.</li>
              <li>En las <strong>Preguntas Especiales</strong>, tenés que escribir el nombre completo del jugador o selección que creas que cumplirá con la consigna.</li>
            </ul>
            <p>
              Podés <strong>"Guardar Borrador"</strong> todas las veces que quieras. Una vez que estés seguro de tus elecciones, tenés que hacer clic en <strong>"Fijar Predicciones"</strong>. ¡Atención! Esta acción es definitiva, se puede hacer solo una vez y no vas a poder cambiar tus predicciones después.
            </p>
            
            <h3 className="font-bold text-lg mt-6 mb-2 border-b dark:border-gray-700 pb-1">Amigos y Duelos ⚔️</h3>
            <p>
              ¡El Prode de Beno es mejor con amigos! Podés buscar a otros usuarios y enviarles <strong>Solicitudes de Amistad</strong>. Una vez que sean amigos y ambos hayan <strong>fijado sus predicciones</strong>, podrán ver sus perfiles y retarse a <strong>Duelos</strong>.
            </p>
            <ul className="list-disc pl-5 space-y-2 text-justify">
              <li>Si ves que un amigo hizo una predicción y vos elegiste un resultado diferente, podés <strong>Retarlo</strong> directamente desde su hoja de predicciones.</li>
              <li>Al enviarle el desafío, la otra persona recibirá una notificación en la sección <strong>"Duelos"</strong> de su perfil y podrá <strong>Aceptar</strong> o <strong>Rechazar</strong>.</li>
              <li>Podés retar a otro jugador por una posición exacta, el desarrollo de un partido, por responder quién avanzará en una llave, ¡o incluso por las posiciones de un <strong>grupo completo</strong>!</li>
              <li><strong>Recompensa:</strong> Cada duelo de posición o partido ganado suma 1 victoria, pero si retás a alguien por un grupo y acertás más resultados, ¡te llevás 3 victorias de una! Por cada 3 victorias de duelo, el sistema te otorga <strong>+1 punto extra</strong> en la tabla general.</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="bg-green-50 dark:bg-green-900/20 border-b dark:border-gray-700 pb-4 transition-colors duration-200">
            <CardTitle className="text-xl flex items-center justify-center gap-2 text-green-900 dark:text-green-400">
              <Trophy className="w-5 h-5" /> Sistema de Puntuación
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6 text-gray-700 dark:text-gray-300">
            <div>
              <h3 className="font-bold text-lg mb-2 border-b dark:border-gray-700 pb-1">Fase de Grupos</h3>
              <ul className="space-y-2">
                <li className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 bg-gray-50 dark:bg-gray-700/50 p-3 rounded transition-colors duration-200">
                  <span className="text-sm sm:text-base">Acertar la posición exacta de un equipo en su grupo</span>
                  <span className="font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-2 py-1 rounded whitespace-nowrap text-center min-w-[100px] self-start sm:self-auto">+1 punto</span>
                </li>
                <li className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 bg-gray-50 dark:bg-gray-700/50 p-3 rounded transition-colors duration-200">
                  <span className="text-sm sm:text-base">Acertar las 4 posiciones exactas de un grupo (Grupo Perfecto)</span>
                  <span className="font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-2 py-1 rounded whitespace-nowrap text-center min-w-[100px] self-start sm:self-auto">+3 puntos</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-2 border-b dark:border-gray-700 pb-1">Partidos Individuales</h3>
              <ul className="space-y-2">
                <li className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 bg-gray-50 dark:bg-gray-700/50 p-3 rounded transition-colors duration-200">
                  <span className="text-sm sm:text-base">Acertar el resultado (Ganador o Empate)</span>
                  <span className="font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-2 py-1 rounded whitespace-nowrap text-center min-w-[100px] self-start sm:self-auto">+1 punto</span>
                </li>
                <li className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 bg-gray-50 dark:bg-gray-700/50 p-3 rounded transition-colors duration-200">
                  <span className="text-sm sm:text-base">Acertar el resultado exacto (Goles de cada equipo)</span>
                  <span className="font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-2 py-1 rounded whitespace-nowrap text-center min-w-[100px] self-start sm:self-auto">+2 puntos</span>
                </li>
              </ul>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 italic">
                Nota: Las predicciones de partidos individuales se pueden modificar y guardar hasta 1 hora antes del inicio de cada partido.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-2 border-b dark:border-gray-700 pb-1">Fase Eliminatoria</h3>
              <ul className="space-y-2">
                <li className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 bg-gray-50 dark:bg-gray-700/50 p-3 rounded transition-colors duration-200">
                  <span className="text-sm sm:text-base">Acertar un equipo que avanza a 16avos de final</span>
                  <span className="font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-2 py-1 rounded whitespace-nowrap text-center min-w-[100px] self-start sm:self-auto">+2 puntos</span>
                </li>
                <li className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 bg-gray-50 dark:bg-gray-700/50 p-3 rounded transition-colors duration-200">
                  <span className="text-sm sm:text-base">Acertar un equipo que avanza a Octavos de final</span>
                  <span className="font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-2 py-1 rounded whitespace-nowrap text-center min-w-[100px] self-start sm:self-auto">+4 puntos</span>
                </li>
                <li className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 bg-gray-50 dark:bg-gray-700/50 p-3 rounded transition-colors duration-200">
                  <span className="text-sm sm:text-base">Acertar un equipo que avanza a Cuartos de final</span>
                  <span className="font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-2 py-1 rounded whitespace-nowrap text-center min-w-[100px] self-start sm:self-auto">+6 puntos</span>
                </li>
                <li className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 bg-gray-50 dark:bg-gray-700/50 p-3 rounded transition-colors duration-200">
                  <span className="text-sm sm:text-base">Acertar un equipo que avanza a Semifinales</span>
                  <span className="font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-2 py-1 rounded whitespace-nowrap text-center min-w-[100px] self-start sm:self-auto">+8 puntos</span>
                </li>
                <li className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 bg-gray-50 dark:bg-gray-700/50 p-3 rounded transition-colors duration-200">
                  <span className="text-sm sm:text-base">Acertar el Campeón del torneo</span>
                  <span className="font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-2 py-1 rounded whitespace-nowrap text-center min-w-[100px] self-start sm:self-auto">+15 puntos</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-2 border-b dark:border-gray-700 pb-1">Preguntas Especiales</h3>
              <ul className="space-y-2">
                <li className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 bg-gray-50 dark:bg-gray-700/50 p-3 rounded transition-colors duration-200">
                  <span className="text-sm sm:text-base">Acertar la respuesta a una pregunta especial</span>
                  <span className="font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-2 py-1 rounded whitespace-nowrap text-center min-w-[100px] self-start sm:self-auto">+10 puntos</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="bg-blue-50 dark:bg-blue-900/20 border-b dark:border-gray-700 pb-4 transition-colors duration-200">
            <CardTitle className="text-xl flex items-center justify-center gap-2 text-blue-900 dark:text-blue-400">
              <AlertCircle className="w-5 h-5" /> Torneos y Ligas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4 text-gray-700 dark:text-gray-300 text-justify">
            <p>
              Además de participar en el Ranking Global contra todos los usuarios de la aplicación, podés crear o unirte a torneos tanto públicos como privados.
            </p>
            <p>
              Andá a la pestaña "Torneos" en el Ranking para ver las ligas disponibles.<br/>
              Podés crear un nuevo torneo e invitar a tus amigos compartiendo el enlace.<br/>
              Adentro de cada torneo vas a ver una tabla de posiciones exclusiva con los miembros de ese grupo.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
