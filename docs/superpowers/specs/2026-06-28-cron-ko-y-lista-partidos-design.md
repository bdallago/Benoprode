# Diseño — Cron de eliminatorias en vivo + lista de partidos por días/horarios

Fecha: 2026-06-28
Proyectos afectados: **Benoprode** y **Prode Mundial 2026** (mismo cambio, adaptado a cada estructura).

## Objetivo

1. **Trackear los partidos de eliminatoria (KO) en vivo** igual que ya se trackean los
   de fase de grupos: detectar cuándo **arranca** un partido, cuándo **termina** y el
   **ganador**, recalculando puntos y propagando el cuadro.
2. **Ordenar la lista de partidos por días y horarios**, agregando los partidos KO como
   **secciones nuevas por ronda** (sin tocar las 3 fechas de grupos existentes).

No es lógica nueva: es **portar el sistema que ya corre para los partidos individuales**
para que también cubra los de eliminatoria.

## Contexto actual

- Ambos proyectos tienen un cron de resultados gateado por `hasActiveWindow()` sobre
  `matches.json`, que **solo contiene fase de grupos** (72 partidos). Por eso el cron
  **deja de dispararse al terminar los grupos** y los KO no se actualizan en vivo.
- **Benoprode** (`src/app/api/cron/sync-football-api/route.ts`): el cron ya hace el
  pipeline completo — trae fixtures (ayer+hoy), escribe datos live en la colección
  `matches`, detecta `FT/AET/PEN`, escribe `results/actual.matches`, `recalculatePoints`,
  `syncStandings`, `recalculateGlobalStats` y **`syncKnockouts`**. Solo lo bloquea el gate.
- **Prode Mundial 2026** (`app/api/sync-results/route.ts` → `src/lib/sportsApi.ts`
  `syncMatchResults`): hace grupos pero **no** llama a `syncKnockouts`. Está un paso
  atrás del pipeline de Benoprode.
- La fuente de fecha/hora/estado/resultado de los KO es **la API-Football** (dinámico):
  `matches.json` no se toca.
- Lista de partidos (Prode `src/components/Fixture.tsx`): se arma desde `MATCHES` (grupos),
  agrupada en 3 "fechas" por día, ordenada por fecha+hora. Los KO no aparecen.

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Fuente del calendario KO | **Dinámico desde la API** (no hardcodear matches.json) |
| Organización de la lista | **Secciones KO aparte** por ronda; grupos quedan igual |
| Gate del cron | **Cache de kickoffs dinámico** en Firestore |

## Parte A — Tracking en vivo de KO (port del cron)

### A.1 Gate por cache de kickoffs

- En cada corrida, tras traer los fixtures de la API, el cron escribe en Firestore
  (ej. `system_stats/upcoming_kickoffs`) la lista de kickoffs **futuros y recientes**
  de TODOS los fixtures (grupos + KO), con su timestamp.
- `hasActiveWindow()` deja de depender solo de `matches.json`: devuelve `true` si
  `now` cae en la ventana `[kickoff − 5min, kickoff + 210min]` de **cualquier** kickoff
  cacheado (grupos o KO).
- Bootstrap: si el cache está vacío o viejo, el cron hace **una** corrida liviana para
  poblarlo (un fetch), de modo que la fase KO arranque sola sin intervención manual.

Resultado: el mismo cron que ya existe vuelve a estar vivo durante los partidos KO, y su
llamada a `syncKnockouts` (Benoprode ya la tiene) hace el trabajo.

### A.2 Detección arranque / fin / ganador (ya existe, se reutiliza)

- **Arranque / en vivo:** el loop de fixtures ya escribe `statusCode`, `elapsed`,
  `goals_home/away` en la colección `matches` por cada fixture → sirve para grupos y KO
  sin cambios.
- **Fin:** `FINISHED = {FT, AET, PEN}` ya detecta el cierre.
- **Ganador KO + propagación:** `syncKnockouts` deriva el ganador de cada fixture KO
  finalizado y lo propaga por el árbol (`bracketMatchups`), recalculando puntos.

### A.3 Paridad Prode ← Benoprode

- Agregar a `syncMatchResults` (Prode) la llamada a `syncKnockouts()` tras escribir
  resultados y recalcular, replicando el pipeline de Benoprode.
- Aplicar el mismo gate por cache de kickoffs en `hasActiveWindow()` de Prode.

## Parte B — Lista de partidos con secciones KO

- El cron persiste los fixtures KO que ve en la API en una estructura en Firestore
  con `{ ronda, equipoA, equipoB, fecha, hora, estado, golesA, golesB }` (deriva de los
  mismos datos que ya trae; ronda desde `round` de la API mapeado a R32/R16/QF/SF/F).
- La UI de la lista de partidos:
  - **No toca** las 3 fechas de grupos existentes.
  - Agrega **secciones por ronda KO** (16avos, 8vos, 4tos, Semis, Final), cada una
    ordenada por **día y horario**.
  - Cada ronda aparece cuando sus partidos están definidos (equipos conocidos).

## Componentes / archivos a tocar

**Benoprode**
- `src/app/api/cron/sync-football-api/route.ts` — gate por cache de kickoffs; persistir
  fixtures KO para la lista.
- (helper nuevo) lógica de cache de kickoffs reutilizable por el gate.
- Componente de lista de partidos — secciones KO.

**Prode Mundial 2026**
- `src/lib/sportsApi.ts` (`syncMatchResults` / `hasActiveWindow`) — gate por cache;
  llamar `syncKnockouts`; persistir fixtures KO.
- `src/components/Fixture.tsx` — secciones KO por ronda, ordenadas por día/hora.

## Flujo de datos

```
API-Football fixtures (grupos + KO, con fecha/hora/estado/resultado)
   │
   ▼
cron (gate: cache de kickoffs)
   ├─ colección matches: datos live (status, elapsed, score)  → UI live
   ├─ cache upcoming_kickoffs                                  → gate próximas corridas
   ├─ results/actual.matches (FT) → recalculatePoints
   ├─ syncStandings → syncKnockouts (ganador KO + propagación) → bracketMatchups
   └─ fixtures KO persistidos {ronda, equipos, fecha, hora, estado, score} → UI lista
```

## Manejo de errores

- Fallos de la API o de `syncKnockouts` no bloquean la respuesta del cron (patrón
  `allSettled` / try-catch ya usado en Benoprode).
- El cache de kickoffs con bootstrap evita el deadlock "el gate nunca se activa porque
  no hay datos".
- Rate limit existente (máx 1 corrida pesada cada 30s) se mantiene.

## Testing

- Unit: `hasActiveWindow()` con cache (dentro/fuera de ventana; cache vacío → bootstrap).
- Unit: mapeo de `round` de la API → R32/R16/QF/SF/F y armado de secciones ordenadas.
- Dry-run read-only contra prod (patrón de la sesión): verificar que los fixtures KO se
  persisten con fecha/hora/estado correctos y que las secciones quedan ordenadas.

## Fuera de alcance (YAGNI)

- No se agrega un cron separado nuevo: se reutiliza el cron de resultados existente.
- No se hardcodean partidos KO en `matches.json`.
- No se rediseña la vista de grupos.

## Flujo de entrega

Respetar **staging → test → main** en ambos repos (regla del dueño). Verificación
read-only contra prod antes de cualquier escritura.

## Estado de implementación (2026-06-28) — ✅ COMPLETADO

Implementado y en producción (main) en Benoprode y Prode Mundial 2026:
- Parte A (cron por cache de kickoffs + `syncKnockouts` en cada tick activo) — hecho.
  Helper compartido `src/lib/ko-schedule.ts` con tests.
- Parte B (secciones KO por ronda/día/hora en `Fixture.tsx`) — hecho.
- Extra no previsto en el diseño original pero pedido después: orden cronológico de
  los cruces en la pestaña Eliminatorias + badge "+N" de puntos por ronda
  (R32=2, R16=4, QF=6, SF=8, Final=15) + confirmación del lock de 1h.

Commits Benoprode: `e95d505`, `86ccfd5`, `f652f80`, `b881fb8`.
Commits Prode: `cad9a4e`, `ce25412`, `edff3a9`.
