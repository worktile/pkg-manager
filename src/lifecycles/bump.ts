/**
 * @license
 * Copyright Worktile Inc All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/worktile/pkg-manager/blob/master/LICENSE
 */

import { Lifecycle } from './lifecycle';
import { CommandContext, Package } from '../interface';
import standardVersion from 'commit-and-tag-version';
import chalk from 'chalk';
import conventionalChangelog from 'conventional-changelog';
import * as fs from 'fs';
import { defaults } from '../defaults';
import { exec } from 'child_process';
import path from 'path';

export class BumpLifecycle extends Lifecycle {
    currentVersion!: string;

    nextVersion!: string;

    readonly defaultInfile = defaults.infile;

    packages: Package[] = [];

    async run(context: CommandContext): Promise<void> {
        await this.runLifecycleHook('prebump', context.options, this.getLifecycleHookParams(context));
        this.currentVersion = context.versions.current;
        this.nextVersion = context.versions.next;
        this.packages = context.options?.packages || [];

        if (this.packages.length > 0) {
            await this.bumpMultiPackage(context);
        } else {
            await this.bumpSinglePackage(context);
        }

        await this.runLifecycleHook('postbump', context.options, this.getLifecycleHookParams(context));
    }

    private async bumpSinglePackage(context: CommandContext): Promise<void> {
        this.logger.info(`using commit-and-tag-version to bumping, outputting changes and commit`);
        const options: standardVersion.Options = {
            ...context.options,
            releaseAs: this.nextVersion,
            skip: { ...context.options.skip, tag: true }
        } as standardVersion.Options;
        await standardVersion(options);
    }

    private async bumpMultiPackage(context: CommandContext): Promise<void> {
        this.logger.info('using commit-and-tag-version for monorepo');

        const { options: baseOptions } = context;
        const projectRoot = baseOptions.cwd || process.cwd();

        for (const pkg of this.packages) {
            this.logger.info(`Processing package: ${chalk.green(pkg.path)}`);
            const pkgPath = this.resolveFilePath(pkg.path, projectRoot);
            const bumpFiles = this.resolveBumpFiles(pkg, baseOptions, pkgPath);

            const options: standardVersion.Options = {
                ...baseOptions,
                releaseAs: this.nextVersion,
                cwd: projectRoot,
                bumpFiles,
                path: pkg.path,
                releaseCount: 1,
                outputUnreleased: false,
                skip: { ...baseOptions.skip, tag: true, commit: true, changelog: true }
            } as standardVersion.Options;

            await standardVersion(options);

            if (pkg.infile !== '') {
                await this.generateChangelog(this.resolveFilePath(pkg.infile, pkgPath), [pkg.path], projectRoot);
            }
        }

        if (baseOptions.infile !== '') {
            await this.generateChangelog(
                this.resolveFilePath(baseOptions.infile as string, projectRoot),
                this.packages.map((pkg) => pkg.path),
                projectRoot
            );
        }

        await this.commitChanges(context);
    }

    private resolveBumpFiles(pkg: Package, baseOptions: any, pkgPath: string): any[] | undefined {
        const bumpFiles = pkg.bumpFiles || baseOptions.bumpFiles;
        if (!bumpFiles) return undefined;

        return bumpFiles.map((file: any) => {
            if (typeof file === 'string') {
                return this.resolveFilePath(file, pkgPath);
            }
            return { ...file, filename: this.resolveFilePath(file.filename, pkgPath) };
        });
    }

    private async generateChangelog(infilePath: string, pkgPaths: string[], cwd?: string): Promise<void> {
        this.logger.info(`Generating changelog at ${infilePath}: ${this.currentVersion} -> ${this.nextVersion}`);
        const commitWithVersion = await this.findVersionCommit(this.currentVersion, pkgPaths, cwd);
        const generated = await this.buildChangelogContent(commitWithVersion, pkgPaths);

        if (!generated.trim()) {
            this.logger.warn(`No changelog content generated for ${pkgPaths.join(', ')}`);
            return;
        }

        fs.writeFileSync(infilePath, this.mergeChangelog(infilePath, generated));
    }

    private async buildChangelogContent(commitWithVersion: string | undefined, paths: string[]): Promise<string> {
        if (paths.length === 1) return this.getChangelogForPath(commitWithVersion, paths[0]);
        const contents = await Promise.all(paths.map((path) => this.getChangelogForPath(commitWithVersion, path)));
        return this.mergeChangelogContents(contents);
    }

    private async getChangelogForPath(commitWithVersion: string | undefined, path: string): Promise<string> {
        const gitOptions: any = {
            merges: null,
            showSignature: false,
            to: 'HEAD',
            path
        };

        if (commitWithVersion) {
            gitOptions.from = commitWithVersion;
        }
        const changelogStream = conventionalChangelog(
            { preset: 'angular', releaseCount: 1, outputUnreleased: true },
            { version: this.nextVersion },
            {
                ...gitOptions
                // from: '9e52c569bf3924d8c883459056edb9e9ccbcf61f'
            }
        );
        return this.streamToString(changelogStream);
    }

    private mergeChangelogContents(contents: string[]): string {
        const sections = new Map<string, Set<string>>();
        let versionHeader = '';

        for (const content of contents) {
            let currentSection = '';

            for (const line of content.split('\n')) {
                const trimmed = line.trimRight();
                if (!trimmed) continue;

                if (trimmed.startsWith('## ') && !versionHeader) {
                    versionHeader = trimmed;
                } else if (trimmed.startsWith('### ')) {
                    currentSection = trimmed;

                    if (!sections.has(currentSection)) {
                        sections.set(currentSection, new Set());
                    }
                } else if (currentSection) {
                    sections.get(currentSection)!.add(trimmed);
                }
            }
        }

        let result = versionHeader + '\n\n';
        for (const [section, items] of sections) {
            if (items.size) {
                result += `${section}\n\n${Array.from(items).join('\n')}\n\n`;
            }
        }
        return result.trim();
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

    private async findVersionCommit(version: string | undefined, pkgPaths: string[], cwd?: string): Promise<string | undefined> {
        if (!version) return undefined;
        const cmd = `git log --grep="${version}" --grep="release" --all-match --pretty=format:"%H" -- ${pkgPaths
            .map((p) => `"${p}"`)
            .join(' ')}`;
        return new Promise<string | undefined>((resolve) => {
            exec(cmd, { cwd: cwd || process.cwd() }, (error, stdout) => {
                if (error) return resolve(undefined);
                const lines = stdout.trim().split('\n');
                resolve(lines.length > 0 ? lines[0].split(' ')[0] : undefined);
            });
        });
    }

    private async commitChanges(context: CommandContext): Promise<void> {
        const { options, git } = context;
        if (options.skip?.commit) {
            this.logger.info('Skipping commit as requested');
            return;
        }

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
