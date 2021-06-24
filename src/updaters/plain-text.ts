import { VersionUpdater } from './updater';

export class PlainTextUpdater implements VersionUpdater {
    async read(filename: string, contents: string): Promise<string> {
        return contents;
    }

    async write(filename: string, contents: string, newVersion: string): Promise<void | string> {
        return newVersion;
    }
}
