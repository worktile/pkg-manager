export class CommandTerminationError extends Error {
    constructor(public message: string) {
        super();
    }
}
