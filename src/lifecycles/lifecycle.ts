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
import { ValidationError } from '../errors';

export abstract class Lifecycle {
    logger = logger;
    abstract run(context: CommandContext): Promise<void>;

    protected async runLifecycleHook(name: string, options: CommandOptions, params?: LifecycleHookParams) {
        await runLifecycleHook(name, options, params);
    }

    protected requireVersions(context: CommandContext): { current: string; next: string } {
        const { versions } = context;
        if (!versions?.current || !versions?.next) {
            throw new ValidationError('E_VERSIONS', 'current and next version are required');
        }
        return { current: versions.current, next: versions.next };
    }

    protected getLifecycleHookParams(context: CommandContext): LifecycleHookParams {
        return { version: this.requireVersions(context).next };
    }
}
