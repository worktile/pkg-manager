export class ValidationError extends Error {
    prefix: string;
    constructor(prefix: string, message: string) {
        super(message);
        this.name = 'ValidationError';
        this.prefix = prefix;
    }
}
