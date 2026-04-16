export const toList = <T>(payload: T[] | { results?: T[] }): T[] =>
  Array.isArray(payload) ? payload : payload?.results || [];
