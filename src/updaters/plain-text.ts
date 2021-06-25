/**
 * @license
 * Copyright Worktile Inc All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/worktile/pkg-manager/blob/master/LICENSE
 */

import { VersionUpdater } from './updater';

export class PlainTextUpdater implements VersionUpdater {
    async read(filename: string, contents: string): Promise<string> {
        return contents;
    }

    async write(filename: string, contents: string, newVersion: string): Promise<void | string> {
        return newVersion;
    }
}
