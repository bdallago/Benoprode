// Centralized tournament dates — change only here
export const GROUP_STAGE_DEADLINE = new Date('2026-06-11T00:00:00-03:00').getTime();
export const EARLY_LOCK_DEADLINE = new Date('2026-06-01T00:00:00-03:00').getTime();
export const CHAT_OPEN_TIMESTAMP = new Date('2026-06-11T19:00:00.000Z').getTime();
// ISO string for date comparisons (avoids creating Date objects at import time)
export const EARLY_LOCK_DEADLINE_ISO = '2026-06-01T00:00:00Z';
// How long before a match starts predictions are locked (must match firestore.rules isMatchOpen)
export const MATCH_LOCK_BUFFER_MS = 60 * 60 * 1000;
