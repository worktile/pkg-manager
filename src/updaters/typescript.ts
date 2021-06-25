/**
 * @license
 * Copyright Worktile Inc All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/worktile/pkg-manager/blob/master/LICENSE
 */

import { VersionUpdater } from './updater';

// 正则标识
// 数字，禁止纯数字补 0
const NUMERIC_IDENTIFIER = '0|[1-9]\\d*';
const BUILD_IDENTIFIER = `[0-9A-Za-z-]+`;
// 数字和字母组合，达到禁止纯数字补0的目的
const NON_NUMERIC_IDENTIFIER = '\\d*[a-zA-Z-][a-zA-Z0-9-]*';
const MAIN_VERSION_IDENTIFIER = `(${NUMERIC_IDENTIFIER})\\.(${NUMERIC_IDENTIFIER})\\.(${NUMERIC_IDENTIFIER})`;
// 先行版本号，由 ASCII 码的英数字和连接号 [0-9A-Za-z-] 组成，
// 且 “禁止 MUST NOT” 留白。数字型的标识符号 “ 禁止 MUST NOT ”在前方补零
const PRERELEASE_IDENTIFIER = `(?:${NUMERIC_IDENTIFIER}|${NON_NUMERIC_IDENTIFIER})`;
const PRERELEASE = `(?:\\-(${PRERELEASE_IDENTIFIER}(?:\\.${PRERELEASE_IDENTIFIER})*))`;
// 编译版本号
const BUILD = `(?:\\+(${BUILD_IDENTIFIER}(?:\\.${BUILD_IDENTIFIER})*))`;
const FULL_VERSION_IDENTIFIER = `^${MAIN_VERSION_IDENTIFIER}${PRERELEASE}?${BUILD}?$`;
const REGEX_FULL_VERSION = new RegExp(FULL_VERSION_IDENTIFIER);

export class TypeScriptUpdater implements VersionUpdater {
    async read(filename: string, contents: string): Promise<string> {
        const matches = contents.match(REGEX_FULL_VERSION);
        if (matches) {
            return matches[0];
        } else {
            return '';
        }
    }

    async write(filename: string, contents: string, newVersion: string): Promise<void | string> {
        const matches = contents.match(REGEX_FULL_VERSION);
        if (matches) {
            return contents.replace(matches[0], newVersion);
        } else {
            return contents;
        }
    }
}
