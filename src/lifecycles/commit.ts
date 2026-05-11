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
import path from 'path';

export class CommitLifecycle extends Lifecycle {
    nextVersion!: string;

    readonly defaultInfile = defaults.infile;

    packages: Package[] = [];

    async run(context: CommandContext): Promise<void> {
        if (context.options.skip?.commit || context.options?.packages?.length === 0) {
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

        const projectRoot = options.cwd || process.cwd();
        const allFiles = this.collectCommitFiles(this.packages, projectRoot, options);
        const commitMessage = this.buildCommitMessage(options, this.nextVersion);

        this.logger.info(`Committing ${allFiles.size} files with message: ${chalk.green(commitMessage)}`);
        if (options.dryRun) {
            this.logger.info(`[dry-run] git commit -m "${commitMessage}"`);
            return;
        }

        if (!git) throw new Error('Git context is not available');
        await git.add(Array.from(allFiles));
        await git.commit(commitMessage);
    }

    private collectCommitFiles(packages: Package[], projectRoot: string, options: any): Set<string> {
        const files = new Set<string>();
        for (const pkg of packages) {
            const pkgPath = this.resolveFilePath(pkg.path, projectRoot);
            if (pkg.infile !== '') {
                files.add(this.resolveFilePath((pkg.infile || this.defaultInfile) as string, pkgPath));
            }
            for (const file of pkg.bumpFiles || options.bumpFiles || []) {
                files.add(this.resolveFilePath(typeof file === 'string' ? file : file.filename, pkgPath));
            }
        }
        files.add(this.resolveFilePath(options.infile || this.defaultInfile, projectRoot));
        return files;
    }

    private resolveFilePath(file: string, basePath: string): string {
        return path.isAbsolute(file) ? file : path.resolve(basePath, file);
    }

    private buildCommitMessage(options: any, nextVersion: string): string {
        const format = options.releaseCommitMessageFormat || defaults.releaseCommitMessageFormat;
        return format.replace(/\{\{currentTag\}\}/g, nextVersion);
    }
}
