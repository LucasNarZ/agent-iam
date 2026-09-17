import { CanonicalCapability } from "../capability";

export interface Adapter {
    normalize(
        input: unknown,
    ): CanonicalCapability | Promise<CanonicalCapability>;
}
