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
import { minimatch } from 'minimatch';
import { logger } from '../logger';
import { createSimpleGit, readPackageJson } from '../utils';
import { coerceArray } from '../coercion/array';
import { defaults } from '../defaults';

export abstract class Handler {
    protected context!: CommandContext;

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
            for (const lifecycle of this.getLifecycles()) {
                await lifecycle.run(this.context);
            }
            await runLifecycleHook(`post${this.name}`, this.context.options);
        } catch (error: unknown) {
            if (error instanceof CommandTerminationError) {
                logger.warn(error.message);
            } else if (error instanceof ValidationError) {
                logger.warn(`[${error.prefix}] ${error.message}`);
            } else if (error instanceof Error) {
                logger.error(`${error.message}, stack: ${error.stack}`);
            } else {
                logger.error(error as Error);
            }
            process.exit(1);
        }
    }

    protected async prepareContext() {
        const git = createSimpleGit(this.options.cwd || process.cwd());
        const gitStatus = await git.status();
        const allowBranches = coerceArray(this.options.allowBranch ?? defaults.allowBranch!);

        let targetBranch: string | undefined;
        const currentBranch = gitStatus.current;

        if (this.options.skip?.confirm) {
            if (this.matchAllowBranch(currentBranch, allowBranches)) {
                targetBranch = currentBranch ?? undefined;
            } else {
                logger.warn(
                    `Command ${this.name} not allowed in current branch ${chalk.blue(currentBranch)}, please checkout to ${chalk.green(
                        allowBranches.join(' ')
                    )}`
                );
            }
        } else {
            if (this.matchAllowBranch(currentBranch, allowBranches)) {
                const message = `You will ${this.name} ${chalk.green(currentBranch)} branch, allow ${this.name} branches: ${chalk.blue(
                    allowBranches.join(' ')
                )}. \n Do you want to continue?`;
                const { confirm } = await inquirer.prompt({
                    name: 'confirm',
                    type: 'confirm',
                    message,
                    default: true
                });
                if (confirm) {
                    targetBranch = currentBranch ?? undefined;
                } else {
                    const allBranches = await git.branchLocal();
                    targetBranch = await this.selectBranchFromPrompt(allBranches.all, allowBranches);
                }
            } else {
                logger.warn(
                    `Command ${this.name} not allowed in current branch ${chalk.blue(currentBranch)}, please checkout to ${chalk.green(
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

        if (currentBranch !== targetBranch) {
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

        const pkg = readPackageJson(this.options.packageJsonPath);
        this.context = {
            options: this.options,
            versions: {
                current: pkg.version
            },
            git: git,
            currentBranch: currentBranch ?? undefined,
            targetBranch: targetBranch
        };
    }

    private matchAllowBranch(branch: string | null | undefined, allowBranch: string[]) {
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
