import type { CanonicalCapability, CapabilityService } from "../capability.js";

export interface Adapter<Service extends CapabilityService> {
    normalize(
        args: string[],
        env?: NodeJS.ProcessEnv,
    ): CanonicalCapability<Service> | Promise<CanonicalCapability<Service>>;
}
