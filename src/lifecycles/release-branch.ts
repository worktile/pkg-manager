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
import { defaults } from '../defaults';
import { ValidationError } from '../errors';

export class ReleaseBranchLifecycle extends Lifecycle {
    async run(context: CommandContext): Promise<void> {
        if (context.options.skip?.branch) {
            return;
        }

        const git = context.git;

        const { next } = this.requireVersions(context);
        const targetBranch = context.targetBranch;
        const releaseBranchFormat = context.options.releaseBranchFormat ?? defaults.releaseBranchFormat!;
        const releaseBranch = releaseBranchFormat.replace('{{version}}', next);
        context.releaseBranch = releaseBranch;

        await this.runLifecycleHook('prereleaseBranch', context.options, this.getLifecycleHookParams(context));
        this.logger.info(`creating release branch ${chalk.green(releaseBranch)} from ${targetBranch}`);
        if (!context.options.dryRun) {
            await git.checkoutBranch(releaseBranch, `${targetBranch}`);
        }
        await this.runLifecycleHook('postreleaseBranch', context.options, this.getLifecycleHookParams(context));
    }
}
