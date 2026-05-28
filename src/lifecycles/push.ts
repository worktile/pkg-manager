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
import { buildGitProviderFromRemote } from '../git-publish/git-provider';
import { ValidationError } from '../errors';

export class PushLifecycle extends Lifecycle {
    async run(context: CommandContext): Promise<void> {
        if (context.options.skip?.push) {
            return;
        }

        const git = context.git;

        const remote = 'origin';
        const branch = context.releaseBranch || context.currentBranch;
        this.logger.info(`pushing ${chalk.green(branch)} to remote ${chalk.green(remote)}`);

        if (!context.options.dryRun && branch) {
            git.outputHandler((command, stdout, stderr) => {
                stdout.pipe(process.stdout);
                stderr.pipe(process.stderr);
            });
            await git.push(remote, branch);

            // prompt to create PR based correct branch
            const remoteUrl = (await git.remote(['get-url', remote, '--push'])) as string;
            const gitProvider = buildGitProviderFromRemote(remoteUrl);
            const baseBranch = context.currentBranch;
            if (gitProvider?.createPRUrl && baseBranch) {
                const createPRUrl = gitProvider.createPRUrl(baseBranch, branch);
                this.logger.info(`Create a pull request: ${createPRUrl}`);
            }
        }
    }
}
