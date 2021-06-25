/**
 * @license
 * Copyright Worktile Inc All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/worktile/pkg-manager/blob/master/LICENSE
 */

import { VersionUpdater } from './updater';
import writeJsonFile from 'write-json-file';

export class JsonUpdater implements VersionUpdater {
    async read(filename: string, contents: string): Promise<string> {
        return JSON.parse(contents).version;
    }

    async write(filename: string, contents: string, newVersion: string): Promise<void> {
        const data = JSON.parse(contents);
        data.version = newVersion;
        await writeJsonFile(filename, data, {
            detectIndent: true,
            indent: 2
        });
    }
}
