/**
 * @license
 * Copyright Worktile Inc All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/worktile/pkg-manager/blob/master/LICENSE
 */

import { Lifecycle } from './lifecycle';
import { CommandContext } from '../interface';
import standardVersion from 'commit-and-tag-version';
import chalk from 'chalk';
import conventionalChangelog from 'conventional-changelog';
import * as fs from 'fs';

export class BumpLifecycle extends Lifecycle {
    currentVersion: string;

    nextVersion: string;
    async run(context: CommandContext): Promise<void> {
        await this.runLifecycleHook('prebump', context.options, this.getLifecycleHookParams(context));

        this.currentVersion = context.versions.current;
        this.nextVersion = context.versions.next;

        const { packages } = context.options;

        if (packages && packages.length > 0) {
            await this.runMultiPackageBump(context);
        } else {
            await this.runSinglePackageBump(context);
        }

        await this.runLifecycleHook('postbump', context.options, this.getLifecycleHookParams(context));
    }

    /**
     * Bump version for single package (原有逻辑)
     */
    private async runSinglePackageBump(context: CommandContext): Promise<void> {
        this.logger.info(`using commit-and-tag-version to bumping, outputting changes and commit`);
        const options: standardVersion.Options = Object.assign({}, context.options, {
            releaseAs: context.versions.next
        }) as standardVersion.Options;
        Object.assign(options.skip, context.options.skip, {
            tag: true
        });
        // 1. bump version
        // 2. generate changelog
        // 3. git commit
        await standardVersion(options);
    }

    /**
     * Bump version for multiple packages (monorepo)
     */
    private async runMultiPackageBump(context: CommandContext): Promise<void> {
        this.logger.info(`using commit-and-tag-version to bumping for multiple packages`);

        const { packages } = context.options;
        const baseOptions = context.options;
        const projectRoot = baseOptions.cwd || process.cwd();

        for (const pkg of packages) {
            this.logger.info(`Processing package: ${chalk.green(pkg.path)}`);

            const pkgPath = pkg.path.startsWith('/') ? pkg.path : `${projectRoot}/${pkg.path}`;

            const infilePath = pkg.infile
                ? pkg.infile.startsWith('/')
                    ? pkg.infile
                    : `${pkgPath}/${pkg.infile}`
                : `${pkgPath}/CHANGELOG.md`;

            const bumpFiles = pkg.bumpFiles
                ? pkg.bumpFiles.map((file) =>
                      typeof file === 'string'
                          ? file.startsWith('/')
                              ? file
                              : `${pkgPath}/${file}`
                          : { ...file, filename: file.filename.startsWith('/') ? file.filename : `${pkgPath}/${file.filename}` }
                  )
                : baseOptions.bumpFiles?.map((file) =>
                      typeof file === 'string' ? `${pkgPath}/${file}` : { ...file, filename: `${pkgPath}/${file.filename}` }
                  );

            const options: standardVersion.Options = Object.assign({}, baseOptions, {
                releaseAs: context.versions.next,
                cwd: projectRoot,
                bumpFiles: bumpFiles,
                infile: infilePath,
                path: pkg.path,
                releaseCount: 1,
                outputUnreleased: false,
                skip: {
                    ...baseOptions.skip,
                    tag: true,
                    commit: true,
                    changelog: true
                }
            }) as standardVersion.Options;

            await standardVersion(options);

            await this.generateChangelogForPackage(options, pkg.path, pkg.infile, pkgPath);
        }

        await this.commitAllChanges(context);
    }

    private async generateChangelogForPackage(
        options: standardVersion.Options,
        pkgPath: string,
        infile: string | undefined,
        fullPkgPath: string
    ): Promise<void> {
        const infilePath = infile ? (infile.startsWith('/') ? infile : `${fullPkgPath}/${infile}`) : `${fullPkgPath}/CHANGELOG.md`;

        this.logger.info(`Generating changelog for ${pkgPath}: ${this.currentVersion} -> ${this.nextVersion}`);

        const gitOptions: { merges: null; path: string; showSignature: boolean; from?: string } = {
            merges: null,
            path: pkgPath,
            showSignature: false
        };

        const commitWithVersion = await this.findCommitWithVersion(this.currentVersion, pkgPath, options.cwd);
        if (commitWithVersion) {
            gitOptions.from = commitWithVersion;
            this.logger.info(`Found commit ${commitWithVersion} with version ${this.currentVersion}`);
        } else {
            this.logger.info(`No commit found with version ${this.currentVersion}, generating from all commits`);
        }

        const changelogStream = conventionalChangelog(
            {
                preset: 'angular',
                releaseCount: 1,
                outputUnreleased: true,
                tagPrefix: ''
            },
            { version: this.nextVersion },
            {
                ...gitOptions,
                from: '9e52c569bf3924d8c883459056edb9e9ccbcf61f',
                // from: gitOptions.from || undefined,
                to: 'HEAD',
                merges: null,
                showSignature: false
            }
        );

        const generated = await this.streamToString(changelogStream);
        if (!generated.trim()) {
            this.logger.warn(`No changelog content generated for ${pkgPath}`);
        }

        this.logger.info(`generateChangelogForPackage generated`, generated);

        const finalContent = this.mergeChangelog(infilePath, generated);

        fs.writeFileSync(infilePath, finalContent);
    }

    /**
     * changelog 插到顶部
     */
    private mergeChangelog(changelogPath: string, generated: string): string {
        const header = '# Changelog\n\n' + 'All notable changes to this project will be documented in this file.\n\n';

        if (!fs.existsSync(changelogPath)) {
            return header + generated;
        }

        const old = fs.readFileSync(changelogPath, 'utf-8');

        if (old.startsWith(header)) {
            return header + generated + '\n' + old.substring(header.length);
        } else {
            return header + generated + '\n' + old;
        }
    }

    /**
     * Convert stream to string
     */
    private streamToString(stream: any) {
        return new Promise<string>((resolve, reject) => {
            let data = '';

            stream.on('data', (chunk: any) => (data += chunk));

            stream.on('end', () => resolve(data));

            stream.on('error', reject);
        });
    }

    /**
     * Find commit with version 
     * 找上一个发版 commit 的 hash
     */
    private async findCommitWithVersion(version: string | undefined, pkgPath: string, cwd?: string): Promise<string | undefined> {
        if (!version) return undefined;

        const { exec } = require('child_process');
        return new Promise((resolve) => {
            exec(
                `git log --grep="${version}" --grep="release" --all-match --pretty=format:"%H" -- "${pkgPath}"`,
                { cwd: cwd || process.cwd() },
                (error: Error | null, stdout: string) => {
                    if (error) {
                        resolve(undefined);
                        return;
                    }
                    const lines = stdout.trim().split('\n');
                    if (lines.length > 0) {
                        resolve(lines[0].split(' ')[0]);
                    } else {
                        resolve(undefined);
                    }
                }
            );
        });
    }

    private async commitAllChanges(context: CommandContext): Promise<void> {
        const { options } = context;

        if (options.skip?.commit) {
            this.logger.info('Skipping commit as requested');
            return;
        }

        const { packages } = options;
        const projectRoot = options.cwd || process.cwd();

        const allFiles = this.collectCommitFiles(packages, projectRoot, options);

        const commitMessage = this.buildCommitMessage(options, context.versions.next);

        this.logger.info(`Committing ${allFiles.size} files with message: ${chalk.green(commitMessage)}`);

        if (options.dryRun) {
            this.logger.info(`[dry-run] git commit -m "${commitMessage}"`);
            return;
        }

        const git = context.git;
        if (!git) {
            throw new Error('Git context is not available');
        }

        await git.add(Array.from(allFiles));
        await git.commit(commitMessage);
    }

    private collectCommitFiles(packages: any[], projectRoot: string, options: any): Set<string> {
        const files = new Set<string>();

        for (const pkg of packages) {
            const pkgPath = pkg.path.startsWith('/') ? pkg.path : `${projectRoot}/${pkg.path}`;

            const infilePath = this.resolveFilePath(pkg.infile || 'CHANGELOG.md', pkgPath);
            files.add(infilePath);

            const pkgBumpFiles = pkg.bumpFiles || options.bumpFiles || [];
            for (const file of pkgBumpFiles) {
                const filePath = typeof file === 'string'
                    ? this.resolveFilePath(file, pkgPath)
                    : this.resolveFilePath(file.filename, pkgPath);
                files.add(filePath);
            }
        }

        return files;
    }

    private resolveFilePath(file: string, basePath: string): string {
        return file.startsWith('/') ? file : `${basePath}/${file}`;
    }

    private buildCommitMessage(options: any, nextVersion: string): string {
        const format = options.releaseCommitMessageFormat || 'build: release {{currentTag}}';
        const tag = `${options.tagPrefix || 'v'}${nextVersion}`;
        return format.replace(/\{\{currentTag\}\}/g, tag);
    }
}
