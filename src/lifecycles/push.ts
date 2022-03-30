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

        const remote = 'origin';
        const branch = context.releaseBranch || context.currentBranch;
        this.logger.info(`pushing ${chalk.green(branch)} to remote ${chalk.green(remote)}`);

        if (!context.options.dryRun && branch) {
            context.git.outputHandler((command, stdout, stderr) => {
                stdout.pipe(process.stdout);
                stderr.pipe(process.stderr);
            });
            await context.git.push(remote, branch);

            // prompt to create PR based correct branch
            const remoteUrl = await context.git.remote(['get-url', remote, '--push']) as string;
            const githubHostname = 'github.com';
            if (remoteUrl.includes(githubHostname)) {
                const repoHttpsUrl = `https://${githubHostname}/${remoteUrl.slice(remoteUrl.indexOf(githubHostname) + githubHostname.length + 1, remoteUrl.lastIndexOf('.git'))}`;
                const createPRUrl = `${repoHttpsUrl}/pull/new/${context.currentBranch}..${branch}`;
                this.logger.info(`Create a pull request: ${createPRUrl}`);
            }
        }
    }
}
