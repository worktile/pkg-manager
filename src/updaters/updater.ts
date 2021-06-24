export interface VersionUpdater {
    read(filename: string, contents: string): Promise<string>;
    write(filename: string, contents: string, newVersion: string): Promise<void | string>;
}
