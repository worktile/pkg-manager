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
import { logger } from '../logger';

export class ReleaseHandler extends Handler {
    logger = logger;
    name = 'release';

    constructor(options: CommandOptions) {
        super(options);
    }

    getLifecycles(): Lifecycle[] {
        return [
            lifecycles.selectVersion,
            lifecycles.releaseBranch,
            lifecycles.bump,
            lifecycles.changelog,
            lifecycles.commit,
            lifecycles.push
        ];
    }

    async verify() {
        return true;
    }

    async prepare() {
        this.normalizeBumpFiles();
        this.normalizePackages();
    }

    private normalizeBumpFiles() {
        if (!this.context.options.bumpFiles) {
            return;
        }
        this.context.options.bumpFiles = this.context.options.bumpFiles.map((item) => {
            if (typeof item !== 'string' && item.type === 'code') {
                return {
                    filename: item.filename,
                    updater: require.resolve('../updaters/code-updater')
                };
            } else {
                return item;
            }
        });
        this.logger.info(`Bump files: ${this.context.options.bumpFiles}`);
    }

    private normalizePackages() {
        const { packages } = this.context.options;
        if (!packages || !Array.isArray(packages)) {
            return;
        }
        this.context.options.packages = packages.map((pkg) => {
            if (typeof pkg === 'string') {
                return { path: pkg };
            }
            if (pkg.bumpFiles) {
                pkg.bumpFiles = pkg.bumpFiles.map((item) => {
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
            return pkg;
        });
    }
}
