export interface CanonicalCapability {
  service: "git" | "github";
  resource?: string;
  action: string;
  canonical: string;
}

export function normalizeSegment(value: string): string {
  const segment = value.toLowerCase().replace(/[^a-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "");
  return segment || "unknown";
}

export function capability(service: CanonicalCapability["service"], action: string, resource?: string): CanonicalCapability {
  const normalizedAction = normalizeSegment(action);
  const normalizedResource = resource === undefined ? undefined : normalizeSegment(resource);
  const canonical = normalizedResource ? `${service}.${normalizedResource}.${normalizedAction}` : `${service}.${normalizedAction}`;
  return normalizedResource
    ? { service, resource: normalizedResource, action: normalizedAction, canonical }
    : { service, action: normalizedAction, canonical };
}
