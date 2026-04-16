/**
 * Normalizes API list payloads that may be returned as a raw array or `{ results: [] }`.
 */
export const toList = <T>(payload: T[] | { results?: T[] }): T[] =>
  Array.isArray(payload) ? payload : payload?.results || [];
