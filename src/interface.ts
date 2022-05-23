/**
 * @license
 * Copyright Worktile Inc All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/worktile/pkg-manager/blob/master/LICENSE
 */
import { Config } from 'conventional-changelog-config-spec';
import { SimpleGit } from 'simple-git/promise';

export interface Skip {
    // git pull
    pull?: boolean;
    // bump version
    bump?: boolean;
    // generate changelog
    changelog?: boolean;
    // commit
    commit?: boolean;
    // create release branch
    branch?: boolean;
    // push
    push?: boolean;
    // create release tag
    tag?: boolean;
    // submit pull request
    pr?: boolean;
}

export type BumpFile = { filename: string; updater?: string; type?: 'json' | 'plain-text' | 'code' } | string;

export type Hooks = {
    /**
     * Called before the tagging step.
     */
    pretag?: string;

    /**
     * Called after the tagging step.
     */
    posttag?: string;
};
export interface CommandOptions extends Config {
    /**
     * Explicit version or ReleaseType patch, minor, major
     */
    releaseAs?: string;
    /**
     * See the commands that running standard-version would run.
     *
     * @default false
     */
    dryRun?: boolean;
    /**
     * Default or base branch, default is master, create release based on this branch
     *
     * @default master
     */
    defaultBranch?: string;
    /**
     * A whitelist of globs that match git branches where wpm release is enabled.
     *
     * @default [ 'master', 'develop' ]
     */
    allowBranch?: string | string[];
    /**
     * Release branch name format
     * @default release-v{{version}}
     */
    releaseBranchFormat?: string;
    /**
     * Package dir(folder), output folder of run build
     */
    packageDir?: string;
    /**
     * Map of steps in the release process that should be skipped.
     *
     * @default
     * {}
     */
    skip?: Skip;
    /**
     * Files should bump version
     * @default
     * [
     *   'package-lock.json',
     *   'npm-shrinkwrap.json'
     * ]
     */
    bumpFiles?: Array<BumpFile>;
    /**
     * Commit message guideline preset.
     *
     * @default
     * angular ( or require.resolve('conventional-changelog-angular'))
     */
    preset?: string;
    /**
     * Commit all staged changes, not just files affected by wpm.
     *
     * @default
     * false
     */
    commitAll?: boolean;
    /**
     * Provide hooks to execute for lifecycle events (prerelease, pretag, etc.,).
     *
     * @default
     * {}
     */
    hooks?: Hooks;
    /**
     * Read the CHANGELOG from this file.
     *
     * @default
     * 'CHANGELOG.md'
     */
    infile?: string | Buffer | URL | number;
    /**
     * Set a custom prefix for the git tag to be created.
     *
     * @default
     * 'v'
     */
    tagPrefix?: string;
    /**
     * Workspace root dir
     *
     * @default process.cwd
     */
    cwd?: string;
}

export interface CommandContext {
    options: CommandOptions;
    versions?: {
        current: string;
        next?: string;
    };
    git?: SimpleGit;
    // release branch name by releaseBranchFormat and version
    releaseBranch?: string;
    // release tag name
    releaseTag?: string;
    currentBranch?: string;
    targetBranch?: string;
}
