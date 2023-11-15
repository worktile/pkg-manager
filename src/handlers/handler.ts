/**
 * @license
 * Copyright Worktile Inc All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/worktile/pkg-manager/blob/master/LICENSE
 */
import { CommandOptions, CommandContext } from '../interface';
import { Lifecycle } from '../lifecycles/lifecycle';
import { ValidationError, CommandTerminationError } from '../errors';
import { runLifecycleHook } from '../run-lifecycle-hook';
import inquirer from 'inquirer';
import chalk from 'chalk';
import minimatch from 'minimatch';
import { logger } from '../logger';
import { createSimpleGit, readPackageJson } from '../utils';
import { coerceArray } from '../coercion/array';

export abstract class Handler {
    protected context: CommandContext;

    abstract name: string;

    abstract getLifecycles(): Lifecycle[];

    abstract verify(): Promise<boolean>;

    abstract prepare(): Promise<void>;

    constructor(protected options: CommandOptions) {}

    public async start() {
        try {
            await this.prepareContext();
            await this.prepare();
            const success = await this.verify();
            if (!success) {
                return;
            }
            await runLifecycleHook(`pre${this.name}`, this.context.options);
            const lifecycles = this.getLifecycles();
            let cap: Lifecycle = null;
            let index = 0;
            while ((cap = lifecycles[index++])) {
                await cap.run(this.context);
            }
            await runLifecycleHook(`post${this.name}`, this.context.options);
        } catch (error) {
            if (error instanceof CommandTerminationError) {
                logger.warn(error.message);
            } else if (error instanceof ValidationError) {
                logger.warn(`[${error.prefix}] ${error.message}`);
            } else {
                logger.error(`${error.message}, stack: ${error.stack}`);
            }
            process.exit(1);
        }
    }

    protected async prepareContext() {
        const git = createSimpleGit(this.options.cwd || process.cwd());
        const gitStatus = await git.status();
        const allowBranches = coerceArray(this.options.allowBranch);

        let targetBranch: string;
        if (this.options.skip?.confirm) {
            if (this.matchAllowBranch(gitStatus.current, allowBranches)) {
                targetBranch = gitStatus.current;
            } else {
                logger.warn(
                    `Command ${this.name} not allowed in current branch ${chalk.blue(gitStatus.current)}, please checkout to ${chalk.green(
                        allowBranches.join(' ')
                    )}`
                );
            }
        } else {
            if (this.matchAllowBranch(gitStatus.current, allowBranches)) {
                const message = `You will ${this.name} ${chalk.green(gitStatus.current)} branch, allow ${this.name} branches: ${chalk.blue(
                    allowBranches.join(' ')
                )}. \n Do you want to continue?`;
                const { confirm } = await inquirer.prompt({
                    name: 'confirm',
                    type: 'confirm',
                    message,
                    default: true
                });
                if (confirm) {
                    targetBranch = gitStatus.current;
                } else {
                    const allBranches = await git.branchLocal();
                    targetBranch = await this.selectBranchFromPrompt(allBranches.all, allowBranches);
                }
            } else {
                logger.warn(
                    `Command ${this.name} not allowed in current branch ${chalk.blue(gitStatus.current)}, please checkout to ${chalk.green(
                        allowBranches.join(' ')
                    )}`
                );
                const allBranches = await git.branchLocal();
                targetBranch = await this.selectBranchFromPrompt(allBranches.all, allowBranches);
            }
        }

        if (!targetBranch) {
            throw new ValidationError('E_NO_TARGET_BRANCH', `target-branch is empty`);
        }

        if (gitStatus.current !== targetBranch) {
            // switch to default branch when current is not eq default branch
            logger.info(`git checkout to branch ${chalk.green(targetBranch)}...`);
            if (!this.options.dryRun) {
                await git.checkout(targetBranch);
            }
        }

        // pull
        logger.info(`git pulling branch ${chalk.green(targetBranch)}...`);
        if (!this.options.dryRun) {
            await git.pull(targetBranch);
        }

        const pkg = readPackageJson();
        this.context = {
            options: this.options,
            versions: {
                current: pkg.version
            },
            git: git,
            currentBranch: gitStatus.current,
            targetBranch: targetBranch
        };
    }

    private matchAllowBranch(branch: string, allowBranch: string[]) {
        if (!branch) {
            return false;
        }
        return !!allowBranch.find((name) => {
            return minimatch(branch, name);
        });
    }

    private async selectBranchFromPrompt(allBranches: string[], allowBranches: string[]): Promise<string> {
        const branches = allBranches
            .filter((branch) => {
                return this.matchAllowBranch(branch, allowBranches);
            })
            .map((branch: string) => {
                return {
                    name: `${branch}`,
                    value: branch
                };
            });
        const questions = [
            {
                name: 'targetBranch',
                type: 'list',
                message: `What do you want ${this.name} as branch?`,
                choices: [...branches]
            }
        ];

        const { targetBranch } = await inquirer.prompt(questions);

        if (targetBranch) {
            return targetBranch;
        } else {
            throw new ValidationError('E_NO_TARGET_BRANCH', `target-branch is empty`);
        }
    }
}
