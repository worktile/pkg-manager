/**
 * @license
 * Copyright Worktile Inc All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/worktile/pkg-manager/blob/master/LICENSE
 */
import { Lifecycle } from './lifecycle';
import { CommandContext } from '../interface';
import chalk from 'chalk';

export class ReleaseBranchLifecycle extends Lifecycle {
    async run(context: CommandContext): Promise<void> {
        if (context.options.skip.branch) {
            return;
        }
        const targetBranch = context.targetBranch;
        const releaseBranch = context.options.releaseBranchFormat.replace('{{version}}', context.versions.next);
        context.releaseBranch = releaseBranch;

        await this.runLifecycleHook('prereleaseBranch', context.options, this.getLifecycleHookParams(context));
        this.logger.info(`creating release branch ${chalk.green(releaseBranch)} from ${targetBranch}`);
        if (!context.options.dryRun) {
            await context.git.checkoutBranch(releaseBranch, `${targetBranch}`);
        }
        await this.runLifecycleHook('postreleaseBranch', context.options, this.getLifecycleHookParams(context));
    }
}
