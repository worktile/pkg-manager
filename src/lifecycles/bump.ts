/**
 * @license
 * Copyright Worktile Inc All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/worktile/pkg-manager/blob/master/LICENSE
 */

import { Lifecycle } from './lifecycle';
import { CommandContext } from '../interface';
import standardVersion = require('standard-version');

export class BumpLifecycle extends Lifecycle {
    async run(context: CommandContext): Promise<void> {
        
        this.logger.info(`using standard-version to bumping, outputting changes and commit`);
        await this.runLifecycleHook('prebump', context.options, this.getLifecycleHookParams(context));
        const options: standardVersion.Options = Object.assign({}, context.options, {
            releaseAs: context.versions.next
        }) as standardVersion.Options;
        Object.assign(options.skip, context.options.skip, {
            tag: true
        });
        // 1. bump version
        // 2. generate changelog
        // 3. git commit
        await standardVersion(options);
        await this.runLifecycleHook('postbump', context.options, this.getLifecycleHookParams(context));
    }
}
