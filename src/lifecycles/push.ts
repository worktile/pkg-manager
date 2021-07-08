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

export class PushLifecycle extends Lifecycle {
    async run(context: CommandContext): Promise<void> {
        if (context.options.skip.push) {
            return;
        }
        const branch = context.releaseBranch || context.currentBranch;
        this.logger.info(`pushing ${chalk.green(branch)} to remote`);
        if (!context.options.dryRun && branch) {
            context.git.outputHandler((command, stdout, stderr) => {
                stdout.pipe(process.stdout);
                stderr.pipe(process.stderr);
            });
            await context.git.push('origin', branch);
        }
    }
}
