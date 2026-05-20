/**
 * @license
 * Copyright Worktile Inc All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/worktile/pkg-manager/blob/master/LICENSE
 */
import { Lifecycle } from './lifecycle';
import { CommandContext, Package } from '../interface';
import chalk from 'chalk';
import { defaults } from '../defaults';
import { resolveFilePath } from '../utils';
import fs from 'fs';

export class CommitLifecycle extends Lifecycle {
    nextVersion!: string;

    readonly defaultInfile = defaults.infile;

    packages: Package[] = [];

    async run(context: CommandContext): Promise<void> {
        if (context.options.skip?.commit) {
            return;
        }

        await this.runLifecycleHook('precommit', context.options, this.getLifecycleHookParams(context));

        this.nextVersion = context.versions.next;
        this.packages = context.options?.packages || [];

        await this.commitChanges(context);

        await this.runLifecycleHook('postcommit', context.options, this.getLifecycleHookParams(context));
    }

    private async commitChanges(context: CommandContext): Promise<void> {
        const { options, git } = context;

        if (!git) {
            throw new Error('Git context is not available');
        }

        const projectRoot = options.cwd || process.cwd();

        const allFiles = this.collectCommitFiles(this.packages, projectRoot, options, context);

        const commitMessage = this.buildCommitMessage(options, this.nextVersion);

        this.logger.info(`Committing ${allFiles.size} files with message: ${chalk.green(commitMessage)}`);

        if (options.dryRun) {
            this.logger.info(`[dry-run] git add ${Array.from(allFiles).join(' ')}`);

            this.logger.info(`[dry-run] git commit -m "${commitMessage}"`);

            return;
        }

        await git.add(Array.from(allFiles));
        await git.commit(commitMessage);
    }

    /**
     * 收集所有需要 commit 的文件：root infile, root bumpFiles, package infile, package bumpFiles
     */
    private collectCommitFiles(packages: Package[], projectRoot: string, options: any, context: CommandContext): Set<string> {
        const files = new Set<string>();

        const addFileIfExists = (filePath: string) => {
            if (fs.existsSync(filePath)) {
                files.add(filePath);
            } else {
                this.logger.warn(chalk.yellow(`Skip (file not found): ${filePath}`));
            }
        };

        // 1. root infile
        if (options.infile !== '') {
            addFileIfExists(resolveFilePath(options.infile || this.defaultInfile, projectRoot));
        }

        // 2. root bumpFiles
        for (const file of options.bumpFiles || []) {
            addFileIfExists(resolveFilePath(typeof file === 'string' ? file : file.filename, projectRoot));
        }

        if (this.packages?.length) {
            for (const pkg of packages) {
                const pkgPath = resolveFilePath(pkg.path, projectRoot);

                // 3. package infile
                if (pkg.infile !== '') {
                    addFileIfExists(resolveFilePath(pkg.infile || (this.defaultInfile as string), pkgPath));
                }

                // 4. package bumpFiles
                for (const file of pkg.bumpFiles || options.bumpFiles || []) {
                    addFileIfExists(resolveFilePath(typeof file === 'string' ? file : file.filename, pkgPath));
                }
            }
        }

        for (const file of context.extraCommitFiles || []) {
            addFileIfExists(file);
        }

        return files;
    }

    private buildCommitMessage(options: any, nextVersion: string): string {
        const format = options.releaseCommitMessageFormat || defaults.releaseCommitMessageFormat;

        return format.replace(/\{\{currentTag\}\}/g, nextVersion);
    }
}
