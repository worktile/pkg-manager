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
import path from 'path';

export class BumpLifecycle extends Lifecycle {
    nextVersion!: string;

    packages: Package[] = [];

    async run(context: CommandContext): Promise<void> {
        await this.runLifecycleHook('prebump', context.options, this.getLifecycleHookParams(context));
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
        this.logger.info(`using commit-and-tag-version to bumping`);
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
        }
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

    private resolveFilePath(file: string, basePath: string): string {
        return path.isAbsolute(file) ? file : path.resolve(basePath, file);
    }
}