/**
 * @license
 * Copyright Worktile Inc All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/worktile/pkg-manager/blob/master/LICENSE
 */

import { Handler } from './handler';
import { CommandOptions } from '../interface';
import { lifecycles } from '../lifecycles';
import { Lifecycle } from '../lifecycles/lifecycle';
import { ValidationError } from '../errors';
import { runLifecycleHook } from '../run-lifecycle-hook';

export class ReleaseHandler extends Handler {
    name = 'release';

    constructor(options: CommandOptions) {
        super(options);
    }

    getLifecycles(): Lifecycle[] {
        return [lifecycles.selectVersion, lifecycles.releaseBranch, lifecycles.bump, lifecycles.push];
    }

    async verify() {
        return true;
    }

    async prepare() {
        this.normalizeBumpFiles();
    }

    private normalizeBumpFiles() {
        // convert code updater
        this.context.options.bumpFiles = this.context.options.bumpFiles.map(item => {
            if (typeof item !== 'string' && item.type === 'code') {
                return {
                    filename: item.filename,
                    updater: require.resolve('../updaters/code-updater')
                };
            } else {
                return item;
            }
        });
    }
}
