export class AdapterNotFoundError extends Error {
    constructor(public readonly toolName: string) {
        super(`Adapter not found: ${toolName}`);
        this.name = "AdapterNotFoundError";
    }
}
