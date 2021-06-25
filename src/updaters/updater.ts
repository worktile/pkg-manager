/**
 * @license
 * Copyright Worktile Inc All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/worktile/pkg-manager/blob/master/LICENSE
 */
export interface VersionUpdater {
    read(filename: string, contents: string): Promise<string>;
    write(filename: string, contents: string, newVersion: string): Promise<void | string>;
}
