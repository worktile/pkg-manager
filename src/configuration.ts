/**
 * @license
 * Copyright Worktile Inc All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/worktile/pkg-manager/blob/master/LICENSE
 */
import { cosmiconfigSync, OptionsSync } from 'cosmiconfig';

const moduleName = 'wpm';
const searchPlaces = [
    'package.json',
    `.${moduleName}rc`,
    `.${moduleName}rc.json`,
    `.${moduleName}rc.yaml`,
    `.${moduleName}rc.yml`,
    `.${moduleName}rc.js`,
    `.${moduleName}rc.cjs`,
    `.${moduleName}rc.mjs`,
    `${moduleName}.config.js`
];

export const getConfiguration = function (options?: OptionsSync, configPath?: string) {
    const exploreSync = cosmiconfigSync(moduleName, options);
    const result = configPath ? exploreSync.load(configPath) : exploreSync.search();

    if (result && !result.isEmpty) {
        if (!result.config || typeof result.config !== 'object') {
            const source = configPath ?? result.filepath ?? searchPlaces.join(',');
            throw Error(`[wpm] Invalid configuration in ${source} provided. Expected an object but found ${typeof result.config}.`);
        }
        return result.config;
    }
    if (configPath) {
        throw Error(`[wpm] Invalid or empty configuration in ${configPath}.`);
    }
    // don't throw error when rc file has not exists.
    return {};
};
