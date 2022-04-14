/**
 * @license
 * Copyright Worktile Inc All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/worktile/pkg-manager/blob/master/LICENSE
 */
import { CommandOptions } from './interface';

export const defaults: CommandOptions = {
    defaultBranch: 'master',
    allowBranch: ['master', 'develop'],
    releaseBranchFormat: 'release-v{{version}}',
    releaseCommitMessageFormat: "build: release {{currentTag}}",
    packageDir: 'built',
    dryRun: false,
    skip: {},
    bumpFiles: ['package.json', 'package-lock.json', 'npm-shrinkwrap.json', 'composer.lock'],
    preset: 'angular',
    issueUrlFormat: 'https//at.worktile.com/agile/items/{{id}}',
    commitAll: false,
    hooks: {},
    infile: 'CHANGELOG.md',
    tagPrefix: 'v',
    cwd: process.cwd()
};
