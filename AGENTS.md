# Cuidado de Recursos y Rendimiento
1. PROHIBIDO usar las herramientas `compile_applet` y `lint_applet` a menos que te lo pida explícitamente.
2. Ediciones quirúrgicas: Realizá únicamente los cambios estrictamente necesarios usando `edit_file` o `multi_edit_file`. No hagas revisiones profundas de todo el sistema por ti mismo.
3. Velocidad: Confiemos en el Hot-Reload (Preview). Hacé tu cambio y terminá el turno, sin hacer verificaciones extras pesadas en segundo plano.
4. **Prevención de Out of Memory (OOM) y Timeout en Serverless/Client:** NUNCA usar `getDocs(collection(...))` para descargar colecciones enteras. Para contadores, usar EXCLUSIVAMENTE `getCountFromServer()`. Para listas infinitas, usar SIEMPRE paginación con `limit()`. Si es estrictamente necesario iterar masivamente (ej: calcular puntos), usar paginación por bloques (chunks de 50 o 100 documentos combinando `limit` con cursores `startAfter`) para liberar memoria en cada ciclo.

# Reglas de Comunicación
1. Solo responder estrictamente a lo que el usuario pregunta.
2. No repetir resúmenes de acciones pasadas a menos que sea necesario para la explicación técnica del problema actual.
3. No buscar contexto en mensajes anteriores a menos que el usuario lo indique explícitamente.

# Contexto Permanente: El Prode de Beno
El asistente DEBE recordar siempre que "El Prode de Beno" es un juego para el Mundial 2026 con las siguientes características implementadas:
1. **Core:** Predicción de partidos fase de grupos y eliminatorias.
2. **Puntuación:** 3 pts resultado exacto, 1 pt empatar/ganador. Puntos extra por posiciones de fase de grupos y equipos que avanzan (Semis, etc.) y preguntas extras.
3. **Social:** Tiene "Ligas con amigos" (privadas, con código), y "Duelos 1v1" (desafíos directos a otros perfiles).
4. **Gamificación:** Sistema de Logros/Trofeos (ej: "Constante", "Fiel", "La hora juez", "Jugar mal fue parte de la estrategia"). Leaderboard Global y por Ligas.
5. **Idioma:** Tonada y jerga Argentina (vos, che, prode, etc).

# Metodología "Cirujano" (Reglas Críticas de Estabilidad)
1. **Un Cambio Lógico = Un Prompt:** Prohibido armar planes maestros que modifiquen múltiples flujos a la vez. Hacer un cambio atómico y esperar a que el usuario valide en la vista previa.
2. **No borrar hasta validar (Deprecation segura):** Jamás eliminar APIs o componentes de raíz si primero no se ha adaptado el cliente a la nueva versión y el usuario ha validado que funciona correctamente. No quemar puentes.
3. **Micro-Auditorías de Compilación:** En cada archivo tocado, se DEBEN revisar los `imports` y las declaraciones de variables. Las colisiones u omisiones aquí son la mayor causa de caída del sistema.
