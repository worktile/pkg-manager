/**
 * @license
 * Copyright Worktile Inc All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/worktile/pkg-manager/blob/master/LICENSE
 */
import { CommandContext, CommandOptions } from '../interface';
import { logger } from '../logger';
import { runLifecycleHook, LifecycleHookParams } from '../run-lifecycle-hook';

export abstract class Lifecycle {
    logger = logger;
    abstract run(context: CommandContext): Promise<void>;

    protected async runLifecycleHook(name: string, options: CommandOptions, params?: LifecycleHookParams) {
        await runLifecycleHook(name, options, params);
    }

    protected getLifecycleHookParams(context: CommandContext) {
        return {
            version: context.versions.next
        };
    }
}
