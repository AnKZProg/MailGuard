// Server Actions are callable endpoints: TypeScript types don't survive the
// network, so check what actually arrives before it reaches the database or a
// provider API. Record ids are cuids (25 chars); 64 leaves headroom.
const MAX_ID_LENGTH = 64;
const MAX_QUERY_LENGTH = 200;

export type SenderScope = "ADDRESS" | "DOMAIN";

export function assertId(value: unknown, label = "Identifiant"): asserts value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_ID_LENGTH) {
    throw new Error(`${label} invalide`);
  }
}

export function assertScope(value: unknown): asserts value is SenderScope {
  if (value !== "ADDRESS" && value !== "DOMAIN") throw new Error("Portée inconnue");
}

export function optionalQuery(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string" || value.length > MAX_QUERY_LENGTH) throw new Error("Recherche invalide");
  return value;
}
