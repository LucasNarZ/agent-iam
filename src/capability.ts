export interface ResourceMap {
    git: {
        paths?: string[];
        branches?: string[];
    };
    github: {
        repository?: string;
        pullRequest?: number;
    };
}

export type CapabilityService = keyof ResourceMap;

export type CanonicalCapability<
    Service extends CapabilityService = CapabilityService,
> = {
    [Key in Service]: {
        service: Key;
        action: string;
        canonical: string;
        resources?: ResourceMap[Key];
    };
}[Service];

export function normalizeSegment(value: string): string {
    const segment = value
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "_")
        .replace(/^_+|_+$/g, "");
    return segment || "unknown";
}

export function capability<Service extends CapabilityService>(
    service: Service,
    action: string,
    resource?: string,
): CanonicalCapability<Service> {
    const normalizedAction = normalizeSegment(action);
    const normalizedResource =
        resource === undefined ? undefined : normalizeSegment(resource);
    const canonical = normalizedResource
        ? `${service}.${normalizedResource}.${normalizedAction}`
        : `${service}.${normalizedAction}`;
    return (
        normalizedResource
            ? {
                  service,
                  action: normalizedAction,
                  canonical,
              }
            : { service, action: normalizedAction, canonical }
    ) as CanonicalCapability<Service>;
}
