import { readFileSync } from 'fs';
import path from 'path';
import simpleGit, { SimpleGit } from 'simple-git/promise';
import _writeJsonFile from 'write-json-file';

export function readJsonFile(filePath: string): any {
    const contents = readFileSync(filePath, 'utf8');
    return JSON.parse(contents);
}

export function readPackageJson(): {
    version: string;
    name: string;
} {
    return readJsonFile(path.resolve(process.cwd(), './package.json')) as {
        version: string;
        name: string;
    };
}

export async function writeJsonFile<T>(filename: string, data: T) {
    await _writeJsonFile(filename, data, {
        detectIndent: true,
        indent: 2
    });
}

export function commaSeparatedList(value: string) {
    return value.split(',');
}

export function createSimpleGit(workspace: string = process.cwd()): SimpleGit {
    return simpleGit.call(simpleGit, workspace);
}
